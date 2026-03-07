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
import { QuotesService } from '../services/quotes.service';
import { CreateQuoteDto, UpdateQuoteDto } from '../dto/quote.dto';

@ApiTags('CRM - Quotes')
@Controller('crm/quotes')
@UseGuards(JwtAuthGuard, AppAccessGuard, PermissionsGuard)
@AppSlug('mero-crm')
export class QuotesController {
    constructor(private quotesService: QuotesService) { }

    @Post()
    @Permissions('crm.invoices.create')
    @ApiOperation({ summary: 'Create a new quote' })
    @ApiResponse({ status: 201, description: 'Quote created successfully' })
    async create(
        @CurrentUser('userId') userId: string,
        @CurrentUser('organizationId') organizationId: string,
        @Body() createQuoteDto: CreateQuoteDto,
    ) {
        return this.quotesService.create(userId, organizationId, createQuoteDto);
    }

    @Get()
    @Permissions('crm.invoices.view')
    @ApiOperation({ summary: 'Get all quotes' })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @ApiResponse({ status: 200, description: 'Quotes retrieved successfully' })
    async findAll(
        @CurrentUser('organizationId') organizationId: string,
        @Query('page') page?: number,
        @Query('limit') limit?: number,
    ) {
        return this.quotesService.findAll(
            organizationId,
            page ? parseInt(String(page), 10) : 1,
            limit ? parseInt(String(limit), 10) : 10,
        );
    }

    @Get(':id')
    @Permissions('crm.invoices.view')
    @ApiOperation({ summary: 'Get quote by ID' })
    @ApiResponse({ status: 200, description: 'Quote retrieved successfully' })
    async findOne(
        @Param('id') id: string,
        @CurrentUser('organizationId') organizationId: string,
    ) {
        return this.quotesService.findOne(id, organizationId);
    }

    @Put(':id')
    @Permissions('crm.invoices.edit')
    @ApiOperation({ summary: 'Update quote' })
    @ApiResponse({ status: 200, description: 'Quote updated successfully' })
    async update(
        @Param('id') id: string,
        @CurrentUser('organizationId') organizationId: string,
        @Body() updateQuoteDto: UpdateQuoteDto,
    ) {
        return this.quotesService.update(id, organizationId, updateQuoteDto);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @Permissions('crm.invoices.edit')
    @ApiOperation({ summary: 'Soft delete quote' })
    @ApiResponse({ status: 204, description: 'Quote deleted successfully' })
    async remove(
        @Param('id') id: string,
        @CurrentUser('organizationId') organizationId: string,
    ) {
        await this.quotesService.remove(id, organizationId);
    }

    @Post(':id/convert-to-invoice')
    @Permissions('crm.invoices.create') // Assuming permission to create invoice is needed
    @ApiOperation({ summary: 'Convert quote to invoice' })
    @ApiResponse({ status: 201, description: 'Quote converted to invoice successfully' })
    async convertToInvoice(
        @Param('id') id: string,
        @CurrentUser('userId') userId: string,
        @CurrentUser('organizationId') organizationId: string,
    ) {
        return this.quotesService.convertToInvoice(id, userId, organizationId);
    }

    @Post(':id/send-email')
    @Permissions('crm.invoices.view')
    @ApiOperation({ summary: 'Send quote via email' })
    @ApiResponse({ status: 200, description: 'Email sent successfully' })
    async sendEmail(
        @Param('id') id: string,
        @CurrentUser('organizationId') organizationId: string,
        @Body() data: { to?: string; subject?: string; message?: string },
    ) {
        return this.quotesService.sendEmail(id, organizationId, data.to, data.subject, data.message);
    }
}
