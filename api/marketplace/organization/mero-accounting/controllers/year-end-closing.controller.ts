import {
    Controller,
    Get,
    Post,
    Body,
    Param,
    UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '@auth/guards/jwt-auth.guard';
import { AppAccessGuard } from '@common/guards/app-access.guard';
import { AppSlug } from '@common/decorators/app-slug.decorator';
import { CurrentOrganization } from '@common/decorators/current-organization.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { YearEndClosingService } from '../services/year-end-closing.service';

@Controller('accounting/fiscal-years')
@UseGuards(JwtAuthGuard, AppAccessGuard)
@AppSlug('mero-accounting')
export class YearEndClosingController {
    constructor(private readonly yearEndClosingService: YearEndClosingService) { }

    @Get()
    findAll(@CurrentOrganization() organization: any) {
        return this.yearEndClosingService.getFiscalYears(organization.id);
    }

    @Post()
    create(
        @CurrentOrganization() organization: any,
        @Body() data: { year: string, startDate: string, endDate: string }
    ) {
        return this.yearEndClosingService.createFiscalYear(organization.id, data);
    }

    @Post(':id/close')
    close(
        @Param('id') id: string,
        @CurrentOrganization() organization: any,
        @CurrentUser() user: any
    ) {
        return this.yearEndClosingService.closeFiscalYear(organization.id, id, user.id);
    }
}
