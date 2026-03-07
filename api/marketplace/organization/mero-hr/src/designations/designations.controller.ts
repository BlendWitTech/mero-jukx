import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { DesignationsService } from './designations.service';
import { JwtAuthGuard } from '../../../../../src/auth/guards/jwt-auth.guard';
import { AppAccessGuard } from '../../../../../src/common/guards/app-access.guard';
import { AppSlug } from '../../../../../src/common/decorators/app-slug.decorator';
import { CurrentUser } from '../../../../../src/common/decorators/current-user.decorator';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('HR Designations')
@Controller('hr/designations')
@UseGuards(JwtAuthGuard, AppAccessGuard)
@AppSlug('mero-hr')
export class DesignationsController {
    constructor(private readonly designationsService: DesignationsService) { }

    @Post()
    @ApiOperation({ summary: 'Create a new designation' })
    create(@CurrentUser('organizationId') organizationId: string, @Body() data: any) {
        return this.designationsService.create(organizationId, data);
    }

    @Get()
    @ApiOperation({ summary: 'Get all designations' })
    findAll(@CurrentUser('organizationId') organizationId: string) {
        return this.designationsService.findAll(organizationId);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get a designation by ID' })
    findOne(@CurrentUser('organizationId') organizationId: string, @Param('id') id: string) {
        return this.designationsService.findOne(organizationId, id);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Update a designation' })
    update(@CurrentUser('organizationId') organizationId: string, @Param('id') id: string, @Body() data: any) {
        return this.designationsService.update(organizationId, id, data);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Delete a designation' })
    remove(@CurrentUser('organizationId') organizationId: string, @Param('id') id: string) {
        return this.designationsService.remove(organizationId, id);
    }
}
