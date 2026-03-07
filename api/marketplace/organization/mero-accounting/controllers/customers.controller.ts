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
import { CustomersService } from '../services/customers.service';

@Controller('accounting/customers')
@UseGuards(JwtAuthGuard, AppAccessGuard)
@AppSlug('mero-accounting')
export class CustomersController {
    constructor(private readonly customersService: CustomersService) { }

    @Get()
    findAll(@CurrentOrganization() organization: any) {
        return this.customersService.findAll(organization.id);
    }

    @Get(':id')
    findById(@CurrentOrganization() organization: any, @Param('id') id: string) {
        return this.customersService.findById(id, organization.id);
    }

    @Post()
    create(@CurrentOrganization() organization: any, @Body() data: any) {
        return this.customersService.create(organization.id, data);
    }

    @Put(':id')
    update(
        @CurrentOrganization() organization: any,
        @Param('id') id: string,
        @Body() data: any,
    ) {
        return this.customersService.update(id, organization.id, data);
    }

    @Delete(':id')
    delete(@CurrentOrganization() organization: any, @Param('id') id: string) {
        return this.customersService.delete(id, organization.id);
    }
}
