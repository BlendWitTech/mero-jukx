import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CrmAutomationService } from '../services/automation.service';
import { CrmLead } from '@src/database/entities/crm_leads.entity';
import { CrmActivity } from '@src/database/entities/crm_activities.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([CrmLead, CrmActivity]),
    ],
    providers: [CrmAutomationService],
    exports: [CrmAutomationService],
})
export class CrmAutomationModule { }
