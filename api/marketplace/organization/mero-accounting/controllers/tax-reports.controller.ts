import { Controller, Get, Query, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@auth/guards/jwt-auth.guard';
import { AppAccessGuard } from '@common/guards/app-access.guard';
import { AppSlug } from '@common/decorators/app-slug.decorator';
import { CurrentOrganization } from '@common/decorators/current-organization.decorator';
import { TaxReportsService } from '../services/tax-reports.service';

@Controller('accounting/tax-reports')
@UseGuards(JwtAuthGuard, AppAccessGuard)
@AppSlug('mero-accounting')
export class TaxReportsController {
    constructor(private readonly taxReportsService: TaxReportsService) { }

    @Get('annex-7')
    getAnnex7(
        @CurrentOrganization() organization: any,
        @Query('startDate') startDate: string,
        @Query('endDate') endDate: string,
    ) {
        return this.taxReportsService.getAnnex7(organization.id, startDate, endDate);
    }

    @Get('annex-8')
    getAnnex8(
        @CurrentOrganization() organization: any,
        @Query('startDate') startDate: string,
        @Query('endDate') endDate: string,
    ) {
        return this.taxReportsService.getAnnex8(organization.id, startDate, endDate);
    }

    @Get('annex-9')
    getAnnex9(
        @CurrentOrganization() organization: any,
        @Query('startDate') startDate: string,
        @Query('endDate') endDate: string,
    ) {
        return this.taxReportsService.getAnnex9(organization.id, startDate, endDate);
    }

    @Get('tds-payable')
    getTdsPayable(
        @CurrentOrganization() organization: any,
        @Query('startDate') startDate: string,
        @Query('endDate') endDate: string,
    ) {
        return this.taxReportsService.getTdsPayableRegister(organization.id, startDate, endDate);
    }

    @Get('tds-receivable')
    getTdsReceivable(
        @CurrentOrganization() organization: any,
        @Query('startDate') startDate: string,
        @Query('endDate') endDate: string,
    ) {
        return this.taxReportsService.getTdsReceivableRegister(organization.id, startDate, endDate);
    }

    @Get('tds-certificate/:vendorId')
    getTdsCertificate(
        @CurrentOrganization() organization: any,
        @Param('vendorId') vendorId: string,
        @Query('startDate') startDate: string,
        @Query('endDate') endDate: string,
    ) {
        return this.taxReportsService.generateTdsCertificateData(organization.id, vendorId, startDate, endDate);
    }
}
