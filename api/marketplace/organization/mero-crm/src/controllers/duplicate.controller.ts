import { Controller, Get, Post, Body, Query, UseGuards, Request } from '@nestjs/common';
import { DuplicateDetectionService } from '../services/duplicate-detection.service';
import { JwtAuthGuard } from '../../../../../src/auth/guards/jwt-auth.guard';
import { AppAccessGuard } from '../../../../../src/common/guards/app-access.guard';
import { PermissionsGuard } from '../../../../../src/common/guards/permissions.guard';
import { Permissions } from '../../../../../src/common/decorators/permissions.decorator';
import { AppSlug } from '../../../../../src/common/decorators/app-slug.decorator';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('CRM - Utilities')
@Controller('crm/duplicates')
@UseGuards(JwtAuthGuard, AppAccessGuard, PermissionsGuard)
@AppSlug('mero-crm')
export class DuplicateController {
    constructor(private readonly duplicateService: DuplicateDetectionService) { }

    @Get('leads')
    @Permissions('crm.leads.view')
    @ApiOperation({ summary: 'Check for lead duplicates' })
    async checkLeads(@Request() req, @Query() query) {
        return this.duplicateService.findLeadDuplicates(query, req.user.organizationId);
    }

    @Get('clients')
    @Permissions('crm.clients.view')
    @ApiOperation({ summary: 'Check for client duplicates' })
    async checkClients(@Request() req, @Query() query) {
        return this.duplicateService.findClientDuplicates(query, req.user.organizationId);
    }

    @Post('merge')
    @Permissions('crm.leads.edit')
    @ApiOperation({ summary: 'Merge duplicate leads' })
    async mergeLeads(@Request() req, @Body() body: { primaryId: string, duplicateIds: string[] }) {
        return this.duplicateService.mergeLeads(body.primaryId, body.duplicateIds, req.user.organizationId);
    }
}
