import { Controller, Post, Get, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@auth/guards/jwt-auth.guard';
import { AppAccessGuard } from '@common/guards/app-access.guard';
import { AppSlug } from '@common/decorators/app-slug.decorator';
import { CurrentOrganization } from '@common/decorators/current-organization.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { ChequesService } from '../services/cheques.service';
import { ChequeType, ChequeStatus } from '@src/database/entities/cheques.entity';

@Controller('accounting/cheques')
@UseGuards(JwtAuthGuard, AppAccessGuard)
@AppSlug('mero-accounting')
export class ChequesController {
    constructor(private readonly chequesService: ChequesService) { }

    @Post()
    registerCheque(
        @CurrentOrganization() organization: any,
        @CurrentUser() user: any,
        @Body() body: {
            bankAccountId?: string;
            chequeNumber: string;
            payeeName: string;
            amount: number;
            chequeDate: string;
            issueDate: string;
            type: ChequeType;
            journalEntryId?: string;
            remarks?: string;
        },
    ) {
        return this.chequesService.registerCheque(organization.id, user.userId, body);
    }

    @Get()
    getCheques(
        @CurrentOrganization() organization: any,
        @Query('type') type?: ChequeType,
        @Query('status') status?: ChequeStatus,
    ) {
        return this.chequesService.getCheques(organization.id, { type, status });
    }

    @Patch(':id/status')
    updateStatus(
        @CurrentOrganization() organization: any,
        @CurrentUser() user: any,
        @Param('id') id: string,
        @Body() body: { status: ChequeStatus },
    ) {
        return this.chequesService.updateStatus(organization.id, user.userId, id, body.status);
    }

    @Get(':id/print')
    getPrintTemplateData(
        @CurrentOrganization() organization: any,
        @CurrentUser() user: any,
        @Param('id') id: string,
    ) {
        return this.chequesService.getPrintTemplateData(organization.id, user.userId, id);
    }
}
