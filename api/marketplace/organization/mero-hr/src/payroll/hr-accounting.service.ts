import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HrPayroll } from '../../../../../src/database/entities';
import { JournalEntriesService } from '../../../mero-accounting/services/journal-entries.service';
import { AccountsService } from '../../../mero-accounting/services/accounts.service';

@Injectable()
export class HrAccountingService {
    private readonly logger = new Logger(HrAccountingService.name);

    constructor(
        private readonly journalEntriesService: JournalEntriesService,
        private readonly accountsService: AccountsService,
        @InjectRepository(HrPayroll)
        private readonly payrollRepository: Repository<HrPayroll>,
    ) { }

    async postPayrollToAccounting(organizationId: string, userId: string, payrollIds: string[]) {
        const payrolls = await this.payrollRepository.findByIds(payrollIds);
        if (payrolls.length === 0) return;

        let totalBasic = 0;
        let totalAllowances = 0;
        let totalBonus = 0;
        let totalSSFEmployee = 0;
        let totalSSFEmployer = 0;
        let totalCIT = 0;
        let totalTax = 0;
        let totalLoan = 0;
        let totalAdvance = 0;
        let totalNet = 0;

        for (const p of payrolls) {
            totalBasic += Number(p.basic_salary);
            totalAllowances += Number(p.allowances);
            totalBonus += Number(p.bonus);
            totalSSFEmployee += Number(p.ssf_contribution_employee);
            totalSSFEmployer += Number(p.ssf_contribution_employer);
            totalCIT += Number(p.cit_contribution);
            totalTax += Number(p.income_tax);
            totalLoan += Number(p.loan_deduction);
            totalAdvance += Number(p.advance_deduction);
            totalNet += Number(p.net_salary);
        }

        const accounts = await this.accountsService.findAll(organizationId);

        const salaryExpenseAcc = accounts.find(a => a.name.toLowerCase().includes('salary expense'))?.id;
        const salaryPayableAcc = accounts.find(a => a.name.toLowerCase().includes('salary payable'))?.id;
        const ssfPayableAcc = accounts.find(a => a.name.toLowerCase().includes('ssf payable'))?.id;
        const taxPayableAcc = accounts.find(a => a.name.toLowerCase().includes('tax payable'))?.id;
        const citPayableAcc = accounts.find(a => a.name.toLowerCase().includes('cit payable'))?.id;
        const loanReceivableAcc = accounts.find(a => a.name.toLowerCase().includes('loan receivable') || a.name.toLowerCase().includes('employee loan'))?.id;
        const advanceAcc = accounts.find(a => a.name.toLowerCase().includes('advance salary') || a.name.toLowerCase().includes('employee advance'))?.id;

        if (!salaryExpenseAcc || !salaryPayableAcc) {
            this.logger.error('Could not find mandatory Salary Expense or Salary Payable accounts');
            return;
        }

        const lines = [
            {
                accountId: salaryExpenseAcc,
                debit: totalBasic + totalAllowances + totalBonus + totalSSFEmployer,
                credit: 0,
                description: 'Total Salary & Benefits Expense'
            },
            {
                accountId: salaryPayableAcc,
                debit: 0,
                credit: totalNet,
                description: 'Net Salary Payable'
            },
            {
                accountId: ssfPayableAcc || salaryPayableAcc,
                debit: 0,
                credit: totalSSFEmployee + totalSSFEmployer,
                description: 'SSF Payable (Employee + Employer)'
            },
            {
                accountId: taxPayableAcc || salaryPayableAcc,
                debit: 0,
                credit: totalTax,
                description: 'Income Tax Payable'
            }
        ];

        if (totalCIT > 0) {
            lines.push({
                accountId: citPayableAcc || salaryPayableAcc,
                debit: 0,
                credit: totalCIT,
                description: 'CIT Payable'
            });
        }

        if (totalLoan > 0) {
            lines.push({
                accountId: loanReceivableAcc || salaryPayableAcc,
                debit: 0,
                credit: totalLoan,
                description: 'Loan Repayment Deduction'
            });
        }

        if (totalAdvance > 0) {
            lines.push({
                accountId: advanceAcc || salaryPayableAcc,
                debit: 0,
                credit: totalAdvance,
                description: 'Advance Salary Recovery'
            });
        }

        const journalData = {
            entryDate: new Date(),
            reference: `PR-${payrolls[0].month}`,
            description: `Payroll Journey Entry for ${payrolls[0].month}`,
            status: 'DRAFT',
            lines
        };

        return await this.journalEntriesService.create(organizationId, userId, journalData);
    }
}
