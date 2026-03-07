import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Body,
    Param,
    Query,
    UseGuards,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../../../src/auth/guards/jwt-auth.guard';
import { AppAccessGuard } from '../../../../../src/common/guards/app-access.guard';
import { PermissionsGuard } from '../../../../../src/common/guards/permissions.guard';
import { Permissions } from '../../../../../src/common/decorators/permissions.decorator';
import { AppSlug } from '../../../../../src/common/decorators/app-slug.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { InvoicesService } from '../services/invoices.service';
import { CreateInvoiceDto, UpdateInvoiceDto } from '../dto/invoice.dto';
import { InvoiceStatus } from '@src/database/entities/crm_invoices.entity';

@ApiTags('CRM - Invoices')
@Controller('crm/invoices')
@UseGuards(JwtAuthGuard, AppAccessGuard, PermissionsGuard)
@AppSlug('mero-crm')
@ApiBearerAuth()
export class InvoicesController {
    constructor(private invoicesService: InvoicesService) { }

    @Post()
    @Permissions('crm.invoices.create')
    @ApiOperation({ summary: 'Create a new invoice' })
    @ApiResponse({ status: 201, description: 'Invoice created successfully' })
    async create(
        @CurrentUser('userId') userId: string,
        @CurrentUser('organizationId') organizationId: string,
        @Body() createInvoiceDto: CreateInvoiceDto,
    ) {
        return this.invoicesService.create(userId, organizationId, createInvoiceDto);
    }

    @Get()
    @Permissions('crm.invoices.view')
    @ApiOperation({ summary: 'Get all invoices' })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @ApiQuery({ name: 'search', required: false, type: String })
    @ApiQuery({ name: 'status', required: false, enum: InvoiceStatus })
    @ApiResponse({ status: 200, description: 'Invoices retrieved successfully' })
    async findAll(
        @CurrentUser('organizationId') organizationId: string,
        @Query('page') page?: number,
        @Query('limit') limit?: number,
        @Query('search') search?: string,
        @Query('status') status?: InvoiceStatus,
    ) {
        return this.invoicesService.findAll(
            organizationId,
            page ? parseInt(String(page), 10) : 1,
            limit ? parseInt(String(limit), 10) : 10,
            search,
            status,
        );
    }

    @Get(':id')
    @Permissions('crm.invoices.view')
    @ApiOperation({ summary: 'Get invoice by ID' })
    @ApiResponse({ status: 200, description: 'Invoice retrieved successfully' })
    @ApiResponse({ status: 404, description: 'Invoice not found' })
    async findOne(
        @Param('id') id: string,
        @CurrentUser('organizationId') organizationId: string,
    ) {
        return this.invoicesService.findOne(id, organizationId);
    }

    @Put(':id')
    @Permissions('crm.invoices.edit')
    @ApiOperation({ summary: 'Update invoice' })
    @ApiResponse({ status: 200, description: 'Invoice updated successfully' })
    @ApiResponse({ status: 404, description: 'Invoice not found' })
    async update(
        @Param('id') id: string,
        @CurrentUser('organizationId') organizationId: string,
        @Body() updateInvoiceDto: UpdateInvoiceDto,
    ) {
        return this.invoicesService.update(id, organizationId, updateInvoiceDto);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @Permissions('crm.invoices.delete')
    @ApiOperation({ summary: 'Soft delete invoice' })
    @ApiResponse({ status: 204, description: 'Invoice deleted successfully' })
    @ApiResponse({ status: 404, description: 'Invoice not found' })
    async remove(
        @Param('id') id: string,
        @CurrentUser('organizationId') organizationId: string,
    ) {
        await this.invoicesService.remove(id, organizationId);
    }

    @Post(':id/send-email')
    @Permissions('crm.invoices.view')
    @ApiOperation({ summary: 'Send invoice via email' })
    @ApiResponse({ status: 200, description: 'Email sent successfully' })
    async sendEmail(
        @Param('id') id: string,
        @CurrentUser('organizationId') organizationId: string,
        @Body() data: { to?: string; subject?: string; message?: string },
    ) {
        return this.invoicesService.sendEmail(id, organizationId, data.to, data.subject, data.message);
    }

    @Post(':id/send-whatsapp')
    @Permissions('crm.invoices.view')
    @ApiOperation({ summary: 'Send invoice summary via WhatsApp to client' })
    @ApiResponse({ status: 200, description: 'WhatsApp message sent' })
    async sendWhatsApp(
        @Param('id') id: string,
        @CurrentUser('organizationId') organizationId: string,
    ) {
        return this.invoicesService.sendWhatsApp(id, organizationId);
    }
}
