import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HrTrainingProgram } from '../../../../../src/database/entities/hr_training_programs.entity';
import { TrainingService } from './training.service';
import { TrainingController } from './training.controller';
import { CommonModule } from '../../../../../src/common/common.module';

@Module({
    imports: [TypeOrmModule.forFeature([HrTrainingProgram]), CommonModule],
    controllers: [TrainingController],
    providers: [TrainingService],
    exports: [TrainingService],
})
export class TrainingModule { }
