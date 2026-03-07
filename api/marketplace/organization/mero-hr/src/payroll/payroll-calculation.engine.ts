import { Injectable } from '@nestjs/common';

@Injectable()
export class PayrollCalculationEngine {
    /**
     * SSF Calculation (Social Security Fund - Nepal)
     * Employee Contribution: 11% of Basic
     * Employer Contribution: 20% of Basic (includes 1.67% gratuity, 18.33% pension/accident)
     */
    calculateSSF(basicSalary: number) {
        return {
            employeeContribution: Number((basicSalary * 0.11).toFixed(2)),
            employerContribution: Number((basicSalary * 0.20).toFixed(2)),
        };
    }

    /**
     * Festival Allowance Calculation (Dashain Bonus - Nepal)
     * Typically 1 month's basic salary provided once a year.
     */
    calculateFestivalAllowance(basicSalary: number) {
        return Number(basicSalary.toFixed(2));
    }

    /**
     * CTC (Cost to Company) Breakdown
     * Calculates the total cost for an employee including employer contributions.
     */
    calculateCTC(basicSalary: number, monthlyAllowances: number) {
        const ssf = this.calculateSSF(basicSalary);
        const monthlyCost = basicSalary + monthlyAllowances + ssf.employerContribution;
        const annualCost = monthlyCost * 12 + this.calculateFestivalAllowance(basicSalary);

        return {
            monthlyBasic: Number(basicSalary.toFixed(2)),
            monthlyAllowances: Number(monthlyAllowances.toFixed(2)),
            employerSSF: ssf.employerContribution,
            totalMonthlyCost: Number(monthlyCost.toFixed(2)),
            totalAnnualCost: Number(annualCost.toFixed(2)),
        };
    }

    /**
     * Income Tax Calculation (Slab based for Nepal FY 2080/81)
     * Supports single and married slabs.
     */
    calculateIncomeTax(
        monthlyGrossSalary: number,
        ssfEmployeeContribution: number,
        citContribution: number = 0,
        otherDeductions: number = 0,
        maritalStatus: 'SINGLE' | 'MARRIED' = 'SINGLE'
    ) {
        // Taxable income = Gross - (SSF + CIT + other eligible deductions)
        // Note: SSF + CIT limit is 1/3 of gross or 3L (whichever is lower) for deduction
        const maxDeductionLimit = 300000;
        let totalDeductions = ssfEmployeeContribution + citContribution + otherDeductions;
        const annualGross = monthlyGrossSalary * 12;

        if (totalDeductions * 12 > maxDeductionLimit) {
            totalDeductions = maxDeductionLimit / 12;
        }

        const annualTaxableIncome = (monthlyGrossSalary - totalDeductions) * 12;
        let tax = 0;

        // Nepal Tax Slabs (FY 2080/81)
        const slabs = maritalStatus === 'SINGLE'
            ? [500000, 200000, 300000, 1000000] // 5L, next 2L, next 3L, next 10L, rest
            : [600000, 200000, 200000, 1000000]; // 6L, next 2L, next 2L, next 10L, rest

        const rates = [0.01, 0.10, 0.20, 0.30, 0.36];

        let remaining = annualTaxableIncome;
        for (let i = 0; i < slabs.length; i++) {
            const slabAmount = slabs[i];
            if (remaining > slabAmount) {
                tax += slabAmount * rates[i];
                remaining -= slabAmount;
            } else {
                tax += remaining * rates[i];
                remaining = 0;
                break;
            }
        }
        if (remaining > 0) {
            tax += remaining * rates[slabs.length];
        }

        return Number((tax / 12).toFixed(2));
    }

    /**
     * Final Net Salary Calculation
     */
    calculateNetSalary(
        basicSalary: number,
        allowances: number,
        bonus: number = 0,
        citContribution: number = 0,
        otherDeductions: number = 0,
        maritalStatus: 'SINGLE' | 'MARRIED' = 'SINGLE'
    ) {
        const ssf = this.calculateSSF(basicSalary);
        const grossSalary = basicSalary + allowances + bonus;
        const incomeTax = this.calculateIncomeTax(
            grossSalary,
            ssf.employeeContribution,
            citContribution,
            otherDeductions,
            maritalStatus
        );

        const netSalary = grossSalary - ssf.employeeContribution - citContribution - otherDeductions - incomeTax;

        return {
            grossSalary: Number(grossSalary.toFixed(2)),
            ssfEmployee: ssf.employeeContribution,
            ssfEmployer: ssf.employerContribution,
            incomeTax,
            netSalary: Number(netSalary.toFixed(2)),
        };
    }
}
