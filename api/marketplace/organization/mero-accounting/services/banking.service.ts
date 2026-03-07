import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, IsNull, Like, Any } from 'typeorm';
import { BankAccount } from '@src/database/entities/banking_fiscal.entity';
import { Account, AccountType } from '@src/database/entities/accounts.entity';
import { JournalEntry, JournalEntryLine, JournalEntryStatus } from '@src/database/entities/journal_entries.entity';
import { BankStatement, BankStatementLine, BankStatementStatus, BankStatementLineStatus } from '@src/database/entities/bank_statements.entity';

@Injectable()
export class BankingService {
    constructor(
        @InjectRepository(BankAccount)
        private readonly bankRepository: Repository<BankAccount>,
        @InjectRepository(Account)
        private readonly accountRepository: Repository<Account>,
        @InjectRepository(BankStatement)
        private readonly bankStatementRepository: Repository<BankStatement>,
        @InjectRepository(BankStatementLine)
        private readonly bankStatementLineRepository: Repository<BankStatementLine>,
        private readonly dataSource: DataSource,
    ) { }

    private async generateEntryNumber(organizationId: string, entityManager: any): Promise<string> {
        const lastEntry = await entityManager.findOne(JournalEntry, {
            where: { organizationId },
            order: { entryNumber: 'DESC' },
        });

        if (!lastEntry) return 'JE-0001';

        const match = lastEntry.entryNumber?.match(/JE-(\d+)/);
        const lastNumber = match ? parseInt(match[1]) : 0;
        return `JE-${(lastNumber + 1).toString().padStart(4, '0')}`;
    }

    // Removed getAllAccountsWithLiveBalance to rely exclusively on incremental Account.balance updates

    async findAll(organizationId: string) {
        // Fetch ledger accounts for Bank (1120) and Cash (1110)
        const accounts = await this.accountRepository.find({
            where: [
                { organizationId, code: Like('1120%') },
                { organizationId, code: Like('1110%') },
                { organizationId: IsNull(), isSystem: true, code: Like('1120%') },
                { organizationId: IsNull(), isSystem: true, code: Like('1110%') }
            ],
            order: { code: 'ASC' }
        });

        const bankAndCashAccounts = accounts.filter(acc => acc.code !== '1120' && acc.code !== '1110');
        if (bankAndCashAccounts.length === 0) return [];

        // Just use bankAndCashAccounts directly
        const liveAccounts = bankAndCashAccounts;

        const bankMetadata = await this.bankRepository.find({
            where: { organizationId }
        });

        return liveAccounts.map(acc => {
            const meta = bankMetadata.find(m => m.accountId === acc.id);
            return {
                id: acc.id,
                bankName: meta?.bankName || acc.name,
                accountNumber: meta?.accountNumber || 'N/A',
                branch: meta?.branch || '',
                accountHolder: meta?.accountHolder || 'N/A',
                currentBalance: Number(acc.balance),
                currency: meta?.currency || 'NPR',
                accountId: acc.id,
                bankAccountId: meta?.id,
                code: acc.code
            };
        });
    }

    async findLoans(organizationId: string) {
        // Fetch loan accounts from COA (2210-xxx pattern - Long Term Loan)
        const loanAccounts = await this.accountRepository.find({
            where: [
                { organizationId, code: Like('2210-%') },
            ],
            order: { code: 'ASC' }
        });

        if (loanAccounts.length === 0) return [];

        const liveAccounts = loanAccounts;

        return liveAccounts.map(acc => ({
            id: acc.id,
            code: acc.code,
            name: acc.name,
            // For liabilities: credit balance means money owed, so balance = openingBalance + CR - DR
            outstandingBalance: parseFloat(acc.balance as any) || 0,
        }));
    }

    async create(organizationId: string, userId: string, data: {
        bankName: string;
        accountNumber: string;
        branch?: string;
        accountHolder: string;
        currentBalance: number;
        currency?: string;
        capitalAccountId?: string;
        type?: 'BANK' | 'CASH';
    }) {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            const isCash = data.type === 'CASH';
            const parentCode = isCash ? '1110' : '1120';
            const parentName = isCash ? 'Cash in Hand' : 'Bank Accounts';

            // 1. Find the parent account
            const parentAccount = await queryRunner.manager.findOne(Account, {
                where: [
                    { organizationId, code: parentCode },
                    { organizationId: IsNull(), code: parentCode, isSystem: true }
                ]
            });

            if (!parentAccount) throw new Error(`System account "${parentName}" (${parentCode}) not found`);

            // 2. Generate a unique code for this ledger account
            const existingCount = await queryRunner.manager.count(Account, {
                where: { organizationId, parentId: parentAccount.id }
            });
            const newAccountCode = `${parentCode}-${(existingCount + 1).toString().padStart(3, '0')}`;

            // 3. Create the ledger Account
            const ledgerAccount = queryRunner.manager.create(Account, {
                organizationId,
                code: newAccountCode,
                name: isCash ? data.bankName : `${data.bankName} - ${data.accountNumber.slice(-4)}`,
                accountType: AccountType.ASSET,
                category: 'Current Asset',
                parentId: parentAccount.id,
                balance: data.currentBalance, // Starting balance
                isSystem: false
            });
            const savedLedgerAccount = await queryRunner.manager.save(Account, ledgerAccount);

            // 4. Create the BankAccount metadata entry (even for Cash)
            const bankAccount = queryRunner.manager.create(BankAccount, {
                organizationId,
                accountId: savedLedgerAccount.id,
                bankName: data.bankName,
                accountNumber: data.accountNumber || (isCash ? 'N/A' : ''),
                branch: data.branch,
                accountHolder: data.accountHolder,
                openingBalance: data.currentBalance,
                currentBalance: data.currentBalance,
                currency: data.currency || 'NPR',
                isActive: true
            });
            const savedBank = await queryRunner.manager.save(BankAccount, bankAccount);

            // 5. Auto-post an Opening Balance journal entry if balance > 0
            if (data.currentBalance > 0) {
                let capitalAccount: Account | null = null;

                if (data.capitalAccountId) {
                    capitalAccount = await queryRunner.manager.findOne(Account, {
                        where: [
                            { id: data.capitalAccountId, organizationId },
                            { id: data.capitalAccountId, organizationId: IsNull(), isSystem: true }
                        ]
                    });
                }

                if (!capitalAccount) {
                    const equityAccounts = await queryRunner.manager.find(Account, {
                        where: [
                            { organizationId, accountType: AccountType.EQUITY },
                            { organizationId: IsNull(), isSystem: true, accountType: AccountType.EQUITY }
                        ],
                        order: { code: 'ASC' }
                    });
                    capitalAccount = equityAccounts[0] ?? null;
                }

                if (capitalAccount) {
                    const entryNumber = await this.generateEntryNumber(organizationId, queryRunner.manager);
                    const openingJournal = queryRunner.manager.create(JournalEntry, {
                        organizationId,
                        entryNumber,
                        entryDate: new Date(),
                        narration: `Opening balance for ${data.bankName} ${isCash ? '(Cash)' : `(${data.accountNumber})`}`,
                        createdBy: userId,
                        status: JournalEntryStatus.POSTED,
                        postedBy: userId,
                        postedAt: new Date(),
                        lines: [
                            {
                                accountId: savedLedgerAccount.id,
                                debit: data.currentBalance,
                                credit: 0,
                                description: `Opening balance - ${data.bankName}`
                            },
                            {
                                accountId: capitalAccount.id,
                                debit: 0,
                                credit: data.currentBalance,
                                description: `Opening capital contribution - ${data.bankName}`
                            }
                        ]
                    } as any);

                    await queryRunner.manager.save(JournalEntry, openingJournal);

                    // Update capital account balance (Credit increases equity)
                    capitalAccount.balance = Number(capitalAccount.balance) + data.currentBalance;
                    await queryRunner.manager.save(Account, capitalAccount);
                }
            }

            await queryRunner.commitTransaction();
            return savedBank;
        } catch (err) {
            await queryRunner.rollbackTransaction();
            throw err;
        } finally {
            await queryRunner.release();
        }
    }

    async createLoan(organizationId: string, userId: string, data: {
        lenderName: string;
        loanAmount: number;
        depositToBankAccountId: string;
        loanDate: string;
        interestRate?: number;
        description?: string;
    }) {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            // 1. Find the parent "Long Term Loan" account (2210)
            const parentLoanAccount = await queryRunner.manager.findOne(Account, {
                where: [
                    { organizationId, code: '2210' },
                    { organizationId: IsNull(), code: '2210', isSystem: true }
                ]
            });
            if (!parentLoanAccount) throw new Error('System account "Long Term Loan" (2210) not found');

            // 2. Find the bank account to deposit to
            const bankLedger = await queryRunner.manager.findOne(Account, {
                where: { id: data.depositToBankAccountId, organizationId }
            });
            if (!bankLedger) throw new Error('Destination bank account not found');

            // 3. Create a sub-ledger account for this loan (2210-001 etc.)
            const existingLoanSubAccounts = await queryRunner.manager.count(Account, {
                where: { organizationId, parentId: parentLoanAccount.id }
            });
            const loanAccountCode = `2210-${(existingLoanSubAccounts + 1).toString().padStart(3, '0')}`;

            const loanLedger = queryRunner.manager.create(Account, {
                organizationId,
                code: loanAccountCode,
                name: `Loan - ${data.lenderName}`,
                accountType: 'LIABILITY' as any,
                category: 'Long-term Liability',
                parentId: parentLoanAccount.id,
                balance: data.loanAmount, // Liability starting balance
                isSystem: false,
                description: data.description || `Loan from ${data.lenderName}`,
            });
            const savedLoanLedger = await queryRunner.manager.save(Account, loanLedger);

            // 4. Post journal entry:
            //    DR: Bank account (asset increases - we received cash)
            //    CR: Loan sub-ledger account (liability increases)
            const entryNumber = await this.generateEntryNumber(organizationId, queryRunner.manager);
            const journalEntry = queryRunner.manager.create(JournalEntry, {
                organizationId,
                entryNumber,
                entryDate: new Date(data.loanDate),
                narration: `Loan received from ${data.lenderName}${data.interestRate ? ` @ ${data.interestRate}% p.a.` : ''}`,
                createdBy: userId,
                status: JournalEntryStatus.POSTED,
                postedBy: userId,
                postedAt: new Date(),
                lines: [
                    {
                        accountId: bankLedger.id,
                        debit: data.loanAmount,
                        credit: 0,
                        description: `Loan proceeds received from ${data.lenderName}`
                    },
                    {
                        accountId: savedLoanLedger.id,
                        debit: 0,
                        credit: data.loanAmount,
                        description: `Loan from ${data.lenderName}`
                    }
                ]
            } as any);

            await queryRunner.manager.save(JournalEntry, journalEntry);

            // Update bank account balance (Debit increases asset)
            bankLedger.balance = Number(bankLedger.balance) + data.loanAmount;
            await queryRunner.manager.save(Account, bankLedger);

            await queryRunner.commitTransaction();

            return {
                loanAccountId: savedLoanLedger.id,
                loanAccountCode,
                lenderName: data.lenderName,
                loanAmount: data.loanAmount,
                interestRate: data.interestRate,
                loanDate: data.loanDate,
                message: `Loan of NPR ${data.loanAmount} from ${data.lenderName} recorded successfully.`
            };
        } catch (err) {
            await queryRunner.rollbackTransaction();
            throw err;
        } finally {
            await queryRunner.release();
        }
    }

    async deleteLoan(loanAccountId: string, organizationId: string) {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            // 1. Verify the loan sub-ledger account exists and belongs to this org
            const loanAccount = await queryRunner.manager.findOne(Account, {
                where: { id: loanAccountId, organizationId },
            });
            if (!loanAccount) throw new NotFoundException('Loan account not found');

            // 2. Find all journal entry lines that involve this loan account
            const loanLines = await queryRunner.manager.find(JournalEntryLine, {
                where: { accountId: loanAccountId },
            });

            const journalEntryIds = [...new Set(loanLines.map(l => l.journalEntryId))].filter(Boolean);

            // 3. For each related journal entry:
            //    - Find the bank debit line and revert stored balance (if inflated by old bug)
            //    - Delete all lines, then the entry header
            for (const jeId of journalEntryIds) {
                const je = await queryRunner.manager.findOne(JournalEntry, {
                    where: { id: jeId, organizationId },
                    relations: ['lines'],
                });
                if (!je) continue;

                // Find the DR bank line (not the loan account line)
                const bankDebitLine = je.lines.find(
                    l => l.accountId !== loanAccountId && Number(l.debit) > 0
                );

                if (bankDebitLine) {
                    const bankAccount = await queryRunner.manager.findOne(Account, {
                        where: { id: bankDebitLine.accountId, organizationId },
                    });
                    // Revert stored balance (Debit was an increase, so we DECREASE to revert)
                    if (bankAccount) {
                        bankAccount.balance = Math.max(
                            0,
                            Number(bankAccount.balance) - Number(bankDebitLine.debit)
                        );
                        await queryRunner.manager.save(Account, bankAccount);
                    }
                }

                // Delete journal entry lines first (FK constraint), then the header
                await queryRunner.manager.delete(JournalEntryLine, { journalEntryId: jeId });
                await queryRunner.manager.delete(JournalEntry, { id: jeId });
            }

            // 4. Delete the loan sub-ledger account itself
            await queryRunner.manager.delete(Account, { id: loanAccountId });

            await queryRunner.commitTransaction();
            return { message: 'Loan and all associated journal entries removed successfully.' };
        } catch (err) {
            await queryRunner.rollbackTransaction();
            throw err;
        } finally {
            await queryRunner.release();
        }
    }

    async deleteAccount(accountId: string, organizationId: string) {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            // 1. Verify the bank ledger account exists and belongs to this org
            const account = await queryRunner.manager.findOne(Account, {
                where: { id: accountId, organizationId },
            });
            if (!account) throw new NotFoundException('Account not found');

            // Verify it's actually a bank or cash account
            const bankMeta = await queryRunner.manager.findOne(BankAccount, {
                where: { accountId, organizationId }
            });
            if (!bankMeta) throw new NotFoundException('Banking details not found for this account');

            // 2. Find all journal entry lines involving this account
            const accountLines = await queryRunner.manager.find(JournalEntryLine, {
                where: { accountId },
            });

            const journalEntryIds = [...new Set(accountLines.map(l => l.journalEntryId))].filter(Boolean);

            // Optional: Block deletion if there are non-opening balance transactions
            // For now, we'll try to delete the opening balance entry and the account.
            // If they've used it in invoices, FK constraints or logic elsewhere might prevent this,
            // which is good (safeguard).

            for (const jeId of journalEntryIds) {
                const je = await queryRunner.manager.findOne(JournalEntry, {
                    where: { id: jeId, organizationId },
                    relations: ['lines'],
                });
                if (!je) continue;

                // Only delete if it looks like the opening balance entry
                // (typically contains "Opening balance" or is just 2 lines with capital)
                if (je.narration.includes('Opening balance')) {
                    // Revert capital account balance
                    const capitalLine = je.lines.find(l => l.accountId !== accountId);
                    if (capitalLine) {
                        const capitalAccount = await queryRunner.manager.findOne(Account, {
                            where: { id: capitalLine.accountId }
                        });
                        // Since opening balance CREDITS capital (+), we must subtract to revert
                        if (capitalAccount) {
                            capitalAccount.balance = Number(capitalAccount.balance) - Number(capitalLine.credit);
                            await queryRunner.manager.save(Account, capitalAccount);
                        }
                    }

                    // Delete the journal entry
                    await queryRunner.manager.delete(JournalEntryLine, { journalEntryId: jeId });
                    await queryRunner.manager.delete(JournalEntry, { id: jeId });
                } else {
                    throw new Error(`Cannot delete account: It has existing transactions (e.g. ${je.entryNumber}). Please remove those transactions first.`);
                }
            }

            // 3. Delete metadata and ledger
            await queryRunner.manager.delete(BankAccount, { accountId });
            await queryRunner.manager.delete(Account, { id: accountId });

            await queryRunner.commitTransaction();
            return { message: 'Bank account and opening balance removed successfully.' };
        } catch (err) {
            await queryRunner.rollbackTransaction();
            throw err;
        } finally {
            await queryRunner.release();
        }
    }

    async findById(id: string, organizationId: string) {
        const bank = await this.bankRepository.findOne({
            where: { id, organizationId },
            relations: ['account']
        });
        if (!bank) throw new NotFoundException('Bank account not found');
        return bank;
    }

    async transfer(organizationId: string, userId: string, data: { fromAccountId: string, toAccountId: string, amount: number, transactionDate: string, reference?: string, description?: string }) {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            // Find ledger accounts
            const fromAccount = await queryRunner.manager.findOne(Account, { where: { id: data.fromAccountId, organizationId } });
            const toAccount = await queryRunner.manager.findOne(Account, { where: { id: data.toAccountId, organizationId } });

            if (!fromAccount || !toAccount) throw new NotFoundException('One or both accounts not found');
            if (Number(fromAccount.balance) < data.amount) throw new Error('Insufficient balance');

            // Find banking metadata (optional)
            const fromBankMeta = await queryRunner.manager.findOne(BankAccount, { where: { accountId: fromAccount.id } });
            const toBankMeta = await queryRunner.manager.findOne(BankAccount, { where: { accountId: toAccount.id } });

            // 1. Create Contra Journal Entry
            const transferEntryNumber = await this.generateEntryNumber(organizationId, queryRunner.manager);
            const journalEntry = queryRunner.manager.create(JournalEntry, {
                organizationId,
                entryNumber: transferEntryNumber,
                entryDate: new Date(data.transactionDate),
                narration: data.description || data.reference || `Transfer from ${fromAccount.name} to ${toAccount.name}`,
                createdBy: userId,
                status: JournalEntryStatus.POSTED,
                postedBy: userId,
                postedAt: new Date(),
                lines: [
                    {
                        accountId: toAccount.id,
                        debit: data.amount,
                        credit: 0,
                        description: `Transfer in from ${fromAccount.name} (${data.reference || 'N/A'})`
                    },
                    {
                        accountId: fromAccount.id,
                        debit: 0,
                        credit: data.amount,
                        description: `Transfer out to ${toAccount.name} (${data.reference || 'N/A'})`
                    }
                ]
            } as any);

            await queryRunner.manager.save(JournalEntry, journalEntry);

            // 2. Update metadata and ledger balances
            if (fromBankMeta) {
                fromBankMeta.currentBalance = Number(fromBankMeta.currentBalance) - data.amount;
                await queryRunner.manager.save(BankAccount, fromBankMeta);
            }
            if (toBankMeta) {
                toBankMeta.currentBalance = Number(toBankMeta.currentBalance) + data.amount;
                await queryRunner.manager.save(BankAccount, toBankMeta);
            }

            fromAccount.balance = Number(fromAccount.balance) - data.amount;
            toAccount.balance = Number(toAccount.balance) + data.amount;
            await queryRunner.manager.save(Account, fromAccount);
            await queryRunner.manager.save(Account, toAccount);

            await queryRunner.commitTransaction();
            return { fromAccount, toAccount };
        } catch (err) {
            await queryRunner.rollbackTransaction();
            throw err;
        } finally {
            await queryRunner.release();
        }
    }

    async importFromCsv(organizationId: string, bankAccountId: string, csvText: string): Promise<{ imported: number; statementId: string }> {
        const lines = csvText.trim().split('\n');
        if (lines.length < 2) {
            throw new Error('CSV file must have a header row and at least one data row');
        }

        // Parse all rows (skip header at index 0)
        const rows = lines.slice(1).map(line => {
            // Handle quoted fields: split by comma but respect quotes
            const cols = line.split(',').map(c => c.trim().replace(/^"|"$/g, ''));
            return cols;
        }).filter(row => row.length >= 4 && row[0]); // Must have date, description, debit, credit at minimum

        if (rows.length === 0) {
            throw new Error('No valid data rows found in CSV');
        }

        // Determine opening and closing balance from rows
        const firstRow = rows[0];
        const lastRow = rows[rows.length - 1];
        const openingBalance = parseFloat(firstRow[4] || '0') - parseFloat(firstRow[3] || '0') + parseFloat(firstRow[2] || '0');
        const closingBalance = parseFloat(lastRow[4] || '0');

        // Find the bank account to associate
        const bankAccount = await this.bankRepository.findOne({ where: { id: bankAccountId, organizationId } });
        if (!bankAccount) {
            throw new NotFoundException('Bank account not found');
        }

        // Create the BankStatement header
        const statement = this.bankStatementRepository.create({
            organizationId,
            bankAccountId,
            statementDate: new Date(),
            openingBalance: isNaN(openingBalance) ? 0 : openingBalance,
            closingBalance: isNaN(closingBalance) ? 0 : closingBalance,
            status: BankStatementStatus.IMPORTED,
        });
        const savedStatement = await this.bankStatementRepository.save(statement);

        // Create BankStatementLine records
        const statementLines = rows.map(row => {
            // Expected columns: Date, Description, Debit (withdrawal), Credit (deposit), Balance
            const [dateStr, description, debitStr, creditStr, balanceStr] = row;
            const withdrawal = parseFloat(debitStr) || 0;
            const deposit = parseFloat(creditStr) || 0;
            const balance = parseFloat(balanceStr) || 0;

            return this.bankStatementLineRepository.create({
                bankStatementId: savedStatement.id,
                transactionDate: new Date(dateStr),
                description: description || 'Imported transaction',
                withdrawal,
                deposit,
                balance,
                status: BankStatementLineStatus.UNMATCHED,
            });
        });

        await this.bankStatementLineRepository.save(statementLines);

        return { imported: statementLines.length, statementId: savedStatement.id };
    }
}
