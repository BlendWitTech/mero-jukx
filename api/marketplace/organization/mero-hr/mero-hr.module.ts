import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
    HrEmployee, HrAttendance, HrLeaveRequest, HrPayroll,
    HrDepartment, HrDesignation, HrDocument,
    HrShift, HrPublicHoliday, HrLeaveBalance,
    HrJobOpening, HrCandidate,
    HrPerformanceGoal, HrPerformanceReview,
    HrTrainingProgram,
    HrExitRecord,
} from '../../../src/database/entities';
import { EmployeesModule } from './src/employees/employees.module';
import { AttendanceModule } from './src/attendance/attendance.module';
import { LeaveModule } from './src/leave/leave.module';
import { PayrollModule } from './src/payroll/payroll.module';
import { DepartmentsModule } from './src/departments/departments.module';
import { DesignationsModule } from './src/designations/designations.module';
import { DocumentsModule } from './src/documents/documents.module';
import { ShiftModule } from './src/shifts/shift.module';
import { PublicHolidayModule } from './src/holidays/public-holiday.module';
import { RecruitmentModule } from './src/recruitment/recruitment.module';
import { PerformanceModule } from './src/performance/performance.module';
import { TrainingModule } from './src/training/training.module';
import { ExitModule } from './src/exit/exit.module';
import { DashboardModule } from './src/dashboard/dashboard.module';
import { MeroAccountingModule } from '../mero-accounting/mero-accounting.module';
@Module({
    imports: [
        TypeOrmModule.forFeature([
            HrEmployee, HrAttendance, HrLeaveRequest, HrPayroll,
            HrDepartment, HrDesignation, HrDocument,
            HrShift, HrPublicHoliday, HrLeaveBalance,
            HrJobOpening, HrCandidate,
            HrPerformanceGoal, HrPerformanceReview,
            HrTrainingProgram,
            HrExitRecord,
        ]),
        EmployeesModule,
        AttendanceModule,
        LeaveModule,
        PayrollModule,
        DepartmentsModule,
        DesignationsModule,
        DocumentsModule,
        ShiftModule,
        PublicHolidayModule,
        RecruitmentModule,
        PerformanceModule,
        TrainingModule,
        ExitModule,
        DashboardModule,
        MeroAccountingModule,
    ],
    controllers: [],
    providers: [],
    exports: [TypeOrmModule],
})
export class MeroHrModule { }
