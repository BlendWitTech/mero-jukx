import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from '../entities/product.entity';
import { JournalEntriesService } from '../../../mero-accounting/services/journal-entries.service';
import { AccountsService } from '../../../mero-accounting/services/accounts.service';

@Injectable()
export class InventoryAccountingService {
    private readonly logger = new Logger(InventoryAccountingService.name);

    constructor(
        private readonly journalEntriesService: JournalEntriesService,
        private readonly accountsService: AccountsService,
        @InjectRepository(Product)
        private readonly productRepository: Repository<Product>,
    ) {}

    /**
     * Posts a PO receipt as a DRAFT journal entry:
     *   DR  Inventory (Asset)
     *   CR  Accounts Payable (Liability)
     */
    async postPurchaseOrderToAccounting(po: any, organizationId: string, userId: string): Promise<void> {
        try {
            const amount = Number(po.totalAmount) || 0;
            if (amount <= 0) return;

            const accounts = await this.accountsService.findAll(organizationId);

            const inventoryAccId = accounts.find(a =>
                a.name.toLowerCase().includes('inventory'),
            )?.id;

            const apAccId = accounts.find(a =>
                a.name.toLowerCase().includes('accounts payable'),
            )?.id;

            if (!inventoryAccId || !apAccId) {
                this.logger.error(
                    `PO Accounting: Could not find Inventory or Accounts Payable accounts for org ${organizationId}`,
                );
                return;
            }

            await this.journalEntriesService.create(organizationId, userId, {
                narration: `PO Receipt - ${po.number || po.id}`,
                entryDate: new Date(),
                status: 'DRAFT',
                lines: [
                    {
                        accountId: inventoryAccId,
                        debit: amount,
                        credit: 0,
                        description: `Inventory received - PO #${po.number || po.id}`,
                    },
                    {
                        accountId: apAccId,
                        debit: 0,
                        credit: amount,
                        description: `Accounts Payable - PO #${po.number || po.id}`,
                    },
                ],
            });

            this.logger.log(`Posted PO #${po.number || po.id} to accounting as DRAFT journal entry`);
        } catch (err) {
            this.logger.error('Failed to post PO receipt to accounting', err?.message || err);
        }
    }

    /**
     * Posts COGS for a shipment as a DRAFT journal entry:
     *   DR  Cost of Goods Sold (Expense)
     *   CR  Inventory (Asset)
     * Uses product.cost_price × quantity to compute total cost.
     */
    async postShipmentCogsToAccounting(
        items: any[],
        shipment: any,
        organizationId: string,
        userId: string,
    ): Promise<void> {
        try {
            let totalCost = 0;

            for (const item of items) {
                const productId = item.product_id || item.productId;
                if (!productId) continue;

                const product = await this.productRepository.findOne({ where: { id: productId } });
                if (product?.cost_price) {
                    totalCost += Number(item.quantity) * Number(product.cost_price);
                }
            }

            if (totalCost <= 0) return;

            const accounts = await this.accountsService.findAll(organizationId);

            const cogsAccId = accounts.find(a =>
                a.name.toLowerCase().includes('cost of goods sold') ||
                a.name.toLowerCase().includes('cogs'),
            )?.id;

            const inventoryAccId = accounts.find(a =>
                a.name.toLowerCase().includes('inventory'),
            )?.id;

            if (!cogsAccId || !inventoryAccId) {
                this.logger.error(
                    `Shipment COGS Accounting: Could not find COGS or Inventory accounts for org ${organizationId}`,
                );
                return;
            }

            await this.journalEntriesService.create(organizationId, userId, {
                narration: `COGS - Shipment ${shipment.shipment_number || shipment.id}`,
                entryDate: new Date(),
                status: 'DRAFT',
                lines: [
                    {
                        accountId: cogsAccId,
                        debit: totalCost,
                        credit: 0,
                        description: `Cost of Goods Sold - Shipment #${shipment.shipment_number}`,
                    },
                    {
                        accountId: inventoryAccId,
                        debit: 0,
                        credit: totalCost,
                        description: `Inventory reduced - Shipment #${shipment.shipment_number}`,
                    },
                ],
            });

            this.logger.log(`Posted COGS for Shipment #${shipment.shipment_number} to accounting`);
        } catch (err) {
            this.logger.error('Failed to post shipment COGS to accounting', err?.message || err);
        }
    }
}
