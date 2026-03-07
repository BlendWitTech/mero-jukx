import { Controller, Get, Patch, Body, UseGuards, Request } from '@nestjs/common';
import { SettingsService } from '../services/settings.service';
import { UpdateSettingsDto } from '../dto/settings.dto';
import { JwtAuthGuard } from '../../../../src/auth/guards/jwt-auth.guard';
import { AppAccessGuard } from '../../../../src/common/guards/app-access.guard';
import { PermissionsGuard } from '../../../../src/common/guards/permissions.guard';
import { Permissions } from '../../../../src/common/decorators/permissions.decorator';
import { AppSlug } from '../../../../src/common/decorators/app-slug.decorator';

@Controller('cms/settings')
@UseGuards(JwtAuthGuard, AppAccessGuard, PermissionsGuard)
@AppSlug('mero-cms')
export class SettingsController {
    constructor(private readonly settingsService: SettingsService) {}

    @Get()
    @Permissions('cms.settings.view')
    findOne(@Request() req) {
        return this.settingsService.findByOrg(req.user.organizationId);
    }

    @Patch()
    @Permissions('cms.settings.edit')
    update(@Body() dto: UpdateSettingsDto, @Request() req) {
        return this.settingsService.update(req.user.organizationId, dto);
    }
}
