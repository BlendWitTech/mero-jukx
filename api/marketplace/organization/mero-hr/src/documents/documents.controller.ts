import { Controller, Get, Post, Body, Param, Delete, UseGuards, Query } from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { JwtAuthGuard } from '../../../../../src/auth/guards/jwt-auth.guard';
import { AppAccessGuard } from '../../../../../src/common/guards/app-access.guard';
import { AppSlug } from '../../../../../src/common/decorators/app-slug.decorator';
import { CurrentUser } from '../../../../../src/common/decorators/current-user.decorator';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('HR Documents')
@Controller('hr/documents')
@UseGuards(JwtAuthGuard, AppAccessGuard)
@AppSlug('mero-hr')
export class DocumentsController {
    constructor(private readonly documentsService: DocumentsService) { }

    @Post()
    @ApiOperation({ summary: 'Upload/Link a new document' })
    create(@CurrentUser('organizationId') organizationId: string, @Body() data: any) {
        return this.documentsService.create(organizationId, data);
    }

    @Get()
    @ApiOperation({ summary: 'Get all HR documents' })
    findAll(@CurrentUser('organizationId') organizationId: string, @Query('employeeId') employeeId?: string) {
        return this.documentsService.findAll(organizationId, employeeId);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get a document by ID' })
    findOne(@CurrentUser('organizationId') organizationId: string, @Param('id') id: string) {
        return this.documentsService.findOne(organizationId, id);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Delete a document' })
    remove(@CurrentUser('organizationId') organizationId: string, @Param('id') id: string) {
        return this.documentsService.remove(organizationId, id);
    }
}
