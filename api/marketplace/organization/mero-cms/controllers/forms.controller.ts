import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, Ip } from '@nestjs/common';
import { FormsService } from '../services/forms.service';
import { CreateFormDto, UpdateFormDto, SubmitFormDto } from '../dto/form.dto';
import { JwtAuthGuard } from '../../../../src/auth/guards/jwt-auth.guard';
import { AppAccessGuard } from '../../../../src/common/guards/app-access.guard';
import { PermissionsGuard } from '../../../../src/common/guards/permissions.guard';
import { Permissions } from '../../../../src/common/decorators/permissions.decorator';
import { AppSlug } from '../../../../src/common/decorators/app-slug.decorator';

@Controller('cms/forms')
@UseGuards(JwtAuthGuard, AppAccessGuard, PermissionsGuard)
@AppSlug('mero-cms')
export class FormsController {
    constructor(private readonly formsService: FormsService) {}

    @Get()
    @Permissions('cms.forms.view')
    findAll(@Request() req) {
        return this.formsService.findAll(req.user.organizationId);
    }

    @Get('stats')
    @Permissions('cms.forms.view')
    getStats(@Request() req) {
        return this.formsService.getStats(req.user.organizationId);
    }

    @Get(':id')
    @Permissions('cms.forms.view')
    findOne(@Param('id') id: string, @Request() req) {
        return this.formsService.findOne(id, req.user.organizationId);
    }

    @Get(':id/submissions')
    @Permissions('cms.forms.view')
    getSubmissions(@Param('id') id: string, @Request() req) {
        return this.formsService.getSubmissions(id, req.user.organizationId);
    }

    @Post()
    @Permissions('cms.forms.create')
    create(@Body() dto: CreateFormDto, @Request() req) {
        return this.formsService.create(dto, req.user.organizationId);
    }

    @Post(':id/submit')
    @Permissions('cms.forms.view')
    submit(@Param('id') id: string, @Body() dto: SubmitFormDto, @Request() req, @Ip() ip: string) {
        return this.formsService.submit(id, req.user.organizationId, dto, ip);
    }

    @Patch(':id')
    @Permissions('cms.forms.edit')
    update(@Param('id') id: string, @Body() dto: UpdateFormDto, @Request() req) {
        return this.formsService.update(id, dto, req.user.organizationId);
    }

    @Delete(':id')
    @Permissions('cms.forms.delete')
    remove(@Param('id') id: string, @Request() req) {
        return this.formsService.remove(id, req.user.organizationId);
    }
}
