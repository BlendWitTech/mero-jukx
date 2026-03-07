import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CrmClient } from '@src/database/entities/crm_clients.entity';
import { CrmInvoice, CrmInvoiceItem } from '@src/database/entities/crm_invoices.entity';
import { CrmPayment } from '@src/database/entities/crm_payments.entity';
import { CrmContact } from '@src/database/entities/crm_contacts.entity';
import { OrganizationMember } from '@src/database/entities/organization_members.entity';
import { Role } from '@src/database/entities/roles.entity';
import { AuditLogsModule } from '@audit-logs/audit-logs.module';
import { CommonModule } from '@src/common/common.module';
import { ClientsController } from '../controllers/clients.controller';
import { ClientsService } from '../services/clients.service';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            CrmClient,
            CrmInvoice,
            CrmInvoiceItem,
            CrmPayment,
            CrmContact,
            OrganizationMember,
            Role,
        ]),
        AuditLogsModule,
        CommonModule,
    ],
    controllers: [ClientsController],
    providers: [ClientsService],
    exports: [ClientsService],
})
export class ClientsModule { }
