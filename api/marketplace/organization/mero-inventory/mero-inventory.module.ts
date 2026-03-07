import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductsModule } from './src/modules/products.module';
import { WarehousesModule } from './src/modules/warehouses.module';
import { StockMovementsModule } from './src/modules/stock-movements.module';
import { StockAdjustmentsModule } from './src/modules/stock-adjustments.module';
import { SalesOrdersModule } from './src/modules/sales-orders.module';
import { ShipmentsModule } from './src/modules/shipments.module';
import { ReportsModule } from './src/modules/reports.module';
import { StockModule } from './src/modules/stock.module';

import { SuppliersController } from './src/controllers/suppliers.controller';
import { SuppliersService } from './src/services/suppliers.service';
import { PurchaseOrdersController } from './src/controllers/purchase-orders.controller';
import { PurchaseOrdersService } from './src/services/purchase-orders.service';
import { SalesOrdersController } from './src/controllers/sales-orders.controller';
import { SalesOrdersService } from './src/services/sales-orders.service';
import { ShipmentsController } from './src/controllers/shipments.controller';
import { ShipmentsService } from './src/services/shipments.service';
import { StockService } from './src/services/stock.service';

// Advanced feature controllers & services
import { SerialNumbersController } from './src/controllers/serial-numbers.controller';
import { SerialNumbersService } from './src/services/serial-numbers.service';
import { BatchLotsController } from './src/controllers/batch-lots.controller';
import { BatchLotsService } from './src/services/batch-lots.service';
import { PurchaseRequisitionsController } from './src/controllers/purchase-requisitions.controller';
import { PurchaseRequisitionsService } from './src/services/purchase-requisitions.service';
import { GRNController } from './src/controllers/grn.controller';
import { GRNService } from './src/services/grn.service';
import { BackordersController } from './src/controllers/backorders.controller';
import { BackordersService } from './src/services/backorders.service';
import { CommissionController } from './src/controllers/commission.controller';
import { CommissionService } from './src/services/commission.service';

// Entities
import { Supplier } from './src/entities/supplier.entity';
import { PurchaseOrder } from './src/entities/purchase-order.entity';
import { PurchaseOrderItem } from './src/entities/purchase-order-item.entity';
import { Stock } from './src/entities/stock.entity';
import { Product } from './src/entities/product.entity';
import { StockMovement } from './src/entities/stock-movement.entity';
import { SalesOrder } from './src/entities/sales-order.entity';
import { SalesOrderItem } from './src/entities/sales-order-item.entity';
import { Shipment } from './src/entities/shipment.entity';
import { SerialNumber } from './src/entities/serial-number.entity';
import { BatchLot } from './src/entities/batch-lot.entity';
import { PurchaseRequisition, PurchaseRequisitionItem } from './src/entities/purchase-requisition.entity';
import { GoodsReceiptNote, GRNItem } from './src/entities/goods-receipt-note.entity';
import { Backorder } from './src/entities/backorder.entity';
import { CommissionRule, CommissionRecord } from './src/entities/commission-rule.entity';

import { AuditLogsModule } from '../../../src/audit-logs/audit-logs.module';
import { CommonModule } from '../../../src/common/common.module';
import { OrganizationMember } from '../../../src/database/entities/organization_members.entity';
import { Role } from '../../../src/database/entities/roles.entity';
import { UserAppAccess, App } from '../../../src/database/entities';
import { MeroAccountingModule } from '../mero-accounting/mero-accounting.module';
import { InventoryAccountingService } from './src/services/inventory-accounting.service';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            Supplier,
            PurchaseOrder,
            PurchaseOrderItem,
            Stock,
            Product,
            StockMovement,
            SalesOrder,
            SalesOrderItem,
            Shipment,
            SerialNumber,
            BatchLot,
            PurchaseRequisition,
            PurchaseRequisitionItem,
            GoodsReceiptNote,
            GRNItem,
            Backorder,
            CommissionRule,
            CommissionRecord,
            OrganizationMember,
            Role,
            UserAppAccess,
            App,
        ]),
        AuditLogsModule,
        CommonModule,
        MeroAccountingModule,
        ProductsModule,
        WarehousesModule,
        StockMovementsModule,
        StockAdjustmentsModule,
        SalesOrdersModule,
        ShipmentsModule,
        ReportsModule,
        StockModule,
    ],
    controllers: [
        SuppliersController,
        PurchaseOrdersController,
        SerialNumbersController,
        BatchLotsController,
        PurchaseRequisitionsController,
        GRNController,
        BackordersController,
        CommissionController,
    ],
    providers: [
        SuppliersService,
        PurchaseOrdersService,
        StockService,
        SerialNumbersService,
        BatchLotsService,
        PurchaseRequisitionsService,
        GRNService,
        BackordersService,
        CommissionService,
        InventoryAccountingService,
    ],
    exports: [
        SuppliersService,
        PurchaseOrdersService,
        SalesOrdersModule,
        ShipmentsModule,
        StockService,
        SerialNumbersService,
        BatchLotsService,
    ],
})
export class MeroInventoryModule { }
