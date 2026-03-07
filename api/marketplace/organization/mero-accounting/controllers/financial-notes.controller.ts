import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@auth/guards/jwt-auth.guard';
import { AppAccessGuard } from '@common/guards/app-access.guard';
import { AppSlug } from '@common/decorators/app-slug.decorator';
import { CurrentOrganization } from '@common/decorators/current-organization.decorator';
import { FinancialNotesService, UpsertFinancialNoteDto } from '../services/financial-notes.service';

@Controller('accounting/financial-notes')
@UseGuards(JwtAuthGuard, AppAccessGuard)
@AppSlug('mero-accounting')
export class FinancialNotesController {
    constructor(private readonly financialNotesService: FinancialNotesService) {}

    @Get()
    findAll(
        @CurrentOrganization() organization: any,
        @Query('fiscalYear') fiscalYear?: string,
    ) {
        if (fiscalYear) {
            return this.financialNotesService.findByFiscalYear(organization.id, fiscalYear);
        }
        return this.financialNotesService.findAll(organization.id);
    }

    @Post()
    create(@Body() dto: UpsertFinancialNoteDto, @CurrentOrganization() organization: any) {
        return this.financialNotesService.create(organization.id, dto);
    }

    @Patch(':id')
    update(
        @Param('id') id: string,
        @Body() dto: Partial<UpsertFinancialNoteDto>,
        @CurrentOrganization() organization: any,
    ) {
        return this.financialNotesService.update(id, organization.id, dto);
    }

    @Delete(':id')
    remove(@Param('id') id: string, @CurrentOrganization() organization: any) {
        return this.financialNotesService.remove(id, organization.id);
    }
}
