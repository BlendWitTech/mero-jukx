import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Stock } from '../entities/stock.entity';
import { StockMovement, StockMovementType } from '../entities/stock-movement.entity';

@Injectable()
export class StockService {
    constructor(
        @InjectRepository(Stock)
        private stockRepository: Repository<Stock>,
        @InjectRepository(StockMovement)
        private stockMovementRepository: Repository<StockMovement>,
    ) { }

    async getStock(productId: string, warehouseId: string): Promise<Stock | null> {
        return this.stockRepository.findOne({ where: { productId: productId, warehouseId: warehouseId } });
    }

    async adjustStock(
        productId: string,
        warehouseId: string,
        quantity: number,
        type: StockMovementType,
        reason: string,
        referenceId: string,
        userId: string,
        organizationId: string
    ): Promise<Stock> {
        return this.stockRepository.manager.transaction(async (manager) => {
            return this.adjustStockInternal(manager, productId, warehouseId, quantity, type, reason, referenceId, userId, organizationId);
        });
    }

    private async adjustStockInternal(
        manager: any,
        productId: string,
        warehouseId: string,
        quantity: number,
        type: StockMovementType,
        reason: string,
        referenceId: string,
        userId: string,
        organizationId: string
    ): Promise<Stock> {
        let stock = await manager.findOne(Stock, { where: { productId, warehouseId } });

        if (!stock) {
            if (type === StockMovementType.IN || type === StockMovementType.TRANSFER_IN || type === StockMovementType.ADJUSTMENT) {
                stock = manager.create(Stock, {
                    productId,
                    warehouseId,
                    quantity: 0,
                });
            } else {
                throw new NotFoundException('Stock record not found for this product in the specified warehouse');
            }
        }

        const isDeduction = type === StockMovementType.OUT || type === StockMovementType.TRANSFER_OUT;

        if (isDeduction && Number(stock.quantity) < quantity) {
            throw new BadRequestException(`Insufficient stock. Available: ${stock.quantity}, Required: ${quantity}`);
        }

        if (isDeduction) {
            stock.quantity = Number(stock.quantity) - quantity;
        } else {
            stock.quantity = Number(stock.quantity) + quantity;
        }

        const savedStock = await manager.save(Stock, stock);

        const movement = manager.create(StockMovement, {
            productId,
            warehouseId,
            type,
            quantity,
            notes: reason,
            referenceId,
            createdById: userId,
            organizationId,
        });

        await manager.save(StockMovement, movement);

        return savedStock;
    }

    async transferStock(
        productId: string,
        fromWarehouseId: string,
        toWarehouseId: string,
        quantity: number,
        notes: string,
        userId: string,
        organizationId: string
    ): Promise<void> {
        if (fromWarehouseId === toWarehouseId) {
            throw new BadRequestException('Source and destination warehouses must be different');
        }

        await this.stockRepository.manager.transaction(async (manager) => {
            // Deduct from source
            await this.adjustStockInternal(
                manager,
                productId,
                fromWarehouseId,
                quantity,
                StockMovementType.TRANSFER_OUT,
                notes,
                null,
                userId,
                organizationId
            );

            // Add to destination
            await this.adjustStockInternal(
                manager,
                productId,
                toWarehouseId,
                quantity,
                StockMovementType.TRANSFER_IN,
                notes,
                null,
                userId,
                organizationId
            );
        });
    }

    async calculateValuation(productId: string, organizationId: string, method: 'FIFO' | 'LIFO' = 'FIFO'): Promise<number> {
        const stocks = await this.stockRepository.find({
            where: {
                productId,
                warehouse: { organization_id: organizationId }
            },
            relations: ['warehouse']
        });
        let remainingQty = stocks.reduce((sum, s) => sum + Number(s.quantity), 0);

        if (remainingQty <= 0) return 0;

        const sortedMovements = await this.stockMovementRepository.find({
            where: {
                productId,
                organizationId,
                type: In([StockMovementType.IN, StockMovementType.ADJUSTMENT])
            },
            order: { createdAt: method === 'FIFO' ? 'DESC' : 'ASC' }
        });

        let totalValue = 0;
        let qtyToValue = remainingQty;

        for (const mvmt of sortedMovements) {
            if (qtyToValue <= 0) break;

            const takeQty = Math.min(qtyToValue, Number(mvmt.quantity));
            totalValue += takeQty * (Number(mvmt.costPrice) || 0);
            qtyToValue -= takeQty;
        }

        if (qtyToValue > 0 && sortedMovements.length > 0) {
            const lastCost = Number(sortedMovements[0].costPrice) || 0;
            totalValue += qtyToValue * lastCost;
        }

        return totalValue;
    }
}
