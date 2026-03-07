import {
    Controller,
    Get,
    Post,
    Delete,
    Param,
    Body,
    UseGuards,
    Req,
    UseInterceptors,
    UploadedFile,
    Query,
    BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '@auth/guards/jwt-auth.guard';
import { AppAccessGuard } from '@common/guards/app-access.guard';
import { AppSlug } from '@common/decorators/app-slug.decorator';
import { CurrentOrganization } from '@common/decorators/current-organization.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { BankingService } from '../services/banking.service';

@Controller('accounting/banking')
@UseGuards(JwtAuthGuard, AppAccessGuard)
@AppSlug('mero-accounting')
export class BankingController {
    constructor(private readonly bankingService: BankingService) { }

    @Get()
    findAll(@CurrentOrganization() organization: any) {
        return this.bankingService.findAll(organization.id);
    }

    @Get('loans')
    findLoans(@CurrentOrganization() organization: any) {
        return this.bankingService.findLoans(organization.id);
    }

    @Post('accounts')
    create(
        @CurrentOrganization() organization: any,
        @CurrentUser() user: any,
        @Body() data: any,
    ) {
        return this.bankingService.create(organization.id, user.userId, data);
    }

    @Post('loans')
    createLoan(
        @CurrentOrganization() organization: any,
        @CurrentUser() user: any,
        @Body() data: any,
    ) {
        return this.bankingService.createLoan(organization.id, user.userId, data);
    }

    @Delete('accounts/:id')
    deleteAccount(
        @Param('id') id: string,
        @CurrentOrganization() organization: any,
    ) {
        return this.bankingService.deleteAccount(id, organization.id);
    }

    @Delete('loans/:id')
    deleteLoan(
        @Param('id') id: string,
        @CurrentOrganization() organization: any,
    ) {
        return this.bankingService.deleteLoan(id, organization.id);
    }

    @Post('transfer')
    transfer(
        @CurrentOrganization() organization: any,
        @CurrentUser() user: any,
        @Body() data: any,
    ) {
        return this.bankingService.transfer(organization.id, user.userId, data);
    }

    @Post('statements/import')
    @UseInterceptors(FileInterceptor('file'))
    async importStatement(
        @UploadedFile() file: Express.Multer.File,
        @Query('bankAccountId') bankAccountId: string,
        @CurrentOrganization() organization: any,
    ) {
        if (!file) throw new BadRequestException('No file uploaded');
        if (!bankAccountId) throw new BadRequestException('bankAccountId query parameter is required');
        const csvText = file.buffer.toString('utf-8');
        return this.bankingService.importFromCsv(organization.id, bankAccountId, csvText);
    }
}
