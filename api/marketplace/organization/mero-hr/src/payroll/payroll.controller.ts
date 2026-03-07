import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query } from '@nestjs/common';
import { PayrollService } from './payroll.service';
import { JwtAuthGuard } from '../../../../../src/auth/guards/jwt-auth.guard';
import { AppAccessGuard } from '../../../../../src/common/guards/app-access.guard';
import { AppSlug } from '../../../../../src/common/decorators/app-slug.decorator';
import { CurrentUser } from '../../../../../src/common/decorators/current-user.decorator';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('HR Payroll')
@Controller('hr/payroll')
@UseGuards(JwtAuthGuard, AppAccessGuard)
@AppSlug('mero-hr')
export class PayrollController {
    constructor(private readonly payrollService: PayrollService) { }

    @Post('generate')
    @ApiOperation({ summary: 'Generate monthly payroll' })
    generate(@CurrentUser('organizationId') organizationId: string, @Body() body: { month: string }) {
        return this.payrollService.generateMonthlyPayroll(organizationId, body.month);
    }

    @Get()
    @ApiOperation({ summary: 'Get payroll by month' })
    findAll(@CurrentUser('organizationId') organizationId: string, @Query('month') month: string) {
        return this.payrollService.findByMonth(organizationId, month);
    }

    @Get('my')
    @ApiOperation({ summary: 'Get payrolls for current user' })
    getMyPayrolls(@CurrentUser('organizationId') organizationId: string, @CurrentUser('userId') userId: string) {
        return this.payrollService.getMyPayrolls(organizationId, userId);
    }

    @Get(':id/payslip')
    @ApiOperation({ summary: 'Get payslip data' })
    async getPayslip(@CurrentUser('organizationId') organizationId: string, @Param('id') id: string) {
        return this.payrollService.getPayrollById(organizationId, id);
    }

    @Post('post-to-accounting')
    @ApiOperation({ summary: 'Post payroll to accounting' })
    postToAccounting(@CurrentUser('organizationId') organizationId: string, @CurrentUser('userId') userId: string, @Body() body: { payrollIds: string[] }) {
        return this.payrollService.postToAccounting(organizationId, userId, body.payrollIds);
    }

    @Get('bank-file')
    @ApiOperation({ summary: 'Generate bank salary transfer file for a month' })
    getBankFile(@CurrentUser('organizationId') organizationId: string, @Query('month') month: string) {
        return this.payrollService.generateBankFile(organizationId, month);
    }

    @Get('gratuity')
    @ApiOperation({ summary: 'Get gratuity accrual report for all active employees' })
    getGratuityReport(@CurrentUser('organizationId') organizationId: string) {
        return this.payrollService.getGratuityReport(organizationId);
    }
}
