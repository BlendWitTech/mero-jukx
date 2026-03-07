import { Controller, Post, Get, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@auth/guards/jwt-auth.guard';
import { AppAccessGuard } from '@common/guards/app-access.guard';
import { AppSlug } from '@common/decorators/app-slug.decorator';
import { CurrentOrganization } from '@common/decorators/current-organization.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { BankReconciliationService, ParseStatementRowDto } from '../services/bank-reconciliation.service';

@Controller('accounting/bank-reconciliation')
@UseGuards(JwtAuthGuard, AppAccessGuard)
@AppSlug('mero-accounting')
export class BankReconciliationController {
    constructor(private readonly reconciliationService: BankReconciliationService) { }

    @Post('import')
    importStatement(
        @CurrentOrganization() organization: any,
        @CurrentUser() user: any,
        @Body() body: {
            bankAccountId: string;
            rows: ParseStatementRowDto[];
        },
    ) {
        // Here we expect the client to have already parsed the CSV into a JSON array.
        // This is much simpler for a REST API than dealing with Multipart Form Data parsing directly in the controller to avoid deep dependencies.
        return this.reconciliationService.importStatement(organization.id, user.userId, body.bankAccountId, body.rows);
    }

    @Get('statements')
    getStatements(
        @CurrentOrganization() organization: any,
    ) {
        return this.reconciliationService.getStatements(organization.id);
    }

    @Get('statements/:id/lines')
    getStatementLines(
        @CurrentOrganization() organization: any,
        @Param('id') statementId: string,
    ) {
        return this.reconciliationService.getStatementLines(organization.id, statementId);
    }

    @Post('statements/:id/auto-match')
    autoReconcile(
        @CurrentOrganization() organization: any,
        @CurrentUser() user: any,
        @Param('id') statementId: string,
    ) {
        return this.reconciliationService.autoReconcile(organization.id, user.userId, statementId);
    }

    @Post('lines/:id/manual-match')
    manualMatch(
        @CurrentOrganization() organization: any,
        @CurrentUser() user: any,
        @Param('id') lineId: string,
        @Body() body: { journalEntryLineId: string },
    ) {
        return this.reconciliationService.manualMatch(organization.id, user.userId, lineId, body.journalEntryLineId);
    }

    @Post('lines/:id/ignore')
    ignoreLine(
        @CurrentOrganization() organization: any,
        @CurrentUser() user: any,
        @Param('id') lineId: string,
    ) {
        return this.reconciliationService.ignoreLine(organization.id, user.userId, lineId);
    }
}
