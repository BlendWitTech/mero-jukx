import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HrLeaveRequest, HrLeaveBalance, HrEmployee } from '../../../../../src/database/entities';
import { CreateLeaveRequestDto } from './dto/create-leave-request.dto';

@Injectable()
export class LeaveService {
    constructor(
        @InjectRepository(HrLeaveRequest)
        private readonly leaveRepository: Repository<HrLeaveRequest>,
        @InjectRepository(HrLeaveBalance)
        private readonly balanceRepository: Repository<HrLeaveBalance>,
        @InjectRepository(HrEmployee)
        private readonly employeeRepository: Repository<HrEmployee>,
    ) { }

    private getCurrentFiscalYear(): string {
        const now = new Date();
        const month = now.getMonth() + 1; // 1-12
        const year = now.getFullYear();
        // Nepal fiscal year: Shrawan (mid-July) to Ashadh (mid-July)
        // Approx: Aug-Dec → FY starts current year; Jan-Jul → FY started previous year
        if (month >= 8) {
            return `${year}/${(year + 1).toString().slice(-2)}`;
        } else {
            return `${year - 1}/${year.toString().slice(-2)}`;
        }
    }

    async getOrCreateBalance(
        organizationId: string,
        employeeId: string,
        leaveType: string,
    ): Promise<HrLeaveBalance> {
        const fiscalYear = this.getCurrentFiscalYear();
        let balance = await this.balanceRepository.findOne({
            where: { organizationId, employeeId, leave_type: leaveType, fiscal_year: fiscalYear },
        });

        if (!balance) {
            // Default entitlements per Nepal labour law
            const defaultEntitlements: Record<string, number> = {
                SICK: 12,
                CASUAL: 6,
                ANNUAL: 18,
                MATERNITY: 98,
                PATERNITY: 15,
                UNPAID: 0,
                OTHER: 0,
            };
            balance = this.balanceRepository.create({
                organizationId,
                employeeId,
                leave_type: leaveType,
                fiscal_year: fiscalYear,
                entitled_days: defaultEntitlements[leaveType] ?? 0,
                used_days: 0,
                carried_forward: 0,
            });
            await this.balanceRepository.save(balance);
        }

        return balance;
    }

    async create(organizationId: string, employeeId: string, dto: CreateLeaveRequestDto): Promise<HrLeaveRequest> {
        // Check balance availability (skip for UNPAID)
        if (dto.leave_type !== 'UNPAID') {
            const balance = await this.getOrCreateBalance(organizationId, employeeId, dto.leave_type);
            const remaining = Number(balance.entitled_days) + Number(balance.carried_forward) - Number(balance.used_days);
            if (remaining < Number(dto.total_days)) {
                throw new BadRequestException(
                    `Insufficient ${dto.leave_type} leave balance. Available: ${remaining} day(s), Requested: ${dto.total_days} day(s)`
                );
            }
        }

        const leave = this.leaveRepository.create({
            ...dto,
            organizationId,
            employeeId,
            status: 'PENDING',
        });
        return await this.leaveRepository.save(leave);
    }

    async findAll(organizationId: string, employeeId?: string): Promise<HrLeaveRequest[]> {
        const where: any = { organizationId };
        if (employeeId) where.employeeId = employeeId;

        return await this.leaveRepository.find({
            where,
            order: { start_date: 'DESC' },
            relations: ['employee'],
        });
    }

    async getBalances(organizationId: string, employeeId: string): Promise<HrLeaveBalance[]> {
        return await this.balanceRepository.find({
            where: { organizationId, employeeId, fiscal_year: this.getCurrentFiscalYear() },
        });
    }

    async getBalancesByUserId(organizationId: string, userId: string): Promise<HrLeaveBalance[]> {
        const employee = await this.employeeRepository.findOne({ where: { organizationId, userId } });
        if (!employee) throw new NotFoundException('Employee record not found for user');
        return this.getBalances(organizationId, employee.id);
    }

    async approve(organizationId: string, id: string, adminId: string, remarks?: string): Promise<HrLeaveRequest> {
        const leave = await this.leaveRepository.findOne({ where: { id, organizationId } });
        if (!leave) throw new NotFoundException('Leave request not found');
        if (leave.status !== 'PENDING') throw new BadRequestException('Only pending leaves can be approved');

        leave.status = 'APPROVED';
        leave.approvedById = adminId;
        if (remarks) leave.admin_remarks = remarks;

        const saved = await this.leaveRepository.save(leave);

        // Deduct from balance
        if (leave.leave_type !== 'UNPAID') {
            const balance = await this.getOrCreateBalance(organizationId, leave.employeeId, leave.leave_type);
            balance.used_days = Number(balance.used_days) + Number(leave.total_days);
            await this.balanceRepository.save(balance);
        }

        return saved;
    }

    async reject(organizationId: string, id: string, adminId: string, remarks: string): Promise<HrLeaveRequest> {
        const leave = await this.leaveRepository.findOne({ where: { id, organizationId } });
        if (!leave) throw new NotFoundException('Leave request not found');

        leave.status = 'REJECTED';
        leave.approvedById = adminId;
        leave.admin_remarks = remarks;

        return await this.leaveRepository.save(leave);
    }
}
