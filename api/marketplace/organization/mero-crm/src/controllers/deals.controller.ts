import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, Put } from '@nestjs/common';
import { DealsService } from '../services/deals.service';
import { CreateDealDto, UpdateDealDto } from '../dto/deals.dto';
import { CreatePipelineDto, UpdatePipelineDto } from '../dto/pipeline.dto';
import { CreateStageDto, UpdateStageDto } from '../dto/stage.dto';
import { JwtAuthGuard } from '../../../../../src/auth/guards/jwt-auth.guard';
import { AppAccessGuard } from '../../../../../src/common/guards/app-access.guard';
import { PermissionsGuard } from '../../../../../src/common/guards/permissions.guard';
import { Permissions } from '../../../../../src/common/decorators/permissions.decorator';
import { AppSlug } from '../../../../../src/common/decorators/app-slug.decorator';

@Controller('crm/deals')
@UseGuards(JwtAuthGuard, AppAccessGuard, PermissionsGuard)
@AppSlug('mero-crm')
export class DealsController {
    constructor(private readonly dealsService: DealsService) { }

    @Post()
    @Permissions('crm.deals.create')
    create(@Body() createDealDto: CreateDealDto, @Request() req) {
        return this.dealsService.create(createDealDto, req.user.organizationId);
    }

    @Get()
    @Permissions('crm.deals.view')
    findAll(@Request() req) {
        return this.dealsService.findAll(req.user.organizationId);
    }

    @Get(':id')
    @Permissions('crm.deals.view')
    findOne(@Param('id') id: string, @Request() req) {
        return this.dealsService.findOne(id, req.user.organizationId);
    }

    @Patch(':id')
    @Permissions('crm.deals.update')
    update(@Param('id') id: string, @Body() updateDealDto: UpdateDealDto, @Request() req) {
        return this.dealsService.update(id, updateDealDto, req.user.organizationId);
    }

    @Delete(':id')
    @Permissions('crm.deals.delete')
    remove(@Param('id') id: string, @Request() req) {
        return this.dealsService.remove(id, req.user.organizationId);
    }

    // Pipeline Management Endpoints
    @Get('pipelines')
    @Permissions('crm.deals.view')
    findAllPipelines(@Request() req) {
        return this.dealsService.findAllPipelines(req.user.organizationId);
    }

    @Post('pipelines')
    @Permissions('crm.deals.create')
    createPipeline(@Body() dto: CreatePipelineDto, @Request() req) {
        return this.dealsService.createPipeline(req.user.organizationId, dto);
    }

    @Put('pipelines/:id')
    @Permissions('crm.deals.update')
    updatePipeline(@Param('id') id: string, @Body() dto: UpdatePipelineDto, @Request() req) {
        return this.dealsService.updatePipeline(id, req.user.organizationId, dto);
    }

    @Delete('pipelines/:id')
    @Permissions('crm.deals.delete')
    removePipeline(@Param('id') id: string, @Request() req) {
        return this.dealsService.removePipeline(id, req.user.organizationId);
    }

    // Stage Management Endpoints
    @Post('stages')
    @Permissions('crm.deals.create')
    createStage(@Body() dto: CreateStageDto, @Request() req) {
        return this.dealsService.createStage(req.user.organizationId, dto);
    }

    @Put('stages/:id')
    @Permissions('crm.deals.update')
    updateStage(@Param('id') id: string, @Body() dto: UpdateStageDto, @Request() req) {
        return this.dealsService.updateStage(id, req.user.organizationId, dto);
    }

    @Delete('stages/:id')
    @Permissions('crm.deals.delete')
    removeStage(@Param('id') id: string, @Request() req) {
        return this.dealsService.removeStage(id, req.user.organizationId);
    }

    // Team Collaboration Endpoints
    @Post(':id/team-members')
    @Permissions('crm.deals.update')
    addTeamMember(@Param('id') id: string, @Body('userId') userId: string, @Request() req) {
        return this.dealsService.addTeamMember(id, userId, req.user.organizationId);
    }

    @Delete(':id/team-members/:userId')
    @Permissions('crm.deals.update')
    removeTeamMember(@Param('id') id: string, @Param('userId') userId: string, @Request() req) {
        return this.dealsService.removeTeamMember(id, userId, req.user.organizationId);
    }
}
