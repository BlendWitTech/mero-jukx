import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query } from '@nestjs/common';
import { ExitService } from './exit.service';
import { JwtAuthGuard } from '../../../../../src/auth/guards/jwt-auth.guard';
import { AppAccessGuard } from '../../../../../src/common/guards/app-access.guard';
import { AppSlug } from '../../../../../src/common/decorators/app-slug.decorator';
import { CurrentUser } from '../../../../../src/common/decorators/current-user.decorator';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('HR Exit Management')
@Controller('hr/exit')
@UseGuards(JwtAuthGuard, AppAccessGuard)
@AppSlug('mero-hr')
export class ExitController {
    constructor(private readonly service: ExitService) { }

    @Get()
    @ApiOperation({ summary: 'List all exit records' })
    getAll(@CurrentUser('organizationId') orgId: string, @Query('status') status?: string) {
        return this.service.getAll(orgId, status);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get a single exit record' })
    getOne(@CurrentUser('organizationId') orgId: string, @Param('id') id: string) {
        return this.service.getOne(orgId, id);
    }

    @Post()
    @ApiOperation({ summary: 'Initiate an exit process' })
    create(@CurrentUser('organizationId') orgId: string, @Body() body: any) {
        return this.service.create(orgId, body);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Update exit record (clearance, settlement, etc.)' })
    update(@CurrentUser('organizationId') orgId: string, @Param('id') id: string, @Body() body: any) {
        return this.service.update(orgId, id, body);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Delete an exit record' })
    delete(@CurrentUser('organizationId') orgId: string, @Param('id') id: string) {
        return this.service.delete(orgId, id);
    }
}
