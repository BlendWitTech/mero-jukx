import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { PurchaseOrder, PurchaseOrderStatus } from '../entities/purchase-order.entity';
import { PurchaseOrderItem } from '../entities/purchase-order-item.entity';
import { Stock } from '../entities/stock.entity';
import { StockMovement, StockMovementType } from '../entities/stock-movement.entity';
import { Product } from '../entities/product.entity';
import { InventoryAccountingService } from './inventory-accounting.service';

@Injectable()
export class PurchaseOrdersService {
    private readonly logger = new Logger(PurchaseOrdersService.name);

    constructor(
        @InjectRepository(PurchaseOrder)
        private poRepository: Repository<PurchaseOrder>,
        @InjectRepository(Stock)
        private stockRepository: Repository<Stock>,
        @InjectRepository(Product)
        private productRepository: Repository<Product>,
        private dataSource: DataSource,
        private readonly inventoryAccountingService: InventoryAccountingService,
    ) { }

    async create(organizationId: string, data: any): Promise<PurchaseOrder> {
        const { items, ...poData } = data;

        const po = this.poRepository.create({
            ...poData,
            organizationId,
            items: items.map(item => ({
                ...item,
                total: Number(item.quantity) * Number(item.unitPrice)
            })),
            totalAmount: items.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.unitPrice)), 0)
        });

        const savedPo = await this.poRepository.save(po);
        return Array.isArray(savedPo) ? savedPo[0] : savedPo;
    }

    async findAll(organizationId: string): Promise<PurchaseOrder[]> {
        return this.poRepository.find({
            where: { organizationId },
            relations: ['supplier'],
            order: { createdAt: 'DESC' },
        });
    }

    async findOne(organizationId: string, id: string): Promise<PurchaseOrder> {
        const po = await this.poRepository.findOne({
            where: { id, organizationId },
            relations: ['supplier', 'items', 'items.product'],
        });

        if (!po) {
            throw new NotFoundException('Purchase Order not found');
        }

        return po;
    }

    async update(organizationId: string, id: string, data: any): Promise<PurchaseOrder> {
        const po = await this.findOne(organizationId, id);

        if (po.status !== PurchaseOrderStatus.DRAFT) {
            throw new BadRequestException('Can only update draft purchase orders');
        }

        Object.assign(po, data);
        const savedPo = await this.poRepository.save(po);
        return Array.isArray(savedPo) ? savedPo[0] : savedPo;
    }

    async receive(organizationId: string, id: string, warehouseId: string): Promise<PurchaseOrder> {
        const po = await this.findOne(organizationId, id);

        if (po.status === PurchaseOrderStatus.RECEIVED) {
            throw new BadRequestException('Purchase Order already received');
        }

        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            // Update PO status
            po.status = PurchaseOrderStatus.RECEIVED;
            await queryRunner.manager.save(po);

            // Process Stock Movements
            for (const item of po.items) {
                // Find or Create Stock
                let stock = await queryRunner.manager.findOne(Stock, {
                    where: {
                        productId: item.productId,
                        warehouseId: warehouseId
                    }
                });

                if (!stock) {
                    stock = queryRunner.manager.create(Stock, {
                        productId: item.productId,
                        warehouseId: warehouseId,
                        quantity: 0
                    });
                }

                // Update quantity
                const oldQuantity = Number(stock.quantity);
                const newQuantity = Number(item.quantity);
                stock.quantity = oldQuantity + newQuantity;
                await queryRunner.manager.save(stock);

                // Update WAC (Weighted Average Cost) on Product
                const product = await queryRunner.manager.findOne(Product, { where: { id: item.productId } });
                if (product) {
                    const oldCost = Number(product.cost_price) || 0;
                    const newCost = Number(item.unitPrice) || 0;

                    // WAC Formula: ((Old Total Value) + (New Total Value)) / (New Total Quantity)
                    // If old quantity is 0 or less, new cost becomes the cost price.
                    if (oldQuantity > 0) {
                        const totalOldValue = oldQuantity * oldCost;
                        const totalNewValue = newQuantity * newCost;
                        product.cost_price = (totalOldValue + totalNewValue) / (oldQuantity + newQuantity);
                    } else {
                        product.cost_price = newCost;
                    }
                    await queryRunner.manager.save(product);
                }

                // Create Movement Record
                const movement = queryRunner.manager.create(StockMovement, {
                    organizationId: po.organizationId,
                    productId: item.productId,
                    warehouseId: warehouseId,
                    type: StockMovementType.IN,
                    quantity: Number(item.quantity),
                    referenceType: 'PurchaseOrder',
                    referenceId: po.id,
                    notes: `Received from PO #${po.number}`,
                    createdById: po.organizationId, // Using org ID as placeholder if user ID not available in context
                });
                await queryRunner.manager.save(movement);
            }

            await queryRunner.commitTransaction();

            // Post PO receipt to accounting as DRAFT journal entry (non-blocking)
            await this.inventoryAccountingService.postPurchaseOrderToAccounting(po, organizationId, 'system');

            return po;
        } catch (err) {
            await queryRunner.rollbackTransaction();
            throw err;
        } finally {
            await queryRunner.release();
        }
    }
}
