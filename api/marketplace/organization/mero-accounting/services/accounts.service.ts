import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, DataSource } from 'typeorm';
import { Account, AccountType } from '@src/database/entities/accounts.entity';
import { JournalEntriesService } from './journal-entries.service';
import { JournalEntryStatus } from '@src/database/entities/journal_entries.entity';
import { Readable } from 'stream';
import csv from 'csv-parser';

@Injectable()
export class AccountsService {
    private readonly logger = new Logger(AccountsService.name);

    constructor(
        @InjectRepository(Account)
        private readonly accountRepository: Repository<Account>,
        private readonly dataSource: DataSource,
        private readonly journalEntriesService: JournalEntriesService,
    ) { }

    async findAll(organizationId: string) {
        const accounts = await this.accountRepository.find({
            where: [
                { organizationId },
                { organizationId: IsNull(), isSystem: true }
            ],
            order: { code: 'ASC' },
            relations: ['parent']
        });

        // Exclude bank/cash sub-ledger accounts auto-created by the Banking module (e.g. 1120-001, 1110-002).
        // These should only appear in the Banking & Cash section, not in the COA.
        return accounts.filter(acc => {
            const code = acc.code || '';
            const isBankSubAccount = /^1120-.+/.test(code) || /^1110-.+/.test(code);
            const isCashSubAccount = /^1111-.+/.test(code);
            return !isBankSubAccount && !isCashSubAccount;
        });
    }

    async findById(id: string, organizationId: string) {
        const account = await this.accountRepository.findOne({
            where: { id, organizationId },
        });
        if (!account) throw new NotFoundException('Account not found');
        return account;
    }

    async create(organizationId: string, data: any) {
        const existing = await this.accountRepository.findOne({
            where: [
                { organizationId, code: data.code },
                { organizationId: IsNull(), code: data.code }
            ]
        });
        if (existing) throw new BadRequestException('Account code already exists');

        const account = this.accountRepository.create({ ...data, organizationId, isSystem: false });
        return this.accountRepository.save(account);
    }

    async update(id: string, organizationId: string, data: any) {
        const account = await this.findById(id, organizationId);
        if (account.isSystem) throw new BadRequestException('System accounts cannot be modified');
        Object.assign(account, data);
        return this.accountRepository.save(account);
    }

    async delete(id: string, organizationId: string) {
        const account = await this.findById(id, organizationId);
        if (account.isSystem) throw new BadRequestException('System accounts cannot be deleted');

        const childrenCount = await this.accountRepository.count({ where: { parentId: id } });
        if (childrenCount > 0) throw new BadRequestException('Cannot delete account with sub-accounts');

        if (Number(account.balance) !== 0) throw new BadRequestException('Cannot delete account with non-zero balance');

        return this.accountRepository.remove(account);
    }

    async getLedger(accountId: string, organizationId: string) {
        // Accept org-owned accounts OR system accounts
        const account = await this.accountRepository.findOne({
            where: [
                { id: accountId, organizationId },
                { id: accountId, organizationId: IsNull(), isSystem: true },
            ],
        });
        if (!account) throw new NotFoundException('Account not found');

        const rows = await this.dataSource.query(`
            SELECT
                jel.id,
                je.entry_date        AS "entryDate",
                je.entry_number      AS "entryNumber",
                je.narration,
                je.reference_type    AS "referenceType",
                je.status,
                COALESCE(jel.description, je.narration) AS description,
                COALESCE(jel.debit,  0)  AS debit,
                COALESCE(jel.credit, 0)  AS credit
            FROM journal_entry_lines jel
            JOIN journal_entries je ON je.id = jel.journal_entry_id
            WHERE jel.account_id = $1
              AND je.organization_id = $2
              AND je.status = 'POSTED'
            ORDER BY je.entry_date ASC, je.entry_number ASC
        `, [accountId, organizationId]);

        // Compute running balance (DR increases, CR decreases)
        let runningBalance = 0;
        const ledgerRows = rows.map((row: any) => {
            runningBalance += Number(row.debit) - Number(row.credit);
            return {
                ...row,
                debit: Number(row.debit),
                credit: Number(row.credit),
                runningBalance,
            };
        });

        const totalDebit = ledgerRows.reduce((s: number, r: any) => s + r.debit, 0);
        const totalCredit = ledgerRows.reduce((s: number, r: any) => s + r.credit, 0);

        return {
            account: {
                id: account.id,
                code: (account as any).code,
                name: account.name,
                accountType: account.accountType,
            },
            rows: ledgerRows,
            totalDebit,
            totalCredit,
            closingBalance: runningBalance,
        };
    }

    async initializeDefaultAccounts(_organizationId: string) {
        // System accounts are shared via findAll (organization_id IS NULL + is_system = true)
    }

    async importCoa(organizationId: string, userId: string, fileBuffer: Buffer) {
        return new Promise(async (resolve, reject) => {
            const results: any[] = [];

            // 1. Parsing Phase
            Readable.from(fileBuffer)
                .pipe(csv())
                .on('data', (data) => results.push(data))
                .on('end', async () => {
                    const queryRunner = this.dataSource.createQueryRunner();
                    await queryRunner.connect();
                    await queryRunner.startTransaction();

                    try {
                        const accountTypeMap: Record<string, AccountType> = {
                            'ASSET': AccountType.ASSET,
                            'LIABILITY': AccountType.LIABILITY,
                            'EQUITY': AccountType.EQUITY,
                            'REVENUE': AccountType.REVENUE,
                            'EXPENSE': AccountType.EXPENSE
                        };

                        // Pass 1: Create or Update Accounts (without parent codes initially)
                        for (const row of results) {
                            const code = row['Code']?.trim();
                            if (!code) continue;

                            const accTypeStr = row['Account Type']?.trim()?.toUpperCase();
                            const type = accountTypeMap[accTypeStr] || AccountType.ASSET;

                            let existing = await queryRunner.manager.findOne(Account, {
                                where: [
                                    { organizationId, code },
                                    { organizationId: IsNull(), code }
                                ]
                            });

                            if (!existing) {
                                // Create new org-specific account
                                const newAcc = this.accountRepository.create({
                                    organizationId,
                                    code,
                                    name: row['Name']?.trim(),
                                    nameNepali: row['Name Nepali']?.trim(),
                                    accountType: type,
                                    category: row['Category']?.trim() || type,
                                    isSystem: false,
                                    isActive: true,
                                    balance: 0
                                });
                                await queryRunner.manager.save(Account, newAcc);
                            } else if (!existing.isSystem) {
                                // Update org-specific account
                                existing.name = row['Name']?.trim() || existing.name;
                                existing.nameNepali = row['Name Nepali']?.trim() || existing.nameNepali;
                                existing.category = row['Category']?.trim() || existing.category;
                                await queryRunner.manager.save(Account, existing);
                            }
                        }

                        // Pass 2: Link Parents
                        for (const row of results) {
                            const code = row['Code']?.trim();
                            const parentCode = row['Parent Code']?.trim();

                            if (code && parentCode) {
                                const acc = await queryRunner.manager.findOne(Account, {
                                    where: { organizationId, code }
                                });

                                if (acc && !acc.isSystem) {
                                    const parent = await queryRunner.manager.findOne(Account, {
                                        where: [
                                            { organizationId, code: parentCode },
                                            { organizationId: IsNull(), code: parentCode }
                                        ]
                                    });
                                    if (parent) {
                                        acc.parentId = parent.id;
                                        await queryRunner.manager.save(Account, acc);
                                    }
                                }
                            }
                        }

                        // Pass 3: Gather Opening Balances and Create Journal Entry
                        const lines: any[] = [];
                        let totalDebit = 0;
                        let totalCredit = 0;

                        for (const row of results) {
                            const code = row['Code']?.trim();
                            const openingBalance = parseFloat(row['Opening Balance'] || '0');

                            if (code && openingBalance !== 0 && !isNaN(openingBalance)) {
                                const acc = await queryRunner.manager.findOne(Account, {
                                    where: [
                                        { organizationId, code },
                                        { organizationId: IsNull(), code } // Support opening balance for system accounts as well
                                    ]
                                });

                                if (acc) {
                                    const isDebitNormal = ['ASSET', 'EXPENSE'].includes(acc.accountType);
                                    let debit = 0;
                                    let credit = 0;

                                    if (openingBalance > 0) {
                                        if (isDebitNormal) debit = openingBalance;
                                        else credit = openingBalance;
                                    } else {
                                        if (isDebitNormal) credit = Math.abs(openingBalance);
                                        else debit = Math.abs(openingBalance);
                                    }

                                    if (debit > 0 || credit > 0) {
                                        lines.push({ accountId: acc.id, debit, credit, description: 'Opening Balance' });
                                        totalDebit += debit;
                                        totalCredit += credit;
                                    }
                                }
                            }
                        }

                        // Create Opening Balance Entry
                        if (lines.length > 0) {
                            const difference = totalDebit - totalCredit;

                            // Find or create 'Opening Balance Equity' account
                            let obeAccount = await queryRunner.manager.findOne(Account, {
                                where: { organizationId, code: '3999' }
                            });

                            if (!obeAccount) {
                                obeAccount = this.accountRepository.create({
                                    organizationId,
                                    code: '3999',
                                    name: 'Opening Balance Equity',
                                    accountType: AccountType.EQUITY,
                                    category: 'Equity',
                                    isSystem: false,
                                    isActive: true,
                                    balance: 0
                                });
                                await queryRunner.manager.save(Account, obeAccount);
                            }

                            // Balance the entry against OBE account
                            if (Math.abs(difference) > 0.01) {
                                if (difference > 0) {
                                    lines.push({ accountId: obeAccount.id, debit: 0, credit: difference, description: 'Offsetting Opening Balance' });
                                } else {
                                    lines.push({ accountId: obeAccount.id, debit: Math.abs(difference), credit: 0, description: 'Offsetting Opening Balance' });
                                }
                            }

                            // Commit any transaction so far, because journalEntriesService.create also starts a transaction and requires no active transaction lock on sequence
                            await queryRunner.commitTransaction();

                            // Wait for the commit to complete
                            this.logger.log(`Imported COA. Creating Opening Balance Entry with ${lines.length} lines.`);

                            const jeData = {
                                narration: 'Opening Balance Entry via CSV Import',
                                entryDate: new Date(),
                                lines: lines,
                                status: JournalEntryStatus.DRAFT
                            };

                            const entry = await this.journalEntriesService.create(organizationId, userId, jeData);
                            // Auto-review and post it to finalize opening balances
                            await this.journalEntriesService.markAsReviewed(entry.id, organizationId, userId);
                            await this.journalEntriesService.approveEntry(entry.id, organizationId, userId);
                            await this.journalEntriesService.postEntry(entry.id, organizationId, userId);
                        } else {
                            await queryRunner.commitTransaction();
                        }

                        resolve({ success: true, message: 'COA and Opening Balances Imported Successfully.' });
                    } catch (err) {
                        await queryRunner.rollbackTransaction();
                        reject(err);
                    } finally {
                        await queryRunner.release();
                    }
                })
                .on('error', (error) => {
                    reject(error);
                });
        });
    }
}
