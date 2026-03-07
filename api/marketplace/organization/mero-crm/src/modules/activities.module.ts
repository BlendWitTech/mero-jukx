import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActivitiesService } from '../services/activities.service';
import { ActivitiesController } from '../controllers/activities.controller';
import { CrmActivity } from '@src/database/entities/crm_activities.entity';
import { CrmLead } from '@src/database/entities/crm_leads.entity';
import { OrganizationMember } from '@src/database/entities/organization_members.entity';
import { Role } from '@src/database/entities/roles.entity';
import { AuditLogsModule } from '@audit-logs/audit-logs.module';
import { CommonModule } from '@src/common/common.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([CrmActivity, CrmLead]),
        AuditLogsModule,
        CommonModule
    ],
    controllers: [ActivitiesController],
    providers: [ActivitiesService],
    exports: [ActivitiesService],
})
export class ActivitiesModule { }
