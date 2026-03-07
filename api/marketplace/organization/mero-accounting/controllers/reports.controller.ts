import {
    Controller,
    Get,
    Query,
    UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '@auth/guards/jwt-auth.guard';
import { AppAccessGuard } from '@common/guards/app-access.guard';
import { AppSlug } from '@common/decorators/app-slug.decorator';
import { CurrentOrganization } from '@common/decorators/current-organization.decorator';
import { ReportsService } from '../services/reports.service';

@Controller('accounting/reports')
@UseGuards(JwtAuthGuard, AppAccessGuard)
@AppSlug('mero-accounting')
export class ReportsController {
    constructor(private readonly reportsService: ReportsService) { }

    @Get('trial-balance')
    getTrialBalance(@CurrentOrganization() organization: any) {
        return this.reportsService.getTrialBalance(organization.id);
    }

    @Get('profit-and-loss')
    getProfitAndLoss(
        @CurrentOrganization() organization: any,
        @Query('startDate') startDate: string,
        @Query('endDate') endDate: string,
    ) {
        return this.reportsService.getProfitAndLoss(organization.id, startDate, endDate);
    }

    @Get('consolidated/profit-and-loss')
    getConsolidatedProfitAndLoss(
        @CurrentOrganization() organization: any,
        @Query('startDate') startDate: string,
        @Query('endDate') endDate: string,
    ) {
        return this.reportsService.getConsolidatedProfitAndLoss(organization.id, startDate, endDate);
    }

    @Get('balance-sheet')
    getBalanceSheet(@CurrentOrganization() organization: any) {
        return this.reportsService.getBalanceSheet(organization.id);
    }

    @Get('consolidated/balance-sheet')
    getConsolidatedBalanceSheet(@CurrentOrganization() organization: any) {
        return this.reportsService.getConsolidatedBalanceSheet(organization.id);
    }

    @Get('schedule-iii')
    getScheduleIII(@CurrentOrganization() organization: any) {
        return this.reportsService.getScheduleIIIReport(organization.id);
    }

    @Get('ar-aging')
    getARAgingReport(
        @CurrentOrganization() organization: any,
        @Query('asOfDate') asOfDate?: string
    ) {
        return this.reportsService.getARAgingReport(organization.id, asOfDate);
    }

    @Get('ap-aging')
    getAPAgingReport(
        @CurrentOrganization() organization: any,
        @Query('asOfDate') asOfDate?: string
    ) {
        return this.reportsService.getAPAgingReport(organization.id, asOfDate);
    }

    @Get('cash-flow')
    getCashFlowStatement(@CurrentOrganization() organization: any) {
        return this.reportsService.getCashFlowStatement(organization.id);
    }

    @Get('comparative-analysis')
    getComparativeAnalysis(
        @CurrentOrganization() organization: any,
        @Query('period') period?: 'MoM' | 'QoQ' | 'YoY'
    ) {
        return this.reportsService.getComparativeAnalysis(organization.id, period);
    }

    @Get('ratios')
    getFinancialRatios(@CurrentOrganization() organization: any) {
        return this.reportsService.getFinancialRatios(organization.id);
    }
}
