import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HrAttendance, HrEmployee } from '../../../../../src/database/entities';
import { AttendanceService } from './attendance.service';
import { AttendanceController } from './attendance.controller';
import { CommonModule } from '../../../../../src/common/common.module';

@Module({
    imports: [TypeOrmModule.forFeature([HrAttendance, HrEmployee]), CommonModule],
    controllers: [AttendanceController],
    providers: [AttendanceService],
    exports: [AttendanceService],
})
export class AttendanceModule { }
