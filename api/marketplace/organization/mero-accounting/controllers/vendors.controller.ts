import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Body,
    Param,
    UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '@auth/guards/jwt-auth.guard';
import { AppAccessGuard } from '@common/guards/app-access.guard';
import { AppSlug } from '@common/decorators/app-slug.decorator';
import { CurrentOrganization } from '@common/decorators/current-organization.decorator';
import { VendorsService } from '../services/vendors.service';

@Controller('accounting/vendors')
@UseGuards(JwtAuthGuard, AppAccessGuard)
@AppSlug('mero-accounting')
export class VendorsController {
    constructor(private readonly vendorsService: VendorsService) { }

    @Get()
    findAll(@CurrentOrganization() organization: any) {
        return this.vendorsService.findAll(organization.id);
    }

    @Get(':id')
    findById(@CurrentOrganization() organization: any, @Param('id') id: string) {
        return this.vendorsService.findById(id, organization.id);
    }

    @Post()
    create(@CurrentOrganization() organization: any, @Body() data: any) {
        return this.vendorsService.create(organization.id, data);
    }

    @Put(':id')
    update(
        @CurrentOrganization() organization: any,
        @Param('id') id: string,
        @Body() data: any,
    ) {
        return this.vendorsService.update(id, organization.id, data);
    }

    @Delete(':id')
    delete(@CurrentOrganization() organization: any, @Param('id') id: string) {
        return this.vendorsService.delete(id, organization.id);
    }
}
