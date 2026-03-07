import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, IsNull } from 'typeorm';
import { BankStatement, BankStatementLine, BankStatementStatus, BankStatementLineStatus } from '@src/database/entities/bank_statements.entity';
import { BankAccount } from '@src/database/entities/banking_fiscal.entity';
import { JournalEntryLine, JournalEntryStatus } from '@src/database/entities/journal_entries.entity';
import { AuditService } from './audit.service';

export interface ParseStatementRowDto {
    transactionDate: string; // YYYY-MM-DD
    description: string;
    referenceNumber?: string;
    withdrawal?: number;
    deposit?: number;
    balance?: number;
}

@Injectable()
export class BankReconciliationService {
    constructor(
        @InjectRepository(BankStatement)
        private readonly bankStatementRepo: Repository<BankStatement>,
        @InjectRepository(BankStatementLine)
        private readonly bankStatementLineRepo: Repository<BankStatementLine>,
        @InjectRepository(JournalEntryLine)
        private readonly journalLineRepo: Repository<JournalEntryLine>,
        private readonly auditService: AuditService,
        private readonly dataSource: DataSource,
    ) { }

    async importStatement(organizationId: string, userId: string, bankAccountId: string, rows: ParseStatementRowDto[]) {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            const bankAccount = await queryRunner.manager.findOne(BankAccount, {
                where: { id: bankAccountId, organizationId }
            });
            if (!bankAccount) throw new NotFoundException('Bank account not found');

            if (rows.length === 0) throw new BadRequestException('Statement is empty');

            // Sort rows by date asc
            rows.sort((a, b) => new Date(a.transactionDate).getTime() - new Date(b.transactionDate).getTime());

            // Create Statement header
            const statement = queryRunner.manager.create(BankStatement, {
                organizationId,
                bankAccountId,
                statementDate: new Date(),
                openingBalance: rows[0].balance || 0, // Approx
                closingBalance: rows[rows.length - 1].balance || 0,
                status: BankStatementStatus.IMPORTED
            });
            const savedStatement = await queryRunner.manager.save(BankStatement, statement);

            // Create Lines
            const linesToSave = rows.map(r => {
                return queryRunner.manager.create(BankStatementLine, {
                    bankStatementId: savedStatement.id,
                    transactionDate: new Date(r.transactionDate),
                    description: r.description || '',
                    referenceNumber: r.referenceNumber || null,
                    withdrawal: Number(r.withdrawal) || 0,
                    deposit: Number(r.deposit) || 0,
                    balance: Number(r.balance) || 0,
                    status: BankStatementLineStatus.UNMATCHED
                });
            });

            await queryRunner.manager.save(BankStatementLine, linesToSave);

            await this.auditService.log(
                organizationId,
                userId,
                'IMPORT_BANK_STATEMENT',
                'BankStatement',
                savedStatement.id,
                null,
                { message: `Imported statement with ${linesToSave.length} lines for ${bankAccount.bankName}` }
            );

            await queryRunner.commitTransaction();
            return savedStatement;
        } catch (err) {
            await queryRunner.rollbackTransaction();
            throw err;
        } finally {
            await queryRunner.release();
        }
    }

    async autoReconcile(organizationId: string, userId: string, statementId: string) {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            const statement = await queryRunner.manager.findOne(BankStatement, {
                where: { id: statementId, organizationId },
                relations: ['bankAccount']
            });
            if (!statement) throw new NotFoundException('Statement not found');

            const ledgerAccountId = statement.bankAccount.accountId;

            // Fetch unmatched lines
            const unmatchedLines = await queryRunner.manager.find(BankStatementLine, {
                where: { bankStatementId: statementId, status: BankStatementLineStatus.UNMATCHED },
                order: { transactionDate: 'ASC' }
            });

            if (unmatchedLines.length === 0) {
                return { matchedCount: 0, message: 'No unmatched lines found' };
            }

            let matchedCount = 0;

            // Fetch Journal Lines for this bank account that are POSTED
            for (const bLine of unmatchedLines) {
                // Bank withdrawal = We credited our bank account (money out)
                // Bank deposit = We debited our bank account (money in)

                const isDeposit = Number(bLine.deposit) > 0;
                const matchAmount = isDeposit ? Number(bLine.deposit) : Number(bLine.withdrawal);

                // Construct a query to find a matching journal entry line
                const jLineQuery = queryRunner.manager.createQueryBuilder(JournalEntryLine, 'jl')
                    .innerJoinAndSelect('jl.journalEntry', 'je')
                    .where('je.organization_id = :orgId', { orgId: organizationId })
                    .andWhere('je.status = :jeStatus', { jeStatus: JournalEntryStatus.POSTED })
                    .andWhere('jl.account_id = :accId', { accId: ledgerAccountId });

                // Match amounts exactly
                if (isDeposit) {
                    jLineQuery.andWhere('jl.debit = :amount', { amount: matchAmount });
                } else {
                    jLineQuery.andWhere('jl.credit = :amount', { amount: matchAmount });
                }

                // Date proximity: +/- 5 days
                const tDate = new Date(bLine.transactionDate);
                const startDate = new Date(tDate);
                startDate.setDate(startDate.getDate() - 5);
                const endDate = new Date(tDate);
                endDate.setDate(endDate.getDate() + 5);

                jLineQuery.andWhere('je.entry_date BETWEEN :start AND :end', {
                    start: startDate.toISOString().split('T')[0],
                    end: endDate.toISOString().split('T')[0]
                });

                // Find potential matches. In a real system we'd exclude JE lines that are already reconciled.
                // Assuming we add a flag, but for now we take the first available if not already linked in this statement.
                // (To be perfectly robust, we'd need `isReconciled` on `JournalEntryLine`. 
                // Alternatively, we check if `journalEntryLineId` exists in `bank_statement_lines`).

                const potentialMatches = await jLineQuery.getMany();

                // Filter out ones already matched in ANY statement
                const matchedJeLineIds = await queryRunner.manager.createQueryBuilder(BankStatementLine, 'bsl')
                    .select('bsl.journalEntryLineId')
                    .where('bsl.journalEntryLineId IS NOT NULL')
                    .getRawMany();

                const alreadyMatchedIds = matchedJeLineIds.map(m => m.journalEntryLineId);

                const validMatch = potentialMatches.find(pm => !alreadyMatchedIds.includes(pm.id));

                if (validMatch) {
                    bLine.status = BankStatementLineStatus.MATCHED;
                    bLine.journalEntryId = validMatch.journalEntryId;
                    bLine.journalEntryLineId = validMatch.id;
                    await queryRunner.manager.save(BankStatementLine, bLine);
                    matchedCount++;
                }
            }

            // Check if all lines are now reconciled or ignored
            const remainingCount = await queryRunner.manager.count(BankStatementLine, {
                where: { bankStatementId: statementId, status: BankStatementLineStatus.UNMATCHED }
            });

            if (remainingCount === 0) {
                statement.status = BankStatementStatus.RECONCILED;
                await queryRunner.manager.save(BankStatement, statement);
            } else {
                statement.status = BankStatementStatus.RECONCILING;
                await queryRunner.manager.save(BankStatement, statement);
            }

            await this.auditService.log(
                organizationId,
                userId,
                'AUTO_RECONCILE_BANK_STATEMENT',
                'BankStatement',
                statementId,
                null,
                { message: `Auto-reconciled ${matchedCount} lines` }
            );

            await queryRunner.commitTransaction();
            return { matchedCount, remainingCount };
        } catch (err) {
            await queryRunner.rollbackTransaction();
            throw err;
        } finally {
            await queryRunner.release();
        }
    }

    async getStatements(organizationId: string) {
        return this.bankStatementRepo.find({
            where: { organizationId },
            relations: ['bankAccount'],
            order: { statementDate: 'DESC' }
        });
    }

    async getStatementLines(organizationId: string, statementId: string) {
        const stmt = await this.bankStatementRepo.findOne({ where: { id: statementId, organizationId } });
        if (!stmt) throw new NotFoundException('Statement not found');

        return this.bankStatementLineRepo.find({
            where: { bankStatementId: statementId },
            relations: ['journalEntry', 'journalEntryLine'],
            order: { transactionDate: 'ASC' }
        });
    }

    async manualMatch(organizationId: string, userId: string, lineId: string, journalEntryLineId: string) {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            const line = await queryRunner.manager.findOne(BankStatementLine, {
                where: { id: lineId },
                relations: ['bankStatement']
            });
            if (!line || line.bankStatement.organizationId !== organizationId) {
                throw new NotFoundException('Bank statement line not found');
            }

            const jeLine = await queryRunner.manager.findOne(JournalEntryLine, {
                where: { id: journalEntryLineId },
                relations: ['journalEntry']
            });

            if (!jeLine || jeLine.journalEntry.organizationId !== organizationId) {
                throw new NotFoundException('Journal entry line not found');
            }

            line.status = BankStatementLineStatus.MATCHED;
            line.journalEntryId = jeLine.journalEntryId;
            line.journalEntryLineId = jeLine.id;
            await queryRunner.manager.save(BankStatementLine, line);

            // Check if statement is fully reconciled
            const remainingCount = await queryRunner.manager.count(BankStatementLine, {
                where: { bankStatementId: line.bankStatementId, status: BankStatementLineStatus.UNMATCHED }
            });

            if (remainingCount === 0) {
                line.bankStatement.status = BankStatementStatus.RECONCILED;
                await queryRunner.manager.save(BankStatement, line.bankStatement);
            } else {
                line.bankStatement.status = BankStatementStatus.RECONCILING;
                await queryRunner.manager.save(BankStatement, line.bankStatement);
            }

            await queryRunner.commitTransaction();
            return line;
        } catch (error) {
            await queryRunner.rollbackTransaction();
            throw error;
        } finally {
            await queryRunner.release();
        }
    }

    async ignoreLine(organizationId: string, userId: string, lineId: string) {
        const line = await this.bankStatementLineRepo.findOne({
            where: { id: lineId },
            relations: ['bankStatement']
        });
        if (!line || line.bankStatement.organizationId !== organizationId) {
            throw new NotFoundException('Line not found');
        }

        line.status = BankStatementLineStatus.IGNORED;
        await this.bankStatementLineRepo.save(line);

        const remainingCount = await this.bankStatementLineRepo.count({
            where: { bankStatementId: line.bankStatementId, status: BankStatementLineStatus.UNMATCHED }
        });

        if (remainingCount === 0) {
            line.bankStatement.status = BankStatementStatus.RECONCILED;
            await this.bankStatementRepo.save(line.bankStatement);
        } else {
            line.bankStatement.status = BankStatementStatus.RECONCILING;
            await this.bankStatementRepo.save(line.bankStatement);
        }

        return line;
    }
}
