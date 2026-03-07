import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HrExitRecord } from '../../../../../src/database/entities/hr_exit_records.entity';
import { ExitService } from './exit.service';
import { ExitController } from './exit.controller';
import { CommonModule } from '../../../../../src/common/common.module';

@Module({
    imports: [TypeOrmModule.forFeature([HrExitRecord]), CommonModule],
    controllers: [ExitController],
    providers: [ExitService],
    exports: [ExitService],
})
export class ExitModule { }
