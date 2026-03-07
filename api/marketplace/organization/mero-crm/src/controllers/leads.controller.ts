import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { LeadsService } from '../services/leads.service';
import { CreateLeadDto, UpdateLeadDto } from '../dto/leads.dto';
import { JwtAuthGuard } from '../../../../../src/auth/guards/jwt-auth.guard'; // Adjust path
import { AppAccessGuard } from '../../../../../src/common/guards/app-access.guard';
import { PermissionsGuard } from '../../../../../src/common/guards/permissions.guard';
import { Permissions } from '../../../../../src/common/decorators/permissions.decorator';
import { AppSlug } from '../../../../../src/common/decorators/app-slug.decorator';

// Note: Ensure guard paths are correct. Original was relative to mero-crm root. 
// Old: ../../../../src/auth/... (4 levels up from mero-crm/leads/leads.controller.ts)
// New: ../../../../../src/auth/... (5 levels up from mero-crm/src/controllers/leads.controller.ts)
// Path: api/marketplace/organization/mero-crm/src/controllers/leads.controller.ts
// -> src (1) -> mero-crm (2) -> organization (3) -> marketplace (4) -> api (5) -> src (6 is auth)?? 
// Wait, api/src is at D:\Blendwit Product\SaaS Product\mero_jugx\api\src
// File is at D:\Blendwit Product\SaaS Product\mero_jugx\api\marketplace\organization\mero-crm\src\controllers\leads.controller.ts
// ../ (src)
// ../../ (mero-crm)
// ../../../ (organization)
// ../../../../ (marketplace)
// ../../../../../ (api)
// ../../../../../../ (mero_jugx root?) No.
// api/src is sibling to api/marketplace? 
// list_dir of api: marketplace, src. Yes.
// So path from api/marketplace/... to api/src/...:
// ../../../../../src/auth... 
// Marketplace (4) -> api (5) -> src. Yes 5 levels up.

@Controller('crm/leads')
@UseGuards(JwtAuthGuard, AppAccessGuard, PermissionsGuard)
@AppSlug('mero-crm')
export class LeadsController {
    constructor(private readonly leadsService: LeadsService) { }

    @Post()
    @Permissions('crm.leads.create')
    create(@Body() createLeadDto: CreateLeadDto, @Request() req) {
        return this.leadsService.create(createLeadDto, req.user.organizationId);
    }

    @Get()
    @Permissions('crm.leads.view')
    findAll(@Request() req) {
        return this.leadsService.findAll(req.user.organizationId);
    }

    @Get('stats/forecast')
    @Permissions('crm.leads.view')
    getForecast(@Request() req) {
        return this.leadsService.getForecast(req.user.organizationId);
    }

    @Get(':id')
    @Permissions('crm.leads.view')
    findOne(@Param('id') id: string, @Request() req) {
        return this.leadsService.findOne(id, req.user.organizationId);
    }

    @Patch(':id')
    @Permissions('crm.leads.update')
    update(@Param('id') id: string, @Body() updateLeadDto: UpdateLeadDto, @Request() req) {
        return this.leadsService.update(id, updateLeadDto, req.user.organizationId);
    }

    @Post(':id/convert')
    @Permissions('crm.leads.update')
    convert(@Param('id') id: string, @Request() req) {
        return this.leadsService.convert(id, req.user.organizationId);
    }

    @Post('bulk')
    @Permissions('crm.leads.create')
    bulkCreate(@Body() leads: CreateLeadDto[], @Request() req) {
        return this.leadsService.bulkCreate(leads, req.user.organizationId);
    }
}
