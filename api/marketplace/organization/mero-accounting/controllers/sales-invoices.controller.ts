import {
    Controller,
    Get,
    Post,
    Body,
    Param,
    Put,
    Patch,
    Delete,
    UseGuards,
    BadRequestException,
    NotFoundException,
    Query,
} from '@nestjs/common';
import { JwtAuthGuard } from '@auth/guards/jwt-auth.guard';
import { AppAccessGuard } from '@common/guards/app-access.guard';
import { AppSlug } from '@common/decorators/app-slug.decorator';
import { CurrentOrganization } from '@common/decorators/current-organization.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { SalesInvoicesService } from '../services/sales-invoices.service';
import { SalesInvoiceType } from '@src/database/entities/customers_sales_invoices.entity';

@Controller('accounting/sales-invoices')
@UseGuards(JwtAuthGuard, AppAccessGuard)
@AppSlug('mero-accounting')
export class SalesInvoicesController {
    constructor(private readonly invoiceService: SalesInvoicesService) { }

    @Get()
    findAll(@CurrentOrganization() organization: any, @Query('type') type?: SalesInvoiceType) {
        return this.invoiceService.findAll(organization.id, type);
    }

    @Get('customer/:customerId/statement')
    getCustomerStatement(
        @CurrentOrganization() organization: any,
        @Param('customerId') customerId: string,
    ) {
        return this.invoiceService.getCustomerStatement(customerId, organization.id);
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

    @Post(':id/post')
    postInvoice(
        @CurrentOrganization() organization: any,
        @Param('id') id: string,
        @CurrentUser() user: any,
        @Body() body: { arAccountId: string; revenueAccountId: string; vatAccountId?: string; tdsReceivableAccountId?: string },
    ) {
        return this.invoiceService.postInvoice(id, organization.id, user.userId, body.arAccountId, body.revenueAccountId, body.vatAccountId, body.tdsReceivableAccountId);
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
        @Body() body: { amount: number; paymentDate: string; bankAccountId: string; arAccountId: string; narration?: string },
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
