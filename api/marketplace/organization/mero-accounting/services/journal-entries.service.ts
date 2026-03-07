import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { JournalEntry, JournalEntryStatus, JournalEntryLine } from '@src/database/entities/journal_entries.entity';
import { Account } from '@src/database/entities/accounts.entity';
import { FiscalYear } from '@src/database/entities/banking_fiscal.entity';
import { AuditService } from './audit.service';
import { ExchangeRatesService } from './exchange-rates.service';

@Injectable()
export class JournalEntriesService {
    constructor(
        @InjectRepository(JournalEntry)
        private readonly journalEntryRepository: Repository<JournalEntry>,
        @InjectRepository(Account)
        private readonly accountRepository: Repository<Account>,
        @InjectRepository(FiscalYear)
        private readonly fiscalYearRepository: Repository<FiscalYear>,
        private readonly exchangeRatesService: ExchangeRatesService,
        private readonly auditService: AuditService,
        private readonly dataSource: DataSource,
    ) { }

    private async generateEntryNumber(organizationId: string, entityManager?: any): Promise<string> {
        const repo = entityManager ? entityManager.getRepository(JournalEntry) : this.journalEntryRepository;
        const lastEntry = await repo.findOne({
            where: { organizationId },
            order: { entryNumber: 'DESC' } // Sort by number to get the real last JE
        });

        if (!lastEntry) return 'JE-0001';

        const lastNumberMatch = lastEntry.entryNumber.match(/JE-(\d+)/);
        const lastNumber = lastNumberMatch ? parseInt(lastNumberMatch[1]) : 0;
        const nextNumber = lastNumber + 1;

        return `JE-${nextNumber.toString().padStart(4, '0')}`;
    }

    private async checkLockStatus(organizationId: string, date: Date) {
        const fiscalYear = await this.fiscalYearRepository.findOne({
            where: {
                organizationId,
                startDate: LessThanOrEqual(date),
                endDate: MoreThanOrEqual(date)
            }
        });

        if (fiscalYear?.isClosed) {
            throw new ForbiddenException(`Transaction date ${new Date(date).toLocaleDateString()} falls within a closed fiscal year (${fiscalYear.year}). Modification is not allowed.`);
        }
    }

    async findAll(organizationId: string) {
        return this.journalEntryRepository.find({
            where: { organizationId },
            order: { entryDate: 'DESC', createdAt: 'DESC' },
            relations: ['lines', 'lines.account']
        });
    }

    async findById(id: string, organizationId: string) {
        const entry = await this.journalEntryRepository.findOne({
            where: { id, organizationId },
            relations: ['lines', 'lines.account']
        });
        if (!entry) throw new NotFoundException('Journal entry not found');
        return entry;
    }

    async create(organizationId: string, userId: string, data: any) {
        await this.checkLockStatus(organizationId, new Date(data.entryDate));

        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            // 1. Validate
            if (!data.lines || data.lines.length < 2) {
                throw new BadRequestException('Journal entry must have at least 2 lines');
            }

            let totalDebit = 0;
            let totalCredit = 0;

            for (const line of data.lines) {
                if (!line.accountId) {
                    throw new BadRequestException('Account is required for all lines');
                }

                // Handle Multi-Currency
                const currency = line.currency && line.currency !== 'NPR' ? line.currency : 'NPR';
                line.currency = currency;

                if (currency !== 'NPR') {
                    // Fetch configured rate or use explicitly provided exchangeRate payload
                    const rate = line.exchangeRate || await this.exchangeRatesService.getRate(organizationId, 'NPR', currency, data.entryDate);
                    line.exchangeRate = rate;

                    // Store raw foreign payload
                    line.foreignDebit = line.debit ? Number(line.debit) : null;
                    line.foreignCredit = line.credit ? Number(line.credit) : null;

                    // Compute Base equivalent for standard ledger balancing
                    line.debit = line.foreignDebit ? Number((line.foreignDebit * rate).toFixed(2)) : 0;
                    line.credit = line.foreignCredit ? Number((line.foreignCredit * rate).toFixed(2)) : 0;
                } else {
                    line.exchangeRate = 1.0;
                }

                totalDebit += Number(line.debit || 0);
                totalCredit += Number(line.credit || 0);
            }

            if (Math.abs(totalDebit - totalCredit) > 0.01) {
                throw new BadRequestException('Total Debits must equal Total Credits in the Base Currency');
            }

            // 2. Generate Entry Number (transaction safe)
            const entryNumber = await this.generateEntryNumber(organizationId, queryRunner.manager);

            // 3. Create Header — only pick known safe fields from client data
            const { narration, entryDate, lines: lineData } = data;
            const entry = this.journalEntryRepository.create({
                narration,
                entryDate,
                lines: lineData,
                entryNumber,
                organizationId,
                createdBy: userId,
                status: JournalEntryStatus.DRAFT
            }) as JournalEntry;

            // Explicitly link lines to parent for TypeORM to handle NOT NULL journal_entry_id
            if (entry.lines) {
                entry.lines.forEach(line => {
                    line.journalEntry = entry;

                    // Allow dimensional tagging
                    const originalLineData = lineData.find((ld: any) => ld.accountId === line.accountId && ld.debit === line.debit && ld.credit === line.credit);
                    if (originalLineData) {
                        if (originalLineData.departmentId) line.departmentId = originalLineData.departmentId;
                        if (originalLineData.projectId) line.projectId = originalLineData.projectId;
                        if (originalLineData.costCenterId) line.costCenterId = originalLineData.costCenterId;
                    }
                });
            }

            const savedEntry = await queryRunner.manager.save(JournalEntry, entry);

            // Log the creation
            try {
                const totalAmount = savedEntry.lines?.reduce((sum, l) => sum + Number(l.debit || 0), 0) || 0;
                await this.auditService.log(
                    organizationId,
                    userId,
                    'CREATE_JOURNAL_ENTRY',
                    'JournalEntry',
                    savedEntry.id,
                    null,
                    {
                        message: `Created Journal Entry ${savedEntry.entryNumber} dated ${new Date(savedEntry.entryDate).toLocaleDateString()} - Amount: ${totalAmount.toFixed(2)}`,
                        entryNumber: savedEntry.entryNumber,
                        totalAmount: totalAmount,
                        narration: savedEntry.narration
                    }
                );
            } catch (auditErr) {
                console.error('Audit logging failed for CREATE_JOURNAL:', auditErr);
                // We don't want to fail the whole transaction if audit logging fails
            }

            if (data.status === JournalEntryStatus.POSTED) {
                await this.postEntryInternal(savedEntry.id, organizationId, userId, queryRunner.manager);
            }

            await queryRunner.commitTransaction();
            return savedEntry;
        } catch (err) {
            await queryRunner.rollbackTransaction();
            throw err;
        } finally {
            await queryRunner.release();
        }
    }

    async postEntry(id: string, organizationId: string, userId: string) {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            await this.postEntryInternal(id, organizationId, userId, queryRunner.manager);
            await queryRunner.commitTransaction();
        } catch (err) {
            await queryRunner.rollbackTransaction();
            throw err;
        } finally {
            await queryRunner.release();
        }
    }

    async markAsReviewed(id: string, organizationId: string, userId: string) {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            const entry = await queryRunner.manager.findOne(JournalEntry, {
                where: { id, organizationId }
            });

            if (!entry) throw new NotFoundException('Journal entry not found');

            if (entry.status !== JournalEntryStatus.DRAFT) {
                throw new BadRequestException('Only DRAFT entries can be marked as REVIEWED');
            }

            entry.status = JournalEntryStatus.REVIEWED;
            await queryRunner.manager.save(JournalEntry, entry);

            await this.auditService.log(
                organizationId,
                userId,
                'REVIEW_JOURNAL_ENTRY',
                'JournalEntry',
                entry.id,
                null,
                { message: `Marked Journal Entry ${entry.entryNumber} as REVIEWED` }
            );

            await queryRunner.commitTransaction();
            return entry;
        } catch (err) {
            await queryRunner.rollbackTransaction();
            throw err;
        } finally {
            await queryRunner.release();
        }
    }

    async approveEntry(id: string, organizationId: string, userId: string) {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            const entry = await queryRunner.manager.findOne(JournalEntry, {
                where: { id, organizationId }
            });

            if (!entry) throw new NotFoundException('Journal entry not found');

            if (entry.status !== JournalEntryStatus.REVIEWED) {
                throw new BadRequestException('Only REVIEWED entries can be APPROVED');
            }

            entry.status = JournalEntryStatus.APPROVED;
            await queryRunner.manager.save(JournalEntry, entry);

            await this.auditService.log(
                organizationId,
                userId,
                'APPROVE_JOURNAL_ENTRY',
                'JournalEntry',
                entry.id,
                null,
                { message: `Approved Journal Entry ${entry.entryNumber}` }
            );

            await queryRunner.commitTransaction();
            return entry;
        } catch (err) {
            await queryRunner.rollbackTransaction();
            throw err;
        } finally {
            await queryRunner.release();
        }
    }

    async delete(id: string, organizationId: string) {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            const entry = await queryRunner.manager.findOne(JournalEntry, {
                where: { id, organizationId },
                relations: ['lines']
            });

            if (!entry) throw new NotFoundException('Journal entry not found');

            // Allow deleting posted entries, but we must reverse their balances
            if (entry.status === JournalEntryStatus.POSTED) {
                await this.checkLockStatus(organizationId, entry.entryDate);

                // Reverse account balances
                for (const line of entry.lines) {
                    const account = await queryRunner.manager.findOne(Account, { where: { id: line.accountId } });
                    if (!account) continue;

                    // Reverse the logic from postEntryInternal
                    const isDebitNormal = ['ASSET', 'EXPENSE'].includes(account.accountType);
                    const amount = isDebitNormal
                        ? Number(line.debit) - Number(line.credit)
                        : Number(line.credit) - Number(line.debit);

                    account.balance = Number(account.balance) - amount; // subtract instead of add
                    await queryRunner.manager.save(Account, account);
                }
            }

            // Delete lines first to satisfy foreign key constraints
            if (entry.lines && entry.lines.length > 0) {
                await queryRunner.manager.delete(JournalEntryLine, { journalEntryId: entry.id });
            }

            await queryRunner.manager.delete(JournalEntry, { id: entry.id });

            // Log the deletion
            try {
                await this.auditService.log(
                    organizationId,
                    'SYSTEM_OR_USER', // We don't have userId injected in delete currently, but we can just use generic 
                    'DELETE_JOURNAL_ENTRY',
                    'JournalEntry',
                    entry.id,
                    null,
                    { message: `Deleted Journal Entry ${entry.entryNumber}` }
                );
            } catch (auditErr) { }

            await queryRunner.commitTransaction();
            return { message: 'Journal entry successfully deleted' };
        } catch (err) {
            await queryRunner.rollbackTransaction();
            throw err;
        } finally {
            await queryRunner.release();
        }
    }

    private async postEntryInternal(id: string, organizationId: string, userId: string, entityManager: any) {
        const entry = await entityManager.findOne(JournalEntry, {
            where: { id, organizationId },
            relations: ['lines']
        });

        if (!entry) throw new NotFoundException('Journal entry not found');

        await this.checkLockStatus(organizationId, entry.entryDate);

        if (entry.status !== JournalEntryStatus.APPROVED) {
            throw new BadRequestException('Only APPROVED entries can be posted');
        }

        // Update account balances
        for (const line of entry.lines) {
            const account = await entityManager.findOne(Account, { where: { id: line.accountId } });
            if (!account) throw new NotFoundException(`Account ${line.accountId} not found`);

            // Asset/Expense: Debit increases (+), Credit decreases (-)
            // Liability/Equity/Revenue: Credit increases (+), Debit decreases (-)
            const isDebitNormal = ['ASSET', 'EXPENSE'].includes(account.accountType);
            const amount = isDebitNormal
                ? Number(line.debit) - Number(line.credit)
                : Number(line.credit) - Number(line.debit);

            account.balance = Number(account.balance) + amount;
            await entityManager.save(account);
        }

        entry.status = JournalEntryStatus.POSTED;
        entry.postedBy = userId;
        entry.postedAt = new Date();
        await entityManager.save(entry);
    }
}
