import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyticsService } from '../services/analytics.service';
import { AnalyticsController } from '../controllers/analytics.controller';
import { CrmLead } from '@src/database/entities/crm_leads.entity';
import { CrmDeal } from '@src/database/entities/crm_deals.entity';
import { CrmActivity } from '@src/database/entities/crm_activities.entity';
import { AuditLogsModule } from '@audit-logs/audit-logs.module';
import { CommonModule } from '@src/common/common.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([CrmLead, CrmDeal, CrmActivity]),
        AuditLogsModule,
        CommonModule
    ],
    controllers: [AnalyticsController],
    providers: [AnalyticsService],
    exports: [AnalyticsService],
})
export class AnalyticsModule { }
