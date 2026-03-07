import {
    Controller,
    Get,
    Post,
    Patch,
    Delete,
    Param,
    Body,
    Query,
    UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '@auth/guards/jwt-auth.guard';
import { AppAccessGuard } from '@common/guards/app-access.guard';
import { AppSlug } from '@common/decorators/app-slug.decorator';
import { CurrentOrganization } from '@common/decorators/current-organization.decorator';
import { KhataService } from '../services/khata.service';

@Controller('khata')
@UseGuards(JwtAuthGuard, AppAccessGuard)
@AppSlug('mero-khata')
export class KhataController {
    constructor(private readonly khataService: KhataService) { }

    @Get('stats')
    getStats(@CurrentOrganization() organization: any) {
        return this.khataService.getStats(organization.id);
    }

    @Get('customers')
    findAll(@CurrentOrganization() organization: any) {
        return this.khataService.findAllCustomers(organization.id);
    }

    @Get('customers/:id')
    findOne(@Param('id') id: string, @CurrentOrganization() organization: any) {
        return this.khataService.getCustomerDetails(id, organization.id);
    }

    @Post('customers')
    createCustomer(@CurrentOrganization() organization: any, @Body() data: any) {
        return this.khataService.createCustomer(organization.id, data);
    }

    @Post('transactions')
    addTransaction(@CurrentOrganization() organization: any, @Body() data: any) {
        return this.khataService.addTransaction(organization.id, data);
    }

    // ── Bank Reconciliation ──────────────────────────────────────────────────

    @Get('bank-entries')
    getBankEntries(@CurrentOrganization() organization: any) {
        return this.khataService.getBankEntries(organization.id);
    }

    @Post('bank-entries')
    addBankEntry(@CurrentOrganization() organization: any, @Body() data: any) {
        return this.khataService.addBankEntry(organization.id, data);
    }

    @Post('bank-entries/:entryId/match/:transactionId')
    matchBankEntry(
        @Param('entryId') entryId: string,
        @Param('transactionId') transactionId: string,
        @CurrentOrganization() organization: any,
    ) {
        return this.khataService.matchBankEntry(entryId, transactionId, organization.id);
    }

    @Delete('bank-entries/:entryId/match')
    unmatchBankEntry(
        @Param('entryId') entryId: string,
        @CurrentOrganization() organization: any,
    ) {
        return this.khataService.unmatchBankEntry(entryId, organization.id);
    }

    @Get('reconciliation/summary')
    getReconciliationSummary(@CurrentOrganization() organization: any) {
        return this.khataService.getReconciliationSummary(organization.id);
    }

    @Get('reconciliation/unreconciled-transactions')
    getUnreconciledTransactions(@CurrentOrganization() organization: any) {
        return this.khataService.getUnreconciledTransactions(organization.id);
    }

    // ── Categories ────────────────────────────────────────────────────────────
    @Get('categories')
    getCategories(@CurrentOrganization() org: any, @Query('type') type?: string) {
        return this.khataService.getCategories(org.id, type as any);
    }
    @Post('categories')
    createCategory(@CurrentOrganization() org: any, @Body() data: any) {
        return this.khataService.createCategory(org.id, data);
    }
    @Delete('categories/:id')
    deleteCategory(@Param('id') id: string, @CurrentOrganization() org: any) {
        return this.khataService.deleteCategory(id, org.id);
    }
    @Post('categories/seed-defaults')
    seedDefaultCategories(@CurrentOrganization() org: any) {
        return this.khataService.seedDefaultCategories(org.id);
    }

    // ── Entries ───────────────────────────────────────────────────────────────
    @Get('entries')
    getEntries(@CurrentOrganization() org: any, @Query('type') type?: string, @Query('startDate') sd?: string, @Query('endDate') ed?: string) {
        return this.khataService.getEntries(org.id, type as any, sd, ed);
    }
    @Get('entries/summary')
    getEntrySummary(@CurrentOrganization() org: any, @Query('startDate') sd?: string, @Query('endDate') ed?: string) {
        return this.khataService.getEntrySummary(org.id, sd, ed);
    }
    @Post('entries')
    createEntry(@CurrentOrganization() org: any, @Body() data: any) {
        return this.khataService.createEntry(org.id, data);
    }
    @Patch('entries/:id')
    updateEntry(@Param('id') id: string, @CurrentOrganization() org: any, @Body() data: any) {
        return this.khataService.updateEntry(id, org.id, data);
    }
    @Delete('entries/:id')
    deleteEntry(@Param('id') id: string, @CurrentOrganization() org: any) {
        return this.khataService.deleteEntry(id, org.id);
    }

    // ── Invoices ──────────────────────────────────────────────────────────────
    @Get('invoices')
    getInvoices(@CurrentOrganization() org: any, @Query('status') status?: string) {
        return this.khataService.getInvoices(org.id, status);
    }
    @Get('invoices/:id')
    getInvoice(@Param('id') id: string, @CurrentOrganization() org: any) {
        return this.khataService.getInvoice(id, org.id);
    }
    @Post('invoices')
    createInvoice(@CurrentOrganization() org: any, @Body() data: any) {
        return this.khataService.createInvoice(org.id, data);
    }
    @Patch('invoices/:id')
    updateInvoice(@Param('id') id: string, @CurrentOrganization() org: any, @Body() data: any) {
        return this.khataService.updateInvoice(id, org.id, data);
    }
    @Delete('invoices/:id')
    deleteInvoice(@Param('id') id: string, @CurrentOrganization() org: any) {
        return this.khataService.deleteInvoice(id, org.id);
    }

    // ── Bills ─────────────────────────────────────────────────────────────────
    @Get('bills')
    getBills(@CurrentOrganization() org: any, @Query('status') status?: string) {
        return this.khataService.getBills(org.id, status);
    }
    @Post('bills')
    createBill(@CurrentOrganization() org: any, @Body() data: any) {
        return this.khataService.createBill(org.id, data);
    }
    @Patch('bills/:id')
    updateBill(@Param('id') id: string, @CurrentOrganization() org: any, @Body() data: any) {
        return this.khataService.updateBill(id, org.id, data);
    }
    @Delete('bills/:id')
    deleteBill(@Param('id') id: string, @CurrentOrganization() org: any) {
        return this.khataService.deleteBill(id, org.id);
    }

    // ── Reports ───────────────────────────────────────────────────────────────
    @Get('reports/vat')
    getVatSummary(@CurrentOrganization() org: any, @Query('startDate') sd?: string, @Query('endDate') ed?: string) {
        return this.khataService.getVatSummary(org.id, sd, ed);
    }
    @Get('reports/pnl')
    getPnlReport(@CurrentOrganization() org: any, @Query('startDate') sd: string, @Query('endDate') ed: string) {
        return this.khataService.getPnlReport(org.id, sd, ed);
    }
}
