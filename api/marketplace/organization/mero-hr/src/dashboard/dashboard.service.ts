import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HrEmployee, HrAttendance, HrLeaveRequest, HrPayroll } from '../../../../../src/database/entities';

@Injectable()
export class DashboardService {
    constructor(
        @InjectRepository(HrEmployee) private readonly employeeRepo: Repository<HrEmployee>,
        @InjectRepository(HrAttendance) private readonly attendanceRepo: Repository<HrAttendance>,
        @InjectRepository(HrLeaveRequest) private readonly leaveRepo: Repository<HrLeaveRequest>,
        @InjectRepository(HrPayroll) private readonly payrollRepo: Repository<HrPayroll>,
    ) { }

    async getDashboardStats(organizationId: string) {
        const today = new Date().toISOString().split('T')[0];

        const totalEmployees = await this.employeeRepo.count({
            where: { organizationId, status: 'ACTIVE' },
        });

        const presentToday = await this.attendanceRepo.createQueryBuilder('attendance')
            .where('attendance.organization_id = :orgId', { orgId: organizationId })
            .andWhere('attendance.date = :today', { today })
            .andWhere('attendance.status IN (:...statuses)', { statuses: ['PRESENT', 'LATE'] })
            .getCount();

        const onLeave = await this.leaveRepo.createQueryBuilder('leave')
            .where('leave.organization_id = :orgId', { orgId: organizationId })
            .andWhere('leave.status = :status', { status: 'APPROVED' })
            .andWhere(':today >= leave.start_date AND :today <= leave.end_date', { today })
            .getCount();

        const pendingPayroll = await this.payrollRepo.count({
            where: { organizationId, status: 'DRAFT' },
        });

        const pendingLeaveRequests = await this.leaveRepo.count({
            where: { organizationId, status: 'PENDING' },
        });

        const recentAttendance = await this.attendanceRepo.find({
            where: { organizationId },
            relations: ['employee'],
            order: { createdAt: 'DESC' },
            take: 5,
        });

        return {
            totalEmployees,
            presentToday,
            onLeave,
            pendingPayroll,
            pendingLeaveRequests,
            recentAttendance,
        };
    }
}
