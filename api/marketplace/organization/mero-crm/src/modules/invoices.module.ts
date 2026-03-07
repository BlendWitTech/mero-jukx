import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CrmInvoice, CrmInvoiceItem } from '@src/database/entities/crm_invoices.entity';
import { OrganizationMember } from '@src/database/entities/organization_members.entity';
import { Role } from '@src/database/entities/roles.entity';
import { AuditLogsModule } from '@audit-logs/audit-logs.module';
import { CommonModule } from '@src/common/common.module';
import { InvoicesController } from '../controllers/invoices.controller';
import { InvoicesService } from '../services/invoices.service';
import { SalesOrdersModule } from '../../../mero-inventory/src/modules/sales-orders.module';
import { MeroAccountingModule } from '../../../mero-accounting/mero-accounting.module';
import { CommunicationModule } from '../../../../../src/communication/communication.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([CrmInvoice, CrmInvoiceItem, OrganizationMember, Role]),
        AuditLogsModule,
        CommonModule,
        SalesOrdersModule,
        MeroAccountingModule,
        CommunicationModule,
    ],
    controllers: [InvoicesController],
    providers: [InvoicesService],
    exports: [InvoicesService],
})
export class InvoicesModule { }
