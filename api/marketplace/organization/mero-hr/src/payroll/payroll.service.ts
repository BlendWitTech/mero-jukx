import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HrPayroll, HrEmployee } from '../../../../../src/database/entities';
import { PayrollCalculationEngine } from './payroll-calculation.engine';
import { HrAccountingService } from './hr-accounting.service';

@Injectable()
export class PayrollService {
    constructor(
        @InjectRepository(HrPayroll)
        private readonly payrollRepository: Repository<HrPayroll>,
        @InjectRepository(HrEmployee)
        private readonly employeeRepository: Repository<HrEmployee>,
        private readonly calculationEngine: PayrollCalculationEngine,
        private readonly accountingService: HrAccountingService,
    ) { }

    async generateMonthlyPayroll(organizationId: string, month: string): Promise<HrPayroll[]> {
        const employees = await this.employeeRepository.find({
            where: { organizationId, status: 'ACTIVE' },
        });

        const payrolls: HrPayroll[] = [];

        for (const employee of employees) {
            // Simplified logic for allowances and CIT for now - can be expanded to UI inputs
            const monthlyAllowances = 0;
            const monthlyCIT = 0;
            const isDashainMonth = month.toLowerCase().includes('october') || month.toLowerCase().includes('september');
            const bonus = isDashainMonth ? Number(employee.base_salary) : 0;

            const result = this.calculationEngine.calculateNetSalary(
                Number(employee.base_salary),
                monthlyAllowances,
                bonus,
                monthlyCIT,
                0, // other deductions
                (employee.marital_status as 'SINGLE' | 'MARRIED') || 'SINGLE'
            );

            const payroll = this.payrollRepository.create({
                organizationId,
                employeeId: employee.id,
                month,
                basic_salary: employee.base_salary,
                allowances: monthlyAllowances,
                overtime: 0,
                bonus: bonus,
                ssf_contribution_employee: result.ssfEmployee,
                ssf_contribution_employer: result.ssfEmployer,
                cit_contribution: monthlyCIT,
                income_tax: result.incomeTax,
                loan_deduction: 0,
                advance_deduction: 0,
                other_deductions: 0,
                net_salary: result.netSalary,
                status: 'DRAFT',
                period_start: new Date(), // TODO: Better date derivation from month string
                period_end: new Date(),
            });

            payrolls.push(await this.payrollRepository.save(payroll));
        }

        return payrolls;
    }

    async findByMonth(organizationId: string, month: string): Promise<HrPayroll[]> {
        return await this.payrollRepository.find({
            where: { organizationId, month },
            relations: ['employee'],
        });
    }

    async getMyPayrolls(organizationId: string, userId: string): Promise<HrPayroll[]> {
        const employee = await this.employeeRepository.findOne({ where: { organizationId, userId } });
        if (!employee) throw new NotFoundException('Employee record not found for user');

        return await this.payrollRepository.find({
            where: { organizationId, employeeId: employee.id },
            order: { period_start: 'DESC' },
            relations: ['employee', 'employee.departmentRel', 'employee.designationRel'],
        });
    }

    async getPayrollById(organizationId: string, id: string): Promise<HrPayroll> {
        const payroll = await this.payrollRepository.findOne({
            where: { id, organizationId },
            relations: ['employee', 'employee.departmentRel', 'employee.designationRel'],
        });

        if (!payroll) {
            throw new NotFoundException('Payroll record not found');
        }

        return payroll;
    }

    async postToAccounting(organizationId: string, userId: string, payrollIds: string[]) {
        return await this.accountingService.postPayrollToAccounting(organizationId, userId, payrollIds);
    }

    async generateBankFile(organizationId: string, month: string): Promise<{ rows: any[]; csv: string }> {
        const payrolls = await this.payrollRepository.find({
            where: { organizationId, month },
            relations: ['employee'],
        });

        const rows = payrolls.map(p => ({
            employee_name: `${p.employee?.first_name ?? ''} ${p.employee?.last_name ?? ''}`.trim(),
            bank_name: (p.employee?.bank_details as any)?.bank_name ?? '',
            account_number: (p.employee?.bank_details as any)?.account_number ?? '',
            branch: (p.employee?.bank_details as any)?.branch ?? '',
            net_salary: Number(p.net_salary),
            month,
        }));

        const header = 'Employee Name,Bank Name,Account Number,Branch,Net Salary (NPR),Month\n';
        const body = rows.map(r =>
            `"${r.employee_name}","${r.bank_name}","${r.account_number}","${r.branch}",${r.net_salary},"${r.month}"`
        ).join('\n');

        return { rows, csv: header + body };
    }

    async getGratuityReport(organizationId: string): Promise<any[]> {
        const employees = await this.employeeRepository.find({
            where: { organizationId, status: 'ACTIVE' },
        });

        const today = new Date();

        return employees.map(emp => {
            const joinDate = emp.joining_date ? new Date(emp.joining_date) : today;
            const diffMs = today.getTime() - joinDate.getTime();
            const yearsOfService = diffMs / (1000 * 60 * 60 * 24 * 365.25);
            const monthsOfService = yearsOfService * 12;
            const basicMonthly = Number(emp.base_salary) || 0;
            const annualBasic = basicMonthly * 12;

            // Nepal Labor Act 2074: 8.33% p.a. for < 7 years, 12.5% p.a. for ≥ 7 years
            const rate = yearsOfService >= 7 ? 0.125 : 0.0833;
            const accrued_gratuity = yearsOfService >= 1 ? annualBasic * yearsOfService * rate : 0;
            const monthly_accrual = basicMonthly * rate;

            return {
                employee_id: emp.id,
                employee_name: `${emp.first_name} ${emp.last_name}`,
                designation: emp.designation,
                joining_date: emp.joining_date,
                years_of_service: Math.round(yearsOfService * 10) / 10,
                months_of_service: Math.round(monthsOfService),
                basic_monthly: basicMonthly,
                rate_percent: rate * 100,
                monthly_accrual: Math.round(monthly_accrual),
                accrued_gratuity: Math.round(accrued_gratuity),
                eligible: yearsOfService >= 1,
            };
        });
    }
}
