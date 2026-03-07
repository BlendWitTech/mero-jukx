import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { PagesService } from '../services/pages.service';
import { CreatePageDto, UpdatePageDto } from '../dto/page.dto';
import { JwtAuthGuard } from '../../../../src/auth/guards/jwt-auth.guard';
import { AppAccessGuard } from '../../../../src/common/guards/app-access.guard';
import { PermissionsGuard } from '../../../../src/common/guards/permissions.guard';
import { Permissions } from '../../../../src/common/decorators/permissions.decorator';
import { AppSlug } from '../../../../src/common/decorators/app-slug.decorator';

@Controller('cms/pages')
@UseGuards(JwtAuthGuard, AppAccessGuard, PermissionsGuard)
@AppSlug('mero-cms')
export class PagesController {
    constructor(private readonly pagesService: PagesService) {}

    @Get()
    @Permissions('cms.pages.view')
    findAll(@Request() req) {
        return this.pagesService.findAll(req.user.organizationId);
    }

    @Get('stats')
    @Permissions('cms.pages.view')
    getStats(@Request() req) {
        return this.pagesService.getStats(req.user.organizationId);
    }

    @Get(':id')
    @Permissions('cms.pages.view')
    findOne(@Param('id') id: string, @Request() req) {
        return this.pagesService.findOne(id, req.user.organizationId);
    }

    @Post()
    @Permissions('cms.pages.create')
    create(@Body() dto: CreatePageDto, @Request() req) {
        return this.pagesService.create(dto, req.user.organizationId, req.user.userId);
    }

    @Patch(':id')
    @Permissions('cms.pages.edit')
    update(@Param('id') id: string, @Body() dto: UpdatePageDto, @Request() req) {
        return this.pagesService.update(id, dto, req.user.organizationId);
    }

    @Post(':id/publish')
    @Permissions('cms.pages.edit')
    publish(@Param('id') id: string, @Request() req) {
        return this.pagesService.publish(id, req.user.organizationId);
    }

    @Post(':id/unpublish')
    @Permissions('cms.pages.edit')
    unpublish(@Param('id') id: string, @Request() req) {
        return this.pagesService.unpublish(id, req.user.organizationId);
    }

    @Delete(':id')
    @Permissions('cms.pages.delete')
    remove(@Param('id') id: string, @Request() req) {
        return this.pagesService.remove(id, req.user.organizationId);
    }
}
