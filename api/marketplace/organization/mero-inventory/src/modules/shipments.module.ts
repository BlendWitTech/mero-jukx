import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Shipment } from '../entities/shipment.entity';
import { SalesOrder } from '../entities/sales-order.entity';
import { Product } from '../entities/product.entity';
import { ShipmentsService } from '../services/shipments.service';
import { ShipmentsController } from '../controllers/shipments.controller';
import { StockModule } from './stock.module';
import { AuditLogsModule } from '@audit-logs/audit-logs.module';
import { CommonModule } from '@src/common/common.module';
import { OrganizationMember } from '../../../../../src/database/entities/organization_members.entity';
import { Role } from '../../../../../src/database/entities/roles.entity';
import { MeroAccountingModule } from '../../../mero-accounting/mero-accounting.module';
import { InventoryAccountingService } from '../services/inventory-accounting.service';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            Shipment,
            SalesOrder,
            Product,
            OrganizationMember,
            Role
        ]),
        StockModule,
        AuditLogsModule,
        CommonModule,
        MeroAccountingModule,
    ],
    controllers: [ShipmentsController],
    providers: [ShipmentsService, InventoryAccountingService],
    exports: [ShipmentsService],
})
export class ShipmentsModule { }
