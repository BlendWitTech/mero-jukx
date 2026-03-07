import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HrAttendance, HrEmployee } from '../../../../../src/database/entities';
import { CreateAttendanceDto } from './dto/create-attendance.dto';

@Injectable()
export class AttendanceService {
    constructor(
        @InjectRepository(HrAttendance)
        private readonly attendanceRepository: Repository<HrAttendance>,
        @InjectRepository(HrEmployee)
        private readonly employeeRepository: Repository<HrEmployee>,
    ) { }

    async checkIn(organizationId: string, userId: string, employeeIdParam?: string, location?: string, remarks?: string): Promise<HrAttendance> {
        let employeeId = employeeIdParam;
        if (!employeeId) {
            const employee = await this.employeeRepository.findOne({ where: { organizationId, userId } });
            if (!employee) throw new BadRequestException('Employee record not found for user');
            employeeId = employee.id;
        }

        const today = new Date().toISOString().split('T')[0];

        // Check if already checked in today
        const existing = await this.attendanceRepository.findOne({
            where: { organizationId, employeeId, date: today as any },
        });

        if (existing && existing.check_in) {
            throw new BadRequestException('Already checked in for today');
        }

        const attendance = existing || this.attendanceRepository.create({
            organizationId,
            employeeId,
            date: today as any,
            status: 'PRESENT',
        });

        attendance.check_in = new Date();
        if (location) attendance.location = location;
        if (remarks) attendance.remarks = remarks;

        return await this.attendanceRepository.save(attendance);
    }

    async checkOut(organizationId: string, userId: string, employeeIdParam?: string, remarks?: string): Promise<HrAttendance> {
        let employeeId = employeeIdParam;
        if (!employeeId) {
            const employee = await this.employeeRepository.findOne({ where: { organizationId, userId } });
            if (!employee) throw new BadRequestException('Employee record not found for user');
            employeeId = employee.id;
        }

        const today = new Date().toISOString().split('T')[0];

        const attendance = await this.attendanceRepository.findOne({
            where: { organizationId, employeeId, date: today as any },
        });

        if (!attendance || !attendance.check_in) {
            throw new BadRequestException('Must check in before checking out');
        }

        if (attendance.check_out) {
            throw new BadRequestException('Already checked out for today');
        }

        attendance.check_out = new Date();
        return await this.attendanceRepository.save(attendance);
    }

    async findAll(organizationId: string, employeeId?: string): Promise<HrAttendance[]> {
        const query = { organizationId };
        if (employeeId) query['employeeId'] = employeeId;

        return await this.attendanceRepository.find({
            where: query,
            order: { date: 'DESC' },
            relations: ['employee'],
        });
    }

    async findMy(organizationId: string, userId: string, startDate?: string, endDate?: string): Promise<HrAttendance[]> {
        const employee = await this.employeeRepository.findOne({ where: { organizationId, userId } });
        if (!employee) throw new BadRequestException('Employee record not found for user');

        let queryBuilder = this.attendanceRepository.createQueryBuilder('attendance')
            .where('attendance.organizationId = :organizationId', { organizationId })
            .andWhere('attendance.employeeId = :employeeId', { employeeId: employee.id })
            .leftJoinAndSelect('attendance.employee', 'employee');

        if (startDate) {
            queryBuilder = queryBuilder.andWhere('attendance.date >= :startDate', { startDate });
        }
        if (endDate) {
            queryBuilder = queryBuilder.andWhere('attendance.date <= :endDate', { endDate });
        }

        return await queryBuilder.orderBy('attendance.date', 'DESC').getMany();
    }
}
