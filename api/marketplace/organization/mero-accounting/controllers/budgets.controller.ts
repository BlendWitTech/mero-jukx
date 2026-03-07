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
import { BudgetsService } from '../services/budgets.service';

@Controller('accounting/budgets')
@UseGuards(JwtAuthGuard, AppAccessGuard)
@AppSlug('mero-accounting')
export class BudgetsController {
    constructor(private readonly budgetsService: BudgetsService) { }

    @Get()
    findAll(@CurrentOrganization() organization: any) {
        return this.budgetsService.findAll(organization.id);
    }

    @Get(':id')
    findById(@CurrentOrganization() organization: any, @Param('id') id: string) {
        return this.budgetsService.findById(id, organization.id);
    }

    @Post()
    create(@CurrentOrganization() organization: any, @Body() data: any) {
        return this.budgetsService.createBudget(organization.id, data);
    }

    @Get(':id/variance')
    getVariance(@CurrentOrganization() organization: any, @Param('id') id: string) {
        return this.budgetsService.getBudgetVariance(id, organization.id);
    }
}
