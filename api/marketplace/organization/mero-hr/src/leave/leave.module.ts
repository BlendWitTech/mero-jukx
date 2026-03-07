import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HrLeaveRequest, HrEmployee, HrLeaveBalance } from '../../../../../src/database/entities';
import { LeaveService } from './leave.service';
import { LeaveController } from './leave.controller';
import { CommonModule } from '../../../../../src/common/common.module';

@Module({
    imports: [TypeOrmModule.forFeature([HrLeaveRequest, HrEmployee, HrLeaveBalance]), CommonModule],
    controllers: [LeaveController],
    providers: [LeaveService],
    exports: [LeaveService],
})
export class LeaveModule { }
