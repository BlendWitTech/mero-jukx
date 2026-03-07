import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Body,
    Param,
    UseGuards,
    UseInterceptors,
    UploadedFile
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '@auth/guards/jwt-auth.guard';
import { AppAccessGuard } from '@common/guards/app-access.guard';
import { AppSlug } from '@common/decorators/app-slug.decorator';
import { CurrentOrganization } from '@common/decorators/current-organization.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { AccountsService } from '../services/accounts.service';

@Controller('accounting/accounts')
@UseGuards(JwtAuthGuard, AppAccessGuard)
@AppSlug('mero-accounting')
export class AccountsController {
    constructor(private readonly accountsService: AccountsService) { }

    @Get()
    findAll(@CurrentOrganization() organization: any) {
        return this.accountsService.findAll(organization.id);
    }

    @Get(':id/ledger')
    getLedger(@Param('id') id: string, @CurrentOrganization() organization: any) {
        return this.accountsService.getLedger(id, organization.id);
    }

    @Get(':id')
    findOne(@Param('id') id: string, @CurrentOrganization() organization: any) {
        return this.accountsService.findById(id, organization.id);
    }

    @Post()
    create(@CurrentOrganization() organization: any, @Body() data: any) {
        return this.accountsService.create(organization.id, data);
    }

    @Post('import')
    @UseInterceptors(FileInterceptor('file'))
    importCoa(
        @UploadedFile() file: Express.Multer.File,
        @CurrentOrganization() organization: any,
        @CurrentUser() user: any
    ) {
        return this.accountsService.importCoa(organization.id, user.id, file.buffer);
    }

    @Put(':id')
    update(
        @Param('id') id: string,
        @CurrentOrganization() organization: any,
        @Body() data: any,
    ) {
        return this.accountsService.update(id, organization.id, data);
    }

    @Delete(':id')
    remove(@Param('id') id: string, @CurrentOrganization() organization: any) {
        return this.accountsService.delete(id, organization.id);
    }
}
