import { Controller, Get, Post, Body, Param, Put, Patch, Delete, UseGuards, BadRequestException, NotFoundException, Query } from '@nestjs/common';
import { JwtAuthGuard } from '@auth/guards/jwt-auth.guard';
import { AppAccessGuard } from '@common/guards/app-access.guard';
import { AppSlug } from '@common/decorators/app-slug.decorator';
import { CurrentOrganization } from '@common/decorators/current-organization.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { PurchaseInvoicesService } from '../services/purchase-invoices.service';
import { PurchaseInvoiceType } from '@src/database/entities/vendors_purchase_invoices.entity';

@Controller('accounting/purchase-invoices')
@UseGuards(JwtAuthGuard, AppAccessGuard)
@AppSlug('mero-accounting')
export class PurchaseInvoicesController {
    constructor(private readonly invoiceService: PurchaseInvoicesService) { }

    @Get()
    findAll(@CurrentOrganization() organization: any, @Query('type') type?: PurchaseInvoiceType) {
        return this.invoiceService.findAll(organization.id, type);
    }

    @Get('vendor/:vendorId/statement')
    getVendorStatement(
        @CurrentOrganization() organization: any,
        @Param('vendorId') vendorId: string,
    ) {
        return this.invoiceService.getVendorStatement(vendorId, organization.id);
    }

    findById(@CurrentOrganization() organization: any, @Param('id') id: string) {
        return this.invoiceService.findById(id, organization.id);
    }

    @Get(':id/payments')
    getPayments(@CurrentOrganization() organization: any, @Param('id') id: string) {
        return this.invoiceService.getPayments(id, organization.id);
    }

    @Post()
    create(@CurrentOrganization() organization: any, @Body() data: any) {
        return this.invoiceService.create(organization.id, data);
    }

    @Patch(':id')
    update(
        @CurrentOrganization() organization: any,
        @Param('id') id: string,
        @Body() data: any,
    ) {
        return this.invoiceService.update(id, organization.id, data);
    }

    @Post(':id/review')
    reviewInvoice(
        @CurrentOrganization() organization: any,
        @Param('id') id: string,
        @CurrentUser() user: any,
    ) {
        return this.invoiceService.markAsReviewed(id, organization.id, user.userId);
    }

    @Post(':id/approve')
    approveInvoice(
        @CurrentOrganization() organization: any,
        @Param('id') id: string,
        @CurrentUser() user: any,
    ) {
        return this.invoiceService.approveInvoice(id, organization.id, user.userId);
    }

    @Post(':id/post')
    postInvoice(
        @CurrentOrganization() organization: any,
        @Param('id') id: string,
        @CurrentUser() user: any,
        @Body() body: { apAccountId: string; expenseAccountId: string; vatAccountId?: string; tdsAccountId?: string },
    ) {
        return this.invoiceService.postInvoice(id, organization.id, user.userId, body.apAccountId, body.expenseAccountId, body.vatAccountId, body.tdsAccountId);
    }

    @Post(':id/unpost')
    unpostInvoice(
        @CurrentOrganization() organization: any,
        @Param('id') id: string,
        @CurrentUser() user: any,
    ) {
        return this.invoiceService.unpostInvoice(id, organization.id, user.userId);
    }

    @Post(':id/pay')
    recordPayment(
        @CurrentOrganization() organization: any,
        @Param('id') id: string,
        @CurrentUser() user: any,
        @Body() body: { amount: number; paymentDate: string; bankAccountId: string; apAccountId: string; narration?: string },
    ) {
        return this.invoiceService.recordPayment(id, organization.id, user.userId, body);
    }

    @Delete('payments/:paymentId')
    deletePayment(
        @CurrentOrganization() organization: any,
        @Param('paymentId') paymentId: string,
        @CurrentUser() user: any,
    ) {
        return this.invoiceService.deletePayment(paymentId, organization.id, user.userId);
    }

    @Put('payments/:paymentId')
    updatePayment(
        @CurrentOrganization() organization: any,
        @Param('paymentId') paymentId: string,
        @Body() data: { amount?: number; narration?: string },
        @CurrentUser() user: any,
    ) {
        return this.invoiceService.updatePayment(paymentId, organization.id, data, user.userId);
    }

    @Post('payments/:paymentId/unpost')
    unpostPayment(
        @CurrentOrganization() organization: any,
        @Param('paymentId') paymentId: string,
        @CurrentUser() user: any,
    ) {
        return this.invoiceService.unpostPayment(paymentId, organization.id, user.userId);
    }

    @Post('payments/:paymentId/post')
    postPayment(
        @CurrentOrganization() organization: any,
        @Param('paymentId') paymentId: string,
        @CurrentUser() user: any,
    ) {
        return this.invoiceService.postPayment(paymentId, organization.id, user.userId);
    }
}
