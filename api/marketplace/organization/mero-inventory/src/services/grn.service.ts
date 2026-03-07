import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { GoodsReceiptNote, GRNItem, GRNStatus, MatchingStatus } from '../entities/goods-receipt-note.entity';
import { PurchaseOrder, PurchaseOrderStatus } from '../entities/purchase-order.entity';
import { Stock } from '../entities/stock.entity';
import { StockMovement, StockMovementType } from '../entities/stock-movement.entity';

@Injectable()
export class GRNService {
    constructor(
        @InjectRepository(GoodsReceiptNote)
        private grnRepo: Repository<GoodsReceiptNote>,
        @InjectRepository(GRNItem)
        private grnItemRepo: Repository<GRNItem>,
        @InjectRepository(PurchaseOrder)
        private poRepo: Repository<PurchaseOrder>,
        @InjectRepository(Stock)
        private stockRepo: Repository<Stock>,
        @InjectRepository(StockMovement)
        private movementRepo: Repository<StockMovement>,
        private dataSource: DataSource,
    ) {}

    private async generateGRNNumber(organizationId: string): Promise<string> {
        const count = await this.grnRepo.count({ where: { organization_id: organizationId } });
        return `GRN-${String(count + 1).padStart(5, '0')}`;
    }

    async create(organizationId: string, userId: string, data: {
        purchase_order_id: string;
        warehouse_id?: string;
        received_date?: string;
        notes?: string;
        items: Array<{
            product_id: string;
            product_name?: string;
            ordered_quantity: number;
            received_quantity: number;
            rejected_quantity?: number;
            unit_price?: number;
            notes?: string;
        }>;
    }): Promise<GoodsReceiptNote> {
        const po = await this.poRepo.findOne({
            where: { id: data.purchase_order_id, organizationId: organizationId },
            relations: ['items'],
        });
        if (!po) throw new NotFoundException('Purchase Order not found');

        const grn_number = await this.generateGRNNumber(organizationId);

        const items = data.items.map(item => ({
            ...item,
            rejected_quantity: item.rejected_quantity || 0,
        }));

        // Determine matching status
        const matchingStatus = this.calculateMatchingStatus(po.items as any[], items);

        const grn = this.grnRepo.create({
            organization_id: organizationId,
            grn_number,
            purchase_order_id: data.purchase_order_id,
            warehouse_id: data.warehouse_id,
            status: GRNStatus.DRAFT,
            matching_status: matchingStatus,
            received_by: userId,
            received_date: data.received_date,
            notes: data.notes,
            items: items as any,
        });

        return this.grnRepo.save(grn);
    }

    private calculateMatchingStatus(poItems: any[], grnItems: any[]): MatchingStatus {
        let totalOrdered = 0;
        let totalReceived = 0;

        for (const grnItem of grnItems) {
            totalReceived += Number(grnItem.received_quantity || 0);
            totalOrdered += Number(grnItem.ordered_quantity || 0);
        }

        if (totalReceived === 0) return MatchingStatus.PENDING;
        if (totalReceived === totalOrdered) return MatchingStatus.MATCHED;
        if (totalReceived > totalOrdered) return MatchingStatus.OVER_RECEIVED;
        if (totalReceived < totalOrdered && totalReceived > 0) return MatchingStatus.UNDER_RECEIVED;
        return MatchingStatus.PARTIAL;
    }

    async confirm(organizationId: string, id: string, userId: string): Promise<GoodsReceiptNote> {
        const grn = await this.findOne(organizationId, id);
        if (grn.status !== GRNStatus.DRAFT) throw new BadRequestException('GRN is already confirmed');
        if (!grn.warehouse_id) throw new BadRequestException('Warehouse must be specified before confirming');

        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();
        try {
            // Update stock for each received item
            for (const item of grn.items) {
                const receivedQty = Number(item.received_quantity);
                if (receivedQty <= 0) continue;

                let stock = await this.stockRepo.findOne({
                    where: { product_id: item.product_id, warehouse_id: grn.warehouse_id } as any,
                });
                if (!stock) {
                    stock = new Stock();
                    stock.productId = item.product_id;
                    stock.warehouseId = grn.warehouse_id;
                    stock.quantity = 0;
                }
                stock.quantity = Number(stock.quantity) + receivedQty;
                await queryRunner.manager.save(stock);

                const movement = this.movementRepo.create({
                    organization_id: organizationId,
                    product_id: item.product_id,
                    warehouse_id: grn.warehouse_id,
                    type: StockMovementType.IN,
                    quantity: receivedQty,
                    reference_type: 'GoodsReceiptNote',
                    reference_id: grn.id,
                    notes: `GRN ${grn.grn_number} received`,
                    created_by: userId,
                } as any);
                await queryRunner.manager.save(movement);
            }

            grn.status = GRNStatus.RECEIVED;
            await queryRunner.manager.save(grn);

            // Update PO status
            const po = await this.poRepo.findOne({ where: { id: grn.purchase_order_id } });
            if (po && po.status !== PurchaseOrderStatus.RECEIVED) {
                po.status = grn.matching_status === MatchingStatus.UNDER_RECEIVED
                    ? PurchaseOrderStatus.ORDERED
                    : PurchaseOrderStatus.RECEIVED;
                await queryRunner.manager.save(po);
            }

            await queryRunner.commitTransaction();
            return this.findOne(organizationId, id);
        } catch (err) {
            await queryRunner.rollbackTransaction();
            throw err;
        } finally {
            await queryRunner.release();
        }
    }

    async findAll(organizationId: string): Promise<GoodsReceiptNote[]> {
        return this.grnRepo.find({
            where: { organization_id: organizationId },
            relations: ['items'],
            order: { created_at: 'DESC' },
        });
    }

    async findOne(organizationId: string, id: string): Promise<GoodsReceiptNote> {
        const grn = await this.grnRepo.findOne({
            where: { id, organization_id: organizationId },
            relations: ['items'],
        });
        if (!grn) throw new NotFoundException('GRN not found');
        return grn;
    }

    async getThreeWayMatch(organizationId: string, purchaseOrderId: string): Promise<{
        po: any;
        grns: GoodsReceiptNote[];
        matchingSummary: any[];
    }> {
        const po = await this.poRepo.findOne({
            where: { id: purchaseOrderId, organizationId: organizationId },
            relations: ['supplier', 'items', 'items.product'],
        });
        if (!po) throw new NotFoundException('Purchase Order not found');

        const grns = await this.grnRepo.find({
            where: { organization_id: organizationId, purchase_order_id: purchaseOrderId },
            relations: ['items'],
        });

        const matchingSummary = (po.items as any[]).map(poItem => {
            const totalReceived = grns.reduce((sum, grn) => {
                const grnItem = grn.items.find(i => i.product_id === poItem.productId);
                return sum + (grnItem ? Number(grnItem.received_quantity) : 0);
            }, 0);
            return {
                product_id: poItem.productId,
                product_name: poItem.product?.name || 'Unknown',
                ordered_qty: poItem.quantity,
                received_qty: totalReceived,
                variance: totalReceived - poItem.quantity,
                status: totalReceived === poItem.quantity ? 'matched'
                    : totalReceived > poItem.quantity ? 'over_received'
                    : totalReceived > 0 ? 'under_received'
                    : 'not_received',
            };
        });

        return { po, grns, matchingSummary };
    }
}
