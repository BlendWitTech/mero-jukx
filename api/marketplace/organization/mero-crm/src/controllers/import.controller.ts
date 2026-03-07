import { Controller, Post, UseInterceptors, UploadedFile, UseGuards, Request } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ImportService } from '../services/import.service';
import { JwtAuthGuard } from '../../../../../src/auth/guards/jwt-auth.guard';
import { AppAccessGuard } from '../../../../../src/common/guards/app-access.guard';
import { PermissionsGuard } from '../../../../../src/common/guards/permissions.guard';
import { Permissions } from '../../../../../src/common/decorators/permissions.decorator';
import { AppSlug } from '../../../../../src/common/decorators/app-slug.decorator';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody } from '@nestjs/swagger';

@ApiTags('CRM - Utilities')
@Controller('crm/import')
@UseGuards(JwtAuthGuard, AppAccessGuard, PermissionsGuard)
@AppSlug('mero-crm')
export class ImportController {
    constructor(private readonly importService: ImportService) { }

    @Post('leads')
    @Permissions('crm.leads.create')
    @UseInterceptors(FileInterceptor('file'))
    @ApiConsumes('multipart/form-data')
    @ApiOperation({ summary: 'Import leads from CSV' })
    async importLeads(@Request() req, @UploadedFile() file: Express.Multer.File) {
        return this.importService.importLeadsFromCsv(req.user.organizationId, req.user.id, file.buffer);
    }

    @Post('clients')
    @Permissions('crm.clients.create')
    @UseInterceptors(FileInterceptor('file'))
    @ApiConsumes('multipart/form-data')
    @ApiOperation({ summary: 'Import clients from CSV' })
    async importClients(@Request() req, @UploadedFile() file: Express.Multer.File) {
        return this.importService.importClientsFromCsv(req.user.organizationId, req.user.id, file.buffer);
    }
}
