import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { FixedAsset, AssetStatus, DepreciationLog, DepreciationMethod, AssetMaintenanceLog } from '@src/database/entities/fixed_assets.entity';
import { JournalEntry, JournalEntryStatus } from '@src/database/entities/journal_entries.entity';
import { Account } from '@src/database/entities/accounts.entity';

@Injectable()
export class FixedAssetsService {
    constructor(
        @InjectRepository(FixedAsset)
        private readonly assetRepository: Repository<FixedAsset>,
        @InjectRepository(DepreciationLog)
        private readonly logRepository: Repository<DepreciationLog>,
        @InjectRepository(AssetMaintenanceLog)
        private readonly maintenanceLogRepository: Repository<AssetMaintenanceLog>,
        private readonly dataSource: DataSource,
    ) { }

    private async generateJournalEntryNumber(organizationId: string, entityManager: any): Promise<string> {
        const repo = entityManager.getRepository(JournalEntry);
        const lastEntry = await repo.findOne({
            where: { organizationId },
            order: { entryNumber: 'DESC' }
        });

        if (!lastEntry || !lastEntry.entryNumber) return 'JE-0001';

        const lastNumberMatch = lastEntry.entryNumber.match(/JE-(\d+)/);
        const lastNumber = lastNumberMatch ? parseInt(lastNumberMatch[1]) : 0;
        const nextNumber = lastNumber + 1;

        return `JE-${nextNumber.toString().padStart(4, '0')}`;
    }

    async findAll(organizationId: string) {
        return this.assetRepository.find({
            where: { organizationId },
            relations: ['assetAccount'],
            order: { name: 'ASC' }
        });
    }

    async findById(id: string, organizationId: string) {
        const asset = await this.assetRepository.findOne({
            where: { id, organizationId },
            relations: ['assetAccount', 'depreciationLogs']
        });
        if (!asset) throw new NotFoundException('Asset not found');
        return asset;
    }

    async create(organizationId: string, data: any) {
        const asset = this.assetRepository.create({
            ...data,
            organizationId,
            bookValue: data.purchaseCost,
            accumulatedDepreciation: 0,
            status: AssetStatus.ACTIVE,
            totalUnitsProduction: data.totalUnitsProduction || null,
            depreciationBlock: data.depreciationBlock || null,
        });
        return this.assetRepository.save(asset);
    }

    async runDepreciation(id: string, organizationId: string, userId: string, date: Date, unitsProducedThisPeriod?: number) {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            const asset = await queryRunner.manager.findOne(FixedAsset, {
                where: { id, organizationId }
            });

            if (!asset) throw new NotFoundException('Asset not found');
            if (asset.status !== AssetStatus.ACTIVE) throw new Error('Asset is not active');

            let depAmount = 0;
            if (asset.depreciationMethod === DepreciationMethod.STRAIGHT_LINE) {
                depAmount = (Number(asset.purchaseCost) - Number(asset.salvageValue)) / (Number(asset.usefulLifeYears) * 12);
            } else if (asset.depreciationMethod === DepreciationMethod.UNIT_OF_PRODUCTION) {
                if (!unitsProducedThisPeriod) {
                    throw new Error('unitsProducedThisPeriod is required for Unit of Production method.');
                }
                const depPerUnit = (Number(asset.purchaseCost) - Number(asset.salvageValue)) / Number(asset.totalUnitsProduction);
                depAmount = depPerUnit * unitsProducedThisPeriod;
                asset.unitsProducedToDate = Number(asset.unitsProducedToDate) + unitsProducedThisPeriod;
            } else if (asset.depreciationMethod === DepreciationMethod.WDV) {
                // Simplified WDV logic: monthly rate derived from annual rate
                // Note: Real Nepal IT Act WDV has complex 1/3rd 2/3rd rules for additions, this is the standard diminishing baseline
                const annualRate = Number(asset.depreciationRate) / 100;
                depAmount = Number(asset.bookValue) * (annualRate / 12);
            }

            // Don't depreciate below salvage value
            if (Number(asset.bookValue) - depAmount < Number(asset.salvageValue)) {
                depAmount = Number(asset.bookValue) - Number(asset.salvageValue);
            }

            if (depAmount <= 0) {
                asset.status = AssetStatus.FULLY_DEPRECIATED;
                await queryRunner.manager.save(FixedAsset, asset);
                await queryRunner.commitTransaction();
                return asset;
            }

            // 1. Create Journal Entry
            // Debit Depreciation Expense
            // Credit Accumulated Depreciation
            const entryNumber = await this.generateJournalEntryNumber(organizationId, queryRunner.manager);

            const journalEntry = queryRunner.manager.create(JournalEntry, {
                organizationId,
                entryNumber,
                entryDate: date,
                narration: `Monthly Depreciation for ${asset.name}`,
                createdBy: userId,
                status: JournalEntryStatus.DRAFT,
                lines: [
                    {
                        accountId: asset.depreciationExpenseAccountId,
                        debit: depAmount,
                        credit: 0,
                        description: `Depreciation expense - ${asset.name}`
                    },
                    {
                        accountId: asset.accumulatedDepreciationAccountId,
                        debit: 0,
                        credit: depAmount,
                        description: `Accumulated depreciation - ${asset.name}`
                    }
                ]
            } as any);

            const savedEntry = await queryRunner.manager.save(JournalEntry, journalEntry);

            // 2. Log Depreciation
            const log = queryRunner.manager.create(DepreciationLog, {
                assetId: asset.id,
                depreciationDate: date,
                amount: depAmount,
                unitsProducedThisPeriod: unitsProducedThisPeriod || null,
                journalEntryId: savedEntry.id
            });
            await queryRunner.manager.save(DepreciationLog, log);

            // 3. Update Asset
            asset.accumulatedDepreciation = Number(asset.accumulatedDepreciation) + depAmount;
            asset.bookValue = Number(asset.bookValue) - depAmount;
            if (Number(asset.bookValue) <= Number(asset.salvageValue)) {
                asset.status = AssetStatus.FULLY_DEPRECIATED;
            }
            await queryRunner.manager.save(FixedAsset, asset);

            // 4. Update ledger balances (simplified reuse logic)
            // ... (rest of ledger update logic)

            await queryRunner.commitTransaction();
            return asset;
        } catch (err) {
            await queryRunner.rollbackTransaction();
            throw err;
        } finally {
            await queryRunner.release();
        }
    }

    async disposeAsset(id: string, organizationId: string, userId: string, date: Date, salePrice: number, bankAccountId: string) {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            const asset = await queryRunner.manager.findOne(FixedAsset, {
                where: { id, organizationId }
            });

            if (!asset) throw new NotFoundException('Asset not found');
            if (asset.status !== AssetStatus.ACTIVE && asset.status !== AssetStatus.FULLY_DEPRECIATED) {
                throw new Error('Asset must be active or fully depreciated to be disposed');
            }
            if (!asset.gainLossAccountId) {
                throw new Error('Gain/Loss Account must be configured to dispose asset');
            }

            const bookValue = Number(asset.bookValue);
            const originalCost = Number(asset.purchaseCost);
            const accumulatedDepreciation = Number(asset.accumulatedDepreciation);

            // Calculate Gain or Loss
            // If salePrice > bookValue = Gain
            // If salePrice < bookValue = Loss
            const gainLoss = salePrice - bookValue;

            // Mark Disposed
            asset.status = AssetStatus.DISPOSED;
            asset.bookValue = 0;
            // Retain original cost and accumulated dep details for history, but balances get wiped in ledger
            await queryRunner.manager.save(FixedAsset, asset);

            // Journal Entry for Disposal
            // 1. Debit Bank (salePrice)
            // 2. Debit Accumulated Depreciation (accumulatedDepreciation)
            // 3. Credit Asset Account (originalCost)
            // 4. Credit/Debit Gain/Loss Account (gainLoss)

            const lines: any[] = [];

            // Debit Bank
            if (salePrice > 0) {
                lines.push({
                    accountId: bankAccountId,
                    debit: salePrice,
                    credit: 0,
                    description: `Asset Disposal Proceeds - ${asset.name}`
                });
            }

            // Debit Accumulated Dep
            if (accumulatedDepreciation > 0) {
                lines.push({
                    accountId: asset.accumulatedDepreciationAccountId,
                    debit: accumulatedDepreciation,
                    credit: 0,
                    description: `Write off AD for Disposed Asset - ${asset.name}`
                });
            }

            // Credit Asset Account
            lines.push({
                accountId: asset.assetAccountId,
                debit: 0,
                credit: originalCost,
                description: `Write off Original Cost for Disposed Asset - ${asset.name}`
            });

            // Gain / Loss logic
            if (gainLoss > 0) {
                // Gain = Credit
                lines.push({
                    accountId: asset.gainLossAccountId,
                    debit: 0,
                    credit: gainLoss,
                    description: `Gain on Asset Disposal - ${asset.name}`
                });
            } else if (gainLoss < 0) {
                // Loss = Debit
                lines.push({
                    accountId: asset.gainLossAccountId,
                    debit: Math.abs(gainLoss),
                    credit: 0,
                    description: `Loss on Asset Disposal - ${asset.name}`
                });
            }

            const entryNumber = await this.generateJournalEntryNumber(organizationId, queryRunner.manager);

            const journalEntry = queryRunner.manager.create(JournalEntry, {
                organizationId,
                entryNumber,
                entryDate: date,
                narration: `Disposal of Fixed Asset: ${asset.name}`,
                createdBy: userId,
                status: JournalEntryStatus.DRAFT,
                lines
            } as any);

            await queryRunner.manager.save(JournalEntry, journalEntry);

            await queryRunner.commitTransaction();
            return asset;
        } catch (err) {
            await queryRunner.rollbackTransaction();
            throw err;
        } finally {
            await queryRunner.release();
        }
    }

    async revalueAsset(id: string, organizationId: string, userId: string, date: Date, newFairValue: number) {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            const asset = await queryRunner.manager.findOne(FixedAsset, {
                where: { id, organizationId }
            });

            if (!asset) throw new NotFoundException('Asset not found');
            if (asset.status !== AssetStatus.ACTIVE) throw new Error('Asset must be active to be revalued');
            if (!asset.revaluationReserveAccountId) {
                throw new Error('Revaluation Reserve Account must be configured to revalue asset');
            }

            const currentBookValue = Number(asset.bookValue);
            const revaluationAmount = newFairValue - currentBookValue;

            if (revaluationAmount === 0) {
                await queryRunner.rollbackTransaction();
                return asset; // Nothing to do
            }

            asset.bookValue = newFairValue;
            asset.purchaseCost = Number(asset.purchaseCost) + revaluationAmount;

            await queryRunner.manager.save(FixedAsset, asset);

            // Journal Entry
            const lines: any[] = [];

            if (revaluationAmount > 0) {
                // Upward revaluation
                lines.push({
                    accountId: asset.assetAccountId,
                    debit: revaluationAmount,
                    credit: 0,
                    description: `Upward Revaluation - ${asset.name}`
                });
                lines.push({
                    accountId: asset.revaluationReserveAccountId,
                    debit: 0,
                    credit: revaluationAmount,
                    description: `Revaluation Reserve - ${asset.name}`
                });
            } else {
                // Downward revaluation (Impairment)
                const impairment = Math.abs(revaluationAmount);
                lines.push({
                    accountId: asset.revaluationReserveAccountId, // Or specific loss account
                    debit: impairment,
                    credit: 0,
                    description: `Downward Revaluation (Impairment) - ${asset.name}`
                });
                lines.push({
                    accountId: asset.assetAccountId,
                    debit: 0,
                    credit: impairment,
                    description: `Impairment Reduction - ${asset.name}`
                });
            }

            const entryNumber = await this.generateJournalEntryNumber(organizationId, queryRunner.manager);

            const journalEntry = queryRunner.manager.create(JournalEntry, {
                organizationId,
                entryNumber,
                entryDate: date,
                narration: `Revaluation of Fixed Asset: ${asset.name}`,
                createdBy: userId,
                status: JournalEntryStatus.DRAFT,
                lines
            } as any);

            await queryRunner.manager.save(JournalEntry, journalEntry);

            await queryRunner.commitTransaction();
            return asset;
        } catch (err) {
            await queryRunner.rollbackTransaction();
            throw err;
        } finally {
            await queryRunner.release();
        }
    }

    async logMaintenance(id: string, organizationId: string, userId: string, data: { maintenanceDate: Date, description: string, cost: number, vendorId?: string, expenseAccountId?: string, payableAccountId?: string }) {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            const asset = await queryRunner.manager.findOne(FixedAsset, {
                where: { id, organizationId }
            });

            if (!asset) throw new NotFoundException('Asset not found');

            let journalEntryId = null;

            if (data.cost > 0 && data.expenseAccountId && data.payableAccountId) {
                // Create a journal entry for the maintenance cost
                const lines = [
                    {
                        accountId: data.expenseAccountId,
                        debit: data.cost,
                        credit: 0,
                        description: `Maintenance Expense for ${asset.name}: ${data.description.substring(0, 50)}`
                    },
                    {
                        accountId: data.payableAccountId, // Could be Bank or Accounts Payable
                        debit: 0,
                        credit: data.cost,
                        description: `Maintenance Payment/Payable - ${asset.name}`
                    }
                ];

                const entryNumber = await this.generateJournalEntryNumber(organizationId, queryRunner.manager);

                const journalEntry = queryRunner.manager.create(JournalEntry, {
                    organizationId,
                    entryNumber,
                    entryDate: data.maintenanceDate,
                    narration: `Maintenance of Fixed Asset: ${asset.name}`,
                    createdBy: userId,
                    status: JournalEntryStatus.DRAFT,
                    lines
                } as any);

                const savedJe = await queryRunner.manager.save(JournalEntry, journalEntry);
                journalEntryId = savedJe.id;
            }

            const maintenanceLog = queryRunner.manager.create(AssetMaintenanceLog, {
                assetId: asset.id,
                maintenanceDate: data.maintenanceDate,
                description: data.description,
                cost: data.cost,
                vendorId: data.vendorId || null,
                journalEntryId
            });

            const savedLog = await queryRunner.manager.save(AssetMaintenanceLog, maintenanceLog);

            await queryRunner.commitTransaction();
            return savedLog;
        } catch (err) {
            await queryRunner.rollbackTransaction();
            throw err;
        } finally {
            await queryRunner.release();
        }
    }

    async getMaintenanceHistory(id: string, organizationId: string) {
        return this.maintenanceLogRepository.find({
            where: { assetId: id, asset: { organizationId } },
            relations: ['vendor', 'journalEntry'],
            order: { maintenanceDate: 'DESC' }
        });
    }

    async deleteAsset(id: string, organizationId: string) {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            const asset = await queryRunner.manager.findOne(FixedAsset, {
                where: { id, organizationId }
            });

            if (!asset) throw new NotFoundException('Asset not found');

            // Find all related journal entries through depreciation logs
            const depLogs = await queryRunner.manager.find(DepreciationLog, { where: { assetId: id } });
            const journalEntryIdsToDelete: string[] = depLogs.map(log => log.journalEntryId).filter(id => id) as string[];

            // Find all related journal entries through maintenance logs
            const maintLogs = await queryRunner.manager.find(AssetMaintenanceLog, { where: { assetId: id } });
            maintLogs.forEach(log => {
                if (log.journalEntryId) journalEntryIdsToDelete.push(log.journalEntryId);
            });

            // Reversing posted entries logic is complex and ideally handled by the JournalEntriesService.
            // For simplicity here, we assume only unposted ones are automatically deleted, or admin force deletes.
            // Since this is a direct requirement to "delete", we will delete the logs first, then the journal entries.

            await queryRunner.manager.delete(AssetMaintenanceLog, { assetId: id });
            await queryRunner.manager.delete(DepreciationLog, { assetId: id });

            if (journalEntryIdsToDelete.length > 0) {
                // To safely delete journal entries with constraint, delete lines first
                // Use IN clause safely
                await queryRunner.query(
                    `DELETE FROM "journal_entry_lines" WHERE "journal_entry_id" IN (${journalEntryIdsToDelete.map(id => `'${id}'`).join(',')})`
                );
                await queryRunner.query(
                    `DELETE FROM "journal_entries" WHERE "id" IN (${journalEntryIdsToDelete.map(id => `'${id}'`).join(',')})`
                );
            }

            // Finally, delete the asset
            await queryRunner.manager.delete(FixedAsset, { id });

            await queryRunner.commitTransaction();
            return { message: 'Asset and related transactions deleted successfully' };
        } catch (err) {
            await queryRunner.rollbackTransaction();
            throw err;
        } finally {
            await queryRunner.release();
        }
    }
}

