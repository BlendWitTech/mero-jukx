import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Shipment, ShipmentStatus } from '../entities/shipment.entity';
import { SalesOrder, SalesOrderStatus } from '../entities/sales-order.entity';
import { StockService } from './stock.service';
import { StockMovementType } from '../entities/stock-movement.entity';
import { AuditLogsService } from '../../../../../src/audit-logs/audit-logs.service';
import { InventoryAccountingService } from './inventory-accounting.service';

@Injectable()
export class ShipmentsService {
    constructor(
        @InjectRepository(Shipment)
        private shipmentRepository: Repository<Shipment>,
        @InjectRepository(SalesOrder)
        private salesOrderRepository: Repository<SalesOrder>,
        private stockService: StockService,
        private auditLogService: AuditLogsService,
        private readonly inventoryAccountingService: InventoryAccountingService,
    ) { }

    async create(salesOrderId: string, organizationId: string, userId: string, data: any): Promise<Shipment> {
        const salesOrder = await this.salesOrderRepository.findOne({
            where: { id: salesOrderId, organization_id: organizationId },
            relations: ['items'],
        });

        if (!salesOrder) {
            throw new NotFoundException('Sales Order not found');
        }

        if (salesOrder.status !== SalesOrderStatus.CONFIRMED && salesOrder.status !== SalesOrderStatus.DRAFT) {
            // Depending on business logic, maybe only confirmed orders can be shipped.
            // allowing DRAFT for flexibility but ideally should be CONFIRMED.
        }

        // Generate Shipment Number
        const count = await this.shipmentRepository.count({ where: { sales_order: { organization_id: organizationId } } });
        // Note: Relation based count might be tricky without explicit query builder or relation load.
        // Simplified approach: just random string or better logic
        const shipmentNumber = `SH-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;

        const shipment = this.shipmentRepository.create({
            shipment_number: shipmentNumber,
            sales_order_id: salesOrderId,
            created_by: userId,
            status: ShipmentStatus.PENDING,
        });

        const savedShipment = await this.shipmentRepository.save(shipment);

        // Deduct Stock
        if (data.warehouseId) {
            for (const item of salesOrder.items) {
                await this.stockService.adjustStock(
                    item.product_id,
                    data.warehouseId,
                    Number(item.quantity),
                    StockMovementType.OUT,
                    `Shipped for Order #${salesOrder.order_number}`,
                    savedShipment.id,
                    userId,
                    organizationId
                );
            }

            // Post COGS to accounting as DRAFT journal entry (non-blocking)
            await this.inventoryAccountingService.postShipmentCogsToAccounting(
                salesOrder.items,
                savedShipment,
                organizationId,
                userId,
            );
        }

        // Update Sales Order Status
        salesOrder.status = SalesOrderStatus.SHIPPED;
        await this.salesOrderRepository.save(salesOrder);

        await this.auditLogService.createAuditLog(
            organizationId,
            userId,
            'CREATE_SHIPMENT',
            'SHIPMENT',
            savedShipment.id,
            null,
            savedShipment,
            undefined,
            undefined,
            { shipmentNumber: savedShipment.shipment_number, salesOrderNumber: salesOrder.order_number }
        );

        return savedShipment;
    }

    async findAll(organizationId: string): Promise<Shipment[]> {
        return this.shipmentRepository.find({
            where: { sales_order: { organization_id: organizationId } },
            relations: ['sales_order', 'creator'],
            order: { created_at: 'DESC' },
        });
    }

    async findOne(id: string, organizationId: string): Promise<Shipment> {
        // Verify org via sales order relation
        const shipment = await this.shipmentRepository.findOne({
            where: { id },
            relations: ['sales_order', 'creator'],
        });

        if (!shipment) throw new NotFoundException('Shipment not found');
        if (shipment.sales_order.organization_id !== organizationId) throw new NotFoundException('Shipment not found');

        return shipment;
    }

    async updateStatus(id: string, status: ShipmentStatus, organizationId: string, userId: string): Promise<Shipment> {
        const shipment = await this.findOne(id, organizationId);
        shipment.status = status;
        if (status === ShipmentStatus.SHIPPED) {
            shipment.shipped_date = new Date();
        } else if (status === ShipmentStatus.DELIVERED) {
            shipment.delivered_date = new Date();
            // Update Sales Order to DELIVERED?
            const so = await this.salesOrderRepository.findOne({ where: { id: shipment.sales_order_id } });
            if (so) {
                so.status = SalesOrderStatus.DELIVERED;
                await this.salesOrderRepository.save(so);
            }
        }

        return this.shipmentRepository.save(shipment);
    }
}
