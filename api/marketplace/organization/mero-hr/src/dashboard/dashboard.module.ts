import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { HrEmployee, HrAttendance, HrLeaveRequest, HrPayroll } from '../../../../../src/database/entities';

@Module({
    imports: [TypeOrmModule.forFeature([HrEmployee, HrAttendance, HrLeaveRequest, HrPayroll])],
    controllers: [DashboardController],
    providers: [DashboardService],
})
export class DashboardModule { }
