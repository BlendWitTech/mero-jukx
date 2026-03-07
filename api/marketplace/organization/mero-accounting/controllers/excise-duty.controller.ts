import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@auth/guards/jwt-auth.guard';
import { AppAccessGuard } from '@common/guards/app-access.guard';
import { AppSlug } from '@common/decorators/app-slug.decorator';
import { CurrentOrganization } from '@common/decorators/current-organization.decorator';
import { ExciseDutyService, CreateExciseDutyDto } from '../services/excise-duty.service';

@Controller('accounting/excise-duty')
@UseGuards(JwtAuthGuard, AppAccessGuard)
@AppSlug('mero-accounting')
export class ExciseDutyController {
    constructor(private readonly exciseDutyService: ExciseDutyService) {}

    @Get()
    findAll(@CurrentOrganization() organization: any) {
        return this.exciseDutyService.findAll(organization.id);
    }

    @Post()
    create(@Body() dto: CreateExciseDutyDto, @CurrentOrganization() organization: any) {
        return this.exciseDutyService.create(organization.id, dto);
    }

    @Patch(':id')
    update(
        @Param('id') id: string,
        @Body() dto: Partial<CreateExciseDutyDto>,
        @CurrentOrganization() organization: any,
    ) {
        return this.exciseDutyService.update(id, organization.id, dto);
    }

    @Delete(':id')
    remove(@Param('id') id: string, @CurrentOrganization() organization: any) {
        return this.exciseDutyService.remove(id, organization.id);
    }
}
