import {
    Controller,
    Get,
    Post,
    Param,
    Body,
    UseGuards,
    Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '@auth/guards/jwt-auth.guard';
import { AppAccessGuard } from '@common/guards/app-access.guard';
import { AppSlug } from '@common/decorators/app-slug.decorator';
import { CurrentOrganization } from '@common/decorators/current-organization.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { FixedAssetsService } from '../services/fixed-assets.service';

@Controller('accounting/fixed-assets')
@UseGuards(JwtAuthGuard, AppAccessGuard)
@AppSlug('mero-accounting')
export class FixedAssetsController {
    constructor(private readonly assetService: FixedAssetsService) { }

    @Get()
    findAll(@CurrentOrganization() organization: any) {
        return this.assetService.findAll(organization.id);
    }

    @Post()
    create(@CurrentOrganization() organization: any, @Body() data: any) {
        return this.assetService.create(organization.id, data);
    }

    @Post(':id/depreciate')
    runDepreciation(
        @CurrentOrganization() organization: any,
        @CurrentUser() user: any,
        @Param('id') id: string,
        @Body() body: { date: Date, unitsProducedThisPeriod?: number },
    ) {
        return this.assetService.runDepreciation(
            id,
            organization.id,
            user.userId,
            body.date,
            body.unitsProducedThisPeriod
        );
    }

    @Post(':id/dispose')
    disposeAsset(
        @CurrentOrganization() organization: any,
        @CurrentUser() user: any,
        @Param('id') id: string,
        @Body() body: { date: Date, salePrice: number, bankAccountId: string },
    ) {
        return this.assetService.disposeAsset(id, organization.id, user.userId, body.date, body.salePrice, body.bankAccountId);
    }

    @Post(':id/revalue')
    revalueAsset(
        @CurrentOrganization() organization: any,
        @CurrentUser() user: any,
        @Param('id') id: string,
        @Body() body: { date: Date, newFairValue: number },
    ) {
        return this.assetService.revalueAsset(id, organization.id, user.userId, body.date, body.newFairValue);
    }

    @Post(':id/maintenance')
    logMaintenance(
        @CurrentOrganization() organization: any,
        @CurrentUser() user: any,
        @Param('id') id: string,
        @Body() body: { maintenanceDate: Date, description: string, cost: number, vendorId?: string, expenseAccountId?: string, payableAccountId?: string },
    ) {
        return this.assetService.logMaintenance(id, organization.id, user.userId, body);
    }

    @Get(':id/maintenance')
    getMaintenanceHistory(
        @CurrentOrganization() organization: any,
        @Param('id') id: string,
    ) {
        return this.assetService.getMaintenanceHistory(id, organization.id);
    }
}
