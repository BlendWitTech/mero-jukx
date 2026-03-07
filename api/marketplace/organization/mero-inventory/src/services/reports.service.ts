import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Stock } from '../entities/stock.entity';
import { StockMovement } from '../entities/stock-movement.entity';
import { Product } from '../entities/product.entity';
import { Warehouse } from '../entities/warehouse.entity';

@Injectable()
export class ReportsService {
    constructor(
        @InjectRepository(Stock)
        private stockRepository: Repository<Stock>,
        @InjectRepository(StockMovement)
        private stockMovementRepository: Repository<StockMovement>,
        @InjectRepository(Product)
        private productRepository: Repository<Product>,
        @InjectRepository(Warehouse)
        private warehouseRepository: Repository<Warehouse>,
    ) { }

    async getDashboardStats(organizationId: string): Promise<any> {
        const [
            totalProducts,
            totalWarehouses,
            lowStockItems,
            valuation
        ] = await Promise.all([
            this.productRepository.count({ where: { organization_id: organizationId } }),
            this.warehouseRepository.count({ where: { organization_id: organizationId } }),
            this.getLowStockAlerts(organizationId).then(items => items.length),
            this.getStockValuation(organizationId).then(val => val.totalValuation)
        ]);

        return {
            totalProducts,
            totalWarehouses,
            lowStockItems,
            totalStockValue: valuation
        };
    }

    async getStockValuation(organizationId: string): Promise<any> {
        const stocks = await this.stockRepository.find({
            where: { warehouse: { organization_id: organizationId } },
            relations: ['product', 'warehouse'],
        });

        let totalValuation = 0;
        const warehouseValuation = {};

        for (const stock of stocks) {
            const unitCost = Number(stock.product.cost_price) || 0;
            const value = Number(stock.quantity) * unitCost;
            totalValuation += value;

            if (!warehouseValuation[stock.warehouse.name]) {
                warehouseValuation[stock.warehouse.name] = 0;
            }
            warehouseValuation[stock.warehouse.name] += value;
        }

        return {
            totalValuation: Math.round(totalValuation * 100) / 100,
            warehouseValuation,
            breakdown: stocks.map(s => ({
                product: s.product.name,
                warehouse: s.warehouse.name,
                quantity: s.quantity,
                unitCost: Number(s.product.cost_price) || 0,
                totalValue: Math.round(Number(s.quantity) * (Number(s.product.cost_price) || 0) * 100) / 100
            }))
        };
    }

    async getLowStockAlerts(organizationId: string): Promise<any[]> {
        // Find stocks where current quantity is less than product's min_stock_level
        const lowStocks = await this.stockRepository.createQueryBuilder('stock')
            .leftJoinAndSelect('stock.product', 'product')
            .leftJoinAndSelect('stock.warehouse', 'warehouse')
            .where('warehouse.organization_id = :orgId', { orgId: organizationId })
            .andWhere('stock.quantity <= product.min_stock_level')
            .getMany();

        return lowStocks.map(s => ({
            productId: s.productId,
            productName: s.product.name,
            warehouseName: s.warehouse.name,
            currentStock: s.quantity,
            minLevel: s.product.min_stock_level,
            reorderLevel: s.product.reorder_level
        }));
    }

    async getStockMovementHistory(organizationId: string, limit: number = 50): Promise<StockMovement[]> {
        return this.stockMovementRepository.find({
            where: { organizationId: organizationId },
            relations: ['product', 'warehouse', 'createdBy'],
            order: { createdAt: 'DESC' },
            take: limit,
        });
    }

    async getAgingAnalysis(organizationId: string, thresholdDays = 90): Promise<any[]> {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - thresholdDays);

        const stocks = await this.stockRepository.find({
            where: { warehouse: { organization_id: organizationId } },
            relations: ['product', 'warehouse'],
        });

        const results: any[] = [];
        for (const stock of stocks) {
            if (Number(stock.quantity) <= 0) continue;

            const lastMovement = await this.stockMovementRepository.findOne({
                where: { product_id: stock.productId } as any,
                order: { createdAt: 'DESC' },
            });

            const lastMovedDate = lastMovement ? lastMovement.createdAt : stock.created_at as any;
            const daysSinceMovement = Math.floor(
                (Date.now() - new Date(lastMovedDate).getTime()) / (1000 * 60 * 60 * 24)
            );

            if (daysSinceMovement >= thresholdDays) {
                results.push({
                    productId: stock.productId,
                    productName: stock.product?.name || 'Unknown',
                    sku: stock.product?.sku || '',
                    category: stock.product?.category || '',
                    warehouseName: stock.warehouse?.name || '',
                    currentStock: stock.quantity,
                    unitCost: Number(stock.product?.cost_price) || 0,
                    stockValue: Number(stock.quantity) * (Number(stock.product?.cost_price) || 0),
                    daysSinceLastMovement: daysSinceMovement,
                    lastMovedDate: lastMovedDate,
                    classification: daysSinceMovement >= 365 ? 'dead'
                        : daysSinceMovement >= 180 ? 'slow'
                        : 'aging',
                });
            }
        }

        return results.sort((a, b) => b.daysSinceLastMovement - a.daysSinceLastMovement);
    }

    async getExpiringProducts(organizationId: string, daysAhead: number = 30): Promise<any[]> {
        const today = new Date();
        const cutoff = new Date();
        cutoff.setDate(today.getDate() + daysAhead);

        const products = await this.productRepository
            .createQueryBuilder('p')
            .where('p.organization_id = :orgId', { orgId: organizationId })
            .andWhere('p.track_expiry = true')
            .andWhere('p.expiry_date IS NOT NULL')
            .andWhere('p.deleted_at IS NULL')
            .getMany();

        return products
            .filter(p => new Date(p.expiry_date!) <= cutoff)
            .map(p => {
                const expiry = new Date(p.expiry_date!);
                const daysUntilExpiry = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                return {
                    productId: p.id,
                    productName: p.name,
                    sku: p.sku,
                    category: p.category,
                    expiryDate: p.expiry_date,
                    daysUntilExpiry,
                    status: daysUntilExpiry < 0 ? 'EXPIRED' : daysUntilExpiry <= 7 ? 'CRITICAL' : 'WARNING',
                    alertDays: p.expiry_alert_days,
                };
            })
            .sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);
    }
}
