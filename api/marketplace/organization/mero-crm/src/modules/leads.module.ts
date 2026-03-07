import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LeadsService } from '../services/leads.service';
import { LeadsController } from '../controllers/leads.controller';
import { CrmLead } from '@src/database/entities/crm_leads.entity';
import { CrmClient } from '@src/database/entities/crm_clients.entity';
import { CrmContact } from '@src/database/entities/crm_contacts.entity';
import { OrganizationMember } from '@src/database/entities/organization_members.entity';
import { CrmActivity } from '@src/database/entities/crm_activities.entity';
import { Role } from '@src/database/entities/roles.entity';
import { AuditLogsModule } from '@src/audit-logs/audit-logs.module';
import { CommonModule } from '@src/common/common.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([CrmLead, CrmClient, CrmContact, OrganizationMember, Role, CrmActivity]),
        AuditLogsModule,
        CommonModule
    ],
    controllers: [LeadsController],
    providers: [LeadsService],
    exports: [LeadsService],
})
export class LeadsModule { }
