import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Budget, BudgetLine, BudgetType } from '@src/database/entities/budgets.entity';
import { JournalEntryLine, JournalEntryStatus } from '@src/database/entities/journal_entries.entity';

@Injectable()
export class BudgetsService {
    constructor(
        @InjectRepository(Budget)
        private readonly budgetRepository: Repository<Budget>,
        @InjectRepository(BudgetLine)
        private readonly budgetLineRepository: Repository<BudgetLine>,
        @InjectRepository(JournalEntryLine)
        private readonly journalEntryLineRepository: Repository<JournalEntryLine>,
        private readonly dataSource: DataSource,
    ) { }

    async findAll(organizationId: string) {
        return this.budgetRepository.find({
            where: { organizationId },
            relations: ['fiscalYear', 'department', 'project'],
            order: { name: 'ASC' }
        });
    }

    async findById(id: string, organizationId: string) {
        const budget = await this.budgetRepository.findOne({
            where: { id, organizationId },
            relations: ['lines', 'lines.account', 'fiscalYear', 'department', 'project']
        });
        if (!budget) throw new NotFoundException('Budget not found');
        return budget;
    }

    async createBudget(organizationId: string, data: any) {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            const budget = queryRunner.manager.create(Budget, {
                organizationId,
                fiscalYearId: data.fiscalYearId,
                name: data.name,
                type: data.type || BudgetType.GLOBAL,
                departmentId: data.departmentId || null,
                projectId: data.projectId || null,
            });

            const savedBudget = await queryRunner.manager.save(Budget, budget);

            if (data.lines && data.lines.length > 0) {
                const lines = data.lines.map((line: any) => queryRunner.manager.create(BudgetLine, {
                    budgetId: savedBudget.id,
                    accountId: line.accountId,
                    allocatedAmount: line.allocatedAmount,
                }));
                await queryRunner.manager.save(BudgetLine, lines);
            }

            await queryRunner.commitTransaction();
            return this.findById(savedBudget.id, organizationId);
        } catch (error) {
            await queryRunner.rollbackTransaction();
            throw error;
        } finally {
            await queryRunner.release();
        }
    }

    async getBudgetVariance(id: string, organizationId: string) {
        const budget = await this.findById(id, organizationId);

        const results = [];

        for (const line of budget.lines) {
            // Calculate actual spent against this account
            const query = this.journalEntryLineRepository.createQueryBuilder('jel')
                .innerJoin('jel.journalEntry', 'je')
                .where('je.organizationId = :organizationId', { organizationId })
                .andWhere('je.status = :status', { status: JournalEntryStatus.POSTED }) // typically only posted entries
                .andWhere('je.entryDate >= :startDate AND je.entryDate <= :endDate', {
                    startDate: budget.fiscalYear.startDate,
                    endDate: budget.fiscalYear.endDate
                })
                .andWhere('jel.accountId = :accountId', { accountId: line.account.id });

            // Apply dimensional filters based on budget type
            if (budget.type === BudgetType.DEPARTMENT && budget.departmentId) {
                query.andWhere('jel.departmentId = :departmentId', { departmentId: budget.departmentId });
            } else if (budget.type === BudgetType.PROJECT && budget.projectId) {
                query.andWhere('jel.projectId = :projectId', { projectId: budget.projectId });
            }

            // Actual spent for expense accounts is usually Net Debit (Debit - Credit)
            // But we should just calculate net balance. For expenses, debits increase, credits decrease.
            // Simplified here: sum of debits - sum of credits

            const sums = await query.select('SUM(jel.debit)', 'totalDebit')
                .addSelect('SUM(jel.credit)', 'totalCredit')
                .getRawOne();

            const actualSpent = (Number(sums.totalDebit) || 0) - (Number(sums.totalCredit) || 0);
            const allocatedAmount = Number(line.allocatedAmount);
            const variance = allocatedAmount - actualSpent;

            results.push({
                lineId: line.id,
                account: line.account,
                allocatedAmount,
                actualSpent,
                variance,
                utilizationPercentage: allocatedAmount > 0 ? (actualSpent / allocatedAmount) * 100 : 0
            });
        }

        return {
            budget: {
                id: budget.id,
                name: budget.name,
                type: budget.type,
                fiscalYear: budget.fiscalYear,
                department: budget.department,
                project: budget.project,
            },
            varianceReport: results
        };
    }
}
