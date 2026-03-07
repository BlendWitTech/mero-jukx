import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, LessThanOrEqual } from 'typeorm';
import { FiscalYear } from '@src/database/entities/banking_fiscal.entity';
import { Account, AccountType } from '@src/database/entities/accounts.entity';
import { JournalEntryLine, JournalEntryStatus } from '@src/database/entities/journal_entries.entity';
import { JournalEntriesService } from './journal-entries.service';

@Injectable()
export class YearEndClosingService {
    private readonly logger = new Logger(YearEndClosingService.name);

    constructor(
        @InjectRepository(FiscalYear)
        private readonly fiscalYearRepository: Repository<FiscalYear>,
        @InjectRepository(Account)
        private readonly accountRepository: Repository<Account>,
        @InjectRepository(JournalEntryLine)
        private readonly journalEntryLineRepository: Repository<JournalEntryLine>,
        private readonly journalEntriesService: JournalEntriesService,
        private readonly dataSource: DataSource,
    ) { }

    async getFiscalYears(organizationId: string) {
        return this.fiscalYearRepository.find({
            where: { organizationId },
            order: { endDate: 'DESC' }
        });
    }

    async createFiscalYear(organizationId: string, data: { year: string, startDate: string, endDate: string }) {
        const fiscalYear = this.fiscalYearRepository.create({
            organizationId,
            year: data.year,
            startDate: new Date(data.startDate),
            endDate: new Date(data.endDate),
            isClosed: false
        });
        return this.fiscalYearRepository.save(fiscalYear);
    }

    async closeFiscalYear(organizationId: string, fiscalYearId: string, userId: string) {
        // 1. Validate Fiscal Year
        const fiscalYear = await this.fiscalYearRepository.findOne({
            where: { id: fiscalYearId, organizationId }
        });

        if (!fiscalYear) throw new NotFoundException('Fiscal Year not found');
        if (fiscalYear.isClosed) throw new BadRequestException('Fiscal Year is already closed');

        // 2. Find Retained Earnings Account (P&L Equity)
        // Usually Retained Earnings is 3200 or 3300. We will look for 3200 first, then 3300.
        let retainedEarningsAccount = await this.accountRepository.findOne({
            where: [
                { organizationId, code: '3200' },
                { organizationId, code: '3300' }
            ]
        });

        // Fallback to system accounts if not found in org
        if (!retainedEarningsAccount) {
            retainedEarningsAccount = await this.accountRepository.findOne({
                where: [
                    { isSystem: true, code: '3200' },
                    { isSystem: true, code: '3300' }
                ]
            });
        }

        if (!retainedEarningsAccount) {
            // Unlikely to happen with our seed, but as a safeguard we create one
            const newRe = this.accountRepository.create({
                organizationId,
                code: '3200',
                name: 'Retained Earnings',
                accountType: AccountType.EQUITY,
                category: 'Retained Earnings',
                isSystem: false,
                balance: 0
            });
            retainedEarningsAccount = await this.accountRepository.save(newRe);
        }

        // 3. Query all POSTED REVENUE and EXPENSE account balances up to the fiscal year end date
        // Note: For true closing we must also bound it by startDate, but standard practice is closing 
        // the cumulative P&L up to the end date. We'll bounds it strictly between start and end.

        const accountsQuery = this.accountRepository.createQueryBuilder('a')
            .where(
                '(a.organization_id = :orgId OR (a.organization_id IS NULL AND a.is_system = true))',
                { orgId: organizationId }
            )
            .andWhere('a.account_type IN (:...types)', { types: [AccountType.REVENUE, AccountType.EXPENSE] });

        const pnlAccounts = await accountsQuery.getMany();
        if (pnlAccounts.length === 0) {
            // Nothing to close, just mark as closed
            fiscalYear.isClosed = true;
            await this.fiscalYearRepository.save(fiscalYear);
            return { message: 'Fiscal Year closed successfully. No P&L activity found.' };
        }

        const accountIds = pnlAccounts.map(a => a.id);
        const rows = await this.journalEntryLineRepository.createQueryBuilder('jl')
            .select('jl.account_id', 'accountId')
            .addSelect('SUM(CAST(jl.debit AS numeric))', 'totalDebit')
            .addSelect('SUM(CAST(jl.credit AS numeric))', 'totalCredit')
            .innerJoin('jl.journalEntry', 'je')
            .where('je.organization_id = :orgId', { orgId: organizationId })
            .andWhere('je.status = :status', { status: JournalEntryStatus.POSTED })
            .andWhere('je.entry_date >= :startDate AND je.entry_date <= :endDate', {
                startDate: fiscalYear.startDate,
                endDate: fiscalYear.endDate
            })
            .andWhere('jl.account_id IN (:...ids)', { ids: accountIds })
            .groupBy('jl.account_id')
            .getRawMany();

        const balances: Record<string, { debit: number; credit: number }> = {};
        for (const row of rows) {
            balances[row.accountId] = {
                debit: parseFloat(row.totalDebit) || 0,
                credit: parseFloat(row.totalCredit) || 0,
            };
        }

        // 4. Generate Journal Entry Lines to zero out P&L accounts
        const lines: any[] = [];
        let totalNetClosingDebit = 0;
        let totalNetClosingCredit = 0;

        for (const acc of pnlAccounts) {
            const lb = balances[acc.id];
            if (!lb) continue;

            // Current net balance of the account
            const netBalance = lb.debit - lb.credit;

            if (netBalance === 0) continue;

            if (acc.accountType === AccountType.EXPENSE) {
                // Expected Debit Balance > 0
                // To close an expense, we must Credit it
                if (netBalance > 0) {
                    lines.push({ accountId: acc.id, debit: 0, credit: netBalance, description: `Closing Entry for ${fiscalYear.year}` });
                    totalNetClosingCredit += netBalance;
                } else if (netBalance < 0) {
                    // Anomalous credit balance in an expense
                    const absBal = Math.abs(netBalance);
                    lines.push({ accountId: acc.id, debit: absBal, credit: 0, description: `Closing Entry for ${fiscalYear.year}` });
                    totalNetClosingDebit += absBal;
                }
            } else if (acc.accountType === AccountType.REVENUE) {
                // Expected Credit Balance (netBalance < 0)
                // To close revenue, we must Debit it
                if (netBalance < 0) {
                    const absBal = Math.abs(netBalance);
                    lines.push({ accountId: acc.id, debit: absBal, credit: 0, description: `Closing Entry for ${fiscalYear.year}` });
                    totalNetClosingDebit += absBal;
                } else if (netBalance > 0) {
                    // Anomalous debit balance in revenue
                    lines.push({ accountId: acc.id, debit: 0, credit: netBalance, description: `Closing Entry for ${fiscalYear.year}` });
                    totalNetClosingCredit += netBalance;
                }
            }
        }

        if (lines.length === 0) {
            // No non-zero accounts
            fiscalYear.isClosed = true;
            await this.fiscalYearRepository.save(fiscalYear);
            return { message: 'Fiscal Year closed successfully. All P&L accounts were already zero.' };
        }

        // 5. Offset to Retained Earnings
        const difference = totalNetClosingDebit - totalNetClosingCredit;

        // If difference > 0, it means we Debited more than Credited (Revenue > Expenses, so Net Profit).
        // To balance the entry, we must Credit Retained Earnings.
        // If difference < 0, it means we Credited more than Debited (Expenses > Revenue, so Net Loss).
        // To balance the entry, we must Debit Retained Earnings.

        if (Math.abs(difference) > 0.01) {
            if (difference > 0) {
                lines.push({ accountId: retainedEarningsAccount.id, debit: 0, credit: difference, description: `Net Profit Transfer for ${fiscalYear.year}` });
            } else {
                lines.push({ accountId: retainedEarningsAccount.id, debit: Math.abs(difference), credit: 0, description: `Net Loss Transfer for ${fiscalYear.year}` });
            }
        }

        // 6. Post the Closing Journal Entry
        // This acts as a normal "create" and "post" flow. BUT, since it falls on `endDate`, 
        // we must be careful not to trigger checking `isClosed` against a truthy value yet.
        // That's why we create and post BEFORE marking fiscalYear.isClosed = true.
        const closingData = {
            narration: `Year-End Closing Entry for ${fiscalYear.year}`,
            entryDate: fiscalYear.endDate,
            lines: lines,
            status: JournalEntryStatus.DRAFT
        };

        const entry = await this.journalEntriesService.create(organizationId, userId, closingData);
        await this.journalEntriesService.markAsReviewed(entry.id, organizationId, userId);
        await this.journalEntriesService.approveEntry(entry.id, organizationId, userId);
        await this.journalEntriesService.postEntry(entry.id, organizationId, userId);

        // 7. Mark Fiscal Year as closed
        fiscalYear.isClosed = true;
        await this.fiscalYearRepository.save(fiscalYear);

        return { message: `Fiscal Year ${fiscalYear.year} closed successfully with Journal Entry ${entry.entryNumber}` };
    }
}
