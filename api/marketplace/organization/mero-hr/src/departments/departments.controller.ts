import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { DepartmentsService } from './departments.service';
import { JwtAuthGuard } from '../../../../../src/auth/guards/jwt-auth.guard';
import { AppAccessGuard } from '../../../../../src/common/guards/app-access.guard';
import { AppSlug } from '../../../../../src/common/decorators/app-slug.decorator';
import { CurrentUser } from '../../../../../src/common/decorators/current-user.decorator';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('HR Departments')
@Controller('hr/departments')
@UseGuards(JwtAuthGuard, AppAccessGuard)
@AppSlug('mero-hr')
export class DepartmentsController {
    constructor(private readonly departmentsService: DepartmentsService) { }

    @Post()
    @ApiOperation({ summary: 'Create a new department' })
    create(@CurrentUser('organizationId') organizationId: string, @Body() data: any) {
        return this.departmentsService.create(organizationId, data);
    }

    @Get()
    @ApiOperation({ summary: 'Get all departments' })
    findAll(@CurrentUser('organizationId') organizationId: string) {
        return this.departmentsService.findAll(organizationId);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get a department by ID' })
    findOne(@CurrentUser('organizationId') organizationId: string, @Param('id') id: string) {
        return this.departmentsService.findOne(organizationId, id);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Update a department' })
    update(@CurrentUser('organizationId') organizationId: string, @Param('id') id: string, @Body() data: any) {
        return this.departmentsService.update(organizationId, id, data);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Delete a department' })
    remove(@CurrentUser('organizationId') organizationId: string, @Param('id') id: string) {
        return this.departmentsService.remove(organizationId, id);
    }
}
