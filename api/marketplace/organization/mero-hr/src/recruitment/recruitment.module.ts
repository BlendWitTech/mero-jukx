import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HrJobOpening } from '../../../../../src/database/entities/hr_job_openings.entity';
import { HrCandidate } from '../../../../../src/database/entities/hr_candidates.entity';
import { RecruitmentService } from './recruitment.service';
import { RecruitmentController } from './recruitment.controller';
import { CommonModule } from '../../../../../src/common/common.module';

@Module({
    imports: [TypeOrmModule.forFeature([HrJobOpening, HrCandidate]), CommonModule],
    controllers: [RecruitmentController],
    providers: [RecruitmentService],
    exports: [RecruitmentService],
})
export class RecruitmentModule { }
