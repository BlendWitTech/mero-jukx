import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HrPerformanceGoal } from '../../../../../src/database/entities/hr_performance_goals.entity';
import { HrPerformanceReview } from '../../../../../src/database/entities/hr_performance_reviews.entity';
import { PerformanceService } from './performance.service';
import { PerformanceController } from './performance.controller';
import { CommonModule } from '../../../../../src/common/common.module';

@Module({
    imports: [TypeOrmModule.forFeature([HrPerformanceGoal, HrPerformanceReview]), CommonModule],
    controllers: [PerformanceController],
    providers: [PerformanceService],
    exports: [PerformanceService],
})
export class PerformanceModule { }
