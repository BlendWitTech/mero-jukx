import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, Query, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { MediaService } from '../services/media.service';
import { UpdateMediaDto } from '../dto/media.dto';
import { JwtAuthGuard } from '../../../../src/auth/guards/jwt-auth.guard';
import { AppAccessGuard } from '../../../../src/common/guards/app-access.guard';
import { PermissionsGuard } from '../../../../src/common/guards/permissions.guard';
import { Permissions } from '../../../../src/common/decorators/permissions.decorator';
import { AppSlug } from '../../../../src/common/decorators/app-slug.decorator';

@Controller('cms/media')
@UseGuards(JwtAuthGuard, AppAccessGuard, PermissionsGuard)
@AppSlug('mero-cms')
export class MediaController {
    constructor(private readonly mediaService: MediaService) {}

    @Get()
    @Permissions('cms.media.view')
    findAll(@Request() req, @Query('folder') folder?: string) {
        return this.mediaService.findAll(req.user.organizationId, folder);
    }

    @Get('folders')
    @Permissions('cms.media.view')
    getFolders(@Request() req) {
        return this.mediaService.getFolders(req.user.organizationId);
    }

    @Get('stats')
    @Permissions('cms.media.view')
    getStats(@Request() req) {
        return this.mediaService.getStats(req.user.organizationId);
    }

    @Get(':id')
    @Permissions('cms.media.view')
    findOne(@Param('id') id: string, @Request() req) {
        return this.mediaService.findOne(id, req.user.organizationId);
    }

    @Post('upload')
    @Permissions('cms.media.upload')
    @UseInterceptors(FileInterceptor('file'))
    upload(
        @UploadedFile() file: Express.Multer.File,
        @Request() req,
        @Query('folder') folder?: string,
    ) {
        return this.mediaService.create(
            {
                filename: file.filename || file.originalname,
                originalname: file.originalname,
                mimetype: file.mimetype,
                size: file.size,
                path: file.path || file.originalname,
            },
            req.user.organizationId,
            req.user.userId,
            folder,
        );
    }

    @Patch(':id')
    @Permissions('cms.media.upload')
    update(@Param('id') id: string, @Body() dto: UpdateMediaDto, @Request() req) {
        return this.mediaService.update(id, dto, req.user.organizationId);
    }

    @Delete(':id')
    @Permissions('cms.media.delete')
    remove(@Param('id') id: string, @Request() req) {
        return this.mediaService.remove(id, req.user.organizationId);
    }
}
