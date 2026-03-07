import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { CostCenter, CostCenterType } from '@src/database/entities/cost_centers.entity';
import { JournalEntryLine, JournalEntryStatus } from '@src/database/entities/journal_entries.entity';
import { FiscalYear } from '@src/database/entities/banking_fiscal.entity';

@Injectable()
export class CostCentersService {
    constructor(
        @InjectRepository(CostCenter)
        private readonly costCenterRepository: Repository<CostCenter>,
        @InjectRepository(JournalEntryLine)
        private readonly journalEntryLineRepository: Repository<JournalEntryLine>,
        @InjectRepository(FiscalYear)
        private readonly fiscalYearRepository: Repository<FiscalYear>,
        private readonly dataSource: DataSource,
    ) { }

    async findAll(organizationId: string) {
        return this.costCenterRepository.find({
            where: { organizationId },
            relations: ['manager'],
            order: { name: 'ASC' }
        });
    }

    async findById(id: string, organizationId: string) {
        const costCenter = await this.costCenterRepository.findOne({
            where: { id, organizationId },
            relations: ['manager']
        });
        if (!costCenter) throw new NotFoundException('Cost Center not found');
        return costCenter;
    }

    async createCostCenter(organizationId: string, data: any) {
        const costCenter = this.costCenterRepository.create({
            organizationId,
            name: data.name,
            code: data.code,
            type: data.type || CostCenterType.COST_CENTER,
            managerId: data.managerId || null,
        });

        return this.costCenterRepository.save(costCenter);
    }

    async getProfitability(id: string, organizationId: string, fiscalYearId: string) {
        const costCenter = await this.findById(id, organizationId);

        const fiscalYear = await this.fiscalYearRepository.findOne({
            where: { id: fiscalYearId, organizationId }
        });

        if (!fiscalYear) throw new NotFoundException('Fiscal year not found');

        // We fetch all posted lines for this cost center within the fiscal year
        // We will sum Debits (Expenses/Assets) and Credits (Revenues/Liabilities)
        // Profitability relies on Revenue (Credit) - Expense (Debit) for INCOME/EXPENSE accounts.

        // Get Income Lines
        const incomeQuery = this.journalEntryLineRepository.createQueryBuilder('jel')
            .innerJoin('jel.journalEntry', 'je')
            .innerJoin('jel.account', 'acc')
            .where('je.organizationId = :organizationId', { organizationId })
            .andWhere('je.status = :status', { status: JournalEntryStatus.POSTED })
            .andWhere('je.entryDate >= :startDate AND je.entryDate <= :endDate', {
                startDate: fiscalYear.startDate,
                endDate: fiscalYear.endDate
            })
            .andWhere('jel.costCenterId = :costCenterId', { costCenterId: costCenter.id })
            .andWhere('acc.accountType = :accountType', { accountType: 'INCOME' });

        const incomeSums = await incomeQuery.select('SUM(jel.credit)', 'totalCredit')
            .addSelect('SUM(jel.debit)', 'totalDebit')
            .getRawOne();

        // Income = Credit - Debit
        const totalIncome = (Number(incomeSums.totalCredit) || 0) - (Number(incomeSums.totalDebit) || 0);

        // Get Expense Lines
        const expenseQuery = this.journalEntryLineRepository.createQueryBuilder('jel')
            .innerJoin('jel.journalEntry', 'je')
            .innerJoin('jel.account', 'acc')
            .where('je.organizationId = :organizationId', { organizationId })
            .andWhere('je.status = :status', { status: JournalEntryStatus.POSTED })
            .andWhere('je.entryDate >= :startDate AND je.entryDate <= :endDate', {
                startDate: fiscalYear.startDate,
                endDate: fiscalYear.endDate
            })
            .andWhere('jel.costCenterId = :costCenterId', { costCenterId: costCenter.id })
            .andWhere('acc.accountType = :accountType', { accountType: 'EXPENSE' });

        const expenseSums = await expenseQuery.select('SUM(jel.debit)', 'totalDebit')
            .addSelect('SUM(jel.credit)', 'totalCredit')
            .getRawOne();

        // Expense = Debit - Credit
        const totalExpense = (Number(expenseSums.totalDebit) || 0) - (Number(expenseSums.totalCredit) || 0);

        const netProfit = totalIncome - totalExpense;

        return {
            costCenter: {
                id: costCenter.id,
                name: costCenter.name,
                code: costCenter.code,
                type: costCenter.type,
                manager: costCenter.manager ? { id: costCenter.manager.id, name: `${costCenter.manager.first_name} ${costCenter.manager.last_name || ''}`.trim() } : null
            },
            fiscalYear: {
                id: fiscalYear.id,
                year: fiscalYear.year,
            },
            profitability: {
                totalIncome,
                totalExpense,
                netProfit,
                isProfitable: netProfit > 0
            }
        };
    }
}
