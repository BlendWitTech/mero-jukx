import {
    Controller,
    Get,
    Post,
    Param,
    Body,
    UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '@auth/guards/jwt-auth.guard';
import { AppAccessGuard } from '@common/guards/app-access.guard';
import { AppSlug } from '@common/decorators/app-slug.decorator';
import { CurrentOrganization } from '@common/decorators/current-organization.decorator';
import { CostCentersService } from '../services/cost-centers.service';

@Controller('accounting/cost-centers')
@UseGuards(JwtAuthGuard, AppAccessGuard)
@AppSlug('mero-accounting')
export class CostCentersController {
    constructor(private readonly costCentersService: CostCentersService) { }

    @Get()
    findAll(@CurrentOrganization() organization: any) {
        return this.costCentersService.findAll(organization.id);
    }

    @Get(':id')
    findById(@CurrentOrganization() organization: any, @Param('id') id: string) {
        return this.costCentersService.findById(id, organization.id);
    }

    @Post()
    create(@CurrentOrganization() organization: any, @Body() data: any) {
        return this.costCentersService.createCostCenter(organization.id, data);
    }

    @Get(':id/profitability/:fiscalYearId')
    getProfitability(
        @CurrentOrganization() organization: any,
        @Param('id') id: string,
        @Param('fiscalYearId') fiscalYearId: string
    ) {
        return this.costCentersService.getProfitability(id, organization.id, fiscalYearId);
    }
}
