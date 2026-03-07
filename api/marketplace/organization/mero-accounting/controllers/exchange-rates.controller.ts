import {
    Controller,
    Get,
    Post,
    Body,
    UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '@auth/guards/jwt-auth.guard';
import { AppAccessGuard } from '@common/guards/app-access.guard';
import { AppSlug } from '@common/decorators/app-slug.decorator';
import { CurrentOrganization } from '@common/decorators/current-organization.decorator';
import { ExchangeRatesService } from '../services/exchange-rates.service';

@Controller('accounting/exchange-rates')
@UseGuards(JwtAuthGuard, AppAccessGuard)
@AppSlug('mero-accounting')
export class ExchangeRatesController {
    constructor(private readonly exchangeRatesService: ExchangeRatesService) { }

    @Get()
    getActiveRates(@CurrentOrganization() organization: any) {
        return this.exchangeRatesService.getActiveRates(organization.id);
    }

    @Post()
    createRate(@CurrentOrganization() organization: any, @Body() data: any) {
        return this.exchangeRatesService.createRate(organization.id, data);
    }
}
