import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DealsService } from '../services/deals.service';
import { DealsController } from '../controllers/deals.controller';
import { CrmDeal } from '@src/database/entities/crm_deals.entity';
import { CrmPipeline } from '@src/database/entities/crm_pipelines.entity';
import { CrmStage } from '@src/database/entities/crm_stages.entity';
import { OrganizationMember } from '@src/database/entities/organization_members.entity';
import { Role } from '@src/database/entities/roles.entity';
import { AuditLogsModule } from '@audit-logs/audit-logs.module';
import { CommonModule } from '@src/common/common.module';

import { CrmDealItem } from '@src/database/entities/crm_deal_items.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            CrmDeal,
            CrmPipeline,
            CrmStage,
            OrganizationMember,
            Role,
            CrmDealItem,
        ]),
        AuditLogsModule,
        CommonModule
    ],
    controllers: [DealsController],
    providers: [DealsService],
    exports: [DealsService],
})
export class DealsModule { }
