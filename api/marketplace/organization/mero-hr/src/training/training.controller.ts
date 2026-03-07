import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query } from '@nestjs/common';
import { TrainingService } from './training.service';
import { JwtAuthGuard } from '../../../../../src/auth/guards/jwt-auth.guard';
import { AppAccessGuard } from '../../../../../src/common/guards/app-access.guard';
import { AppSlug } from '../../../../../src/common/decorators/app-slug.decorator';
import { CurrentUser } from '../../../../../src/common/decorators/current-user.decorator';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('HR Training')
@Controller('hr/training')
@UseGuards(JwtAuthGuard, AppAccessGuard)
@AppSlug('mero-hr')
export class TrainingController {
    constructor(private readonly service: TrainingService) { }

    @Get()
    @ApiOperation({ summary: 'List all training programs' })
    getAll(@CurrentUser('organizationId') orgId: string, @Query('status') status?: string) {
        return this.service.getAll(orgId, status);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get a training program' })
    getOne(@CurrentUser('organizationId') orgId: string, @Param('id') id: string) {
        return this.service.getOne(orgId, id);
    }

    @Post()
    @ApiOperation({ summary: 'Create a training program' })
    create(@CurrentUser('organizationId') orgId: string, @Body() body: any) {
        return this.service.create(orgId, body);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Update a training program' })
    update(@CurrentUser('organizationId') orgId: string, @Param('id') id: string, @Body() body: any) {
        return this.service.update(orgId, id, body);
    }

    @Post(':id/enroll')
    @ApiOperation({ summary: 'Enroll in a training program (increment count)' })
    enroll(@CurrentUser('organizationId') orgId: string, @Param('id') id: string) {
        return this.service.enroll(orgId, id);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Delete a training program' })
    delete(@CurrentUser('organizationId') orgId: string, @Param('id') id: string) {
        return this.service.delete(orgId, id);
    }
}
