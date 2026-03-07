import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ImportService } from '../services/import.service';
import { DuplicateDetectionService } from '../services/duplicate-detection.service';
import { CrmLead } from '@src/database/entities/crm_leads.entity';
import { CrmClient } from '@src/database/entities/crm_clients.entity';

import { ImportController } from '../controllers/import.controller';
import { DuplicateController } from '../controllers/duplicate.controller';
import { CommonModule } from '../../../../../src/common/common.module';

@Module({
    imports: [
        CommonModule,
        TypeOrmModule.forFeature([CrmLead, CrmClient]),
    ],
    controllers: [ImportController, DuplicateController],
    providers: [ImportService, DuplicateDetectionService],
    exports: [ImportService, DuplicateDetectionService],
})
export class CrmUtilityModule { }
