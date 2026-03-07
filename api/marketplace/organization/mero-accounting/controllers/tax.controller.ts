import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@auth/guards/jwt-auth.guard';
import { AppAccessGuard } from '@common/guards/app-access.guard';
import { AppSlug } from '@common/decorators/app-slug.decorator';
import { TaxService } from '../services/tax.service';

@Controller('accounting/tax')
@UseGuards(JwtAuthGuard, AppAccessGuard)
@AppSlug('mero-accounting')
export class TaxController {
    constructor(private readonly taxService: TaxService) { }

    @Get('vat-categories')
    getVatCategories() {
        return this.taxService.getVatCategories();
    }

    @Get('tds-categories')
    getTdsCategories() {
        return this.taxService.getTdsCategories();
    }
}
