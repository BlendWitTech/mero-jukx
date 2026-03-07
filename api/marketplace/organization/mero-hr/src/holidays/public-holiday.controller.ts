import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { PublicHolidayService } from './public-holiday.service';
import { HrPublicHoliday } from '../../../../../src/database/entities';
import { JwtAuthGuard } from '../../../../../src/auth/guards/jwt-auth.guard';
import { AppAccessGuard } from '../../../../../src/common/guards/app-access.guard';
import { AppSlug } from '../../../../../src/common/decorators/app-slug.decorator';
import { CurrentUser } from '../../../../../src/common/decorators/current-user.decorator';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('HR Public Holidays')
@Controller('hr/holidays')
@UseGuards(JwtAuthGuard, AppAccessGuard)
@AppSlug('mero-hr')
export class PublicHolidayController {
    constructor(private readonly holidayService: PublicHolidayService) { }

    @Post()
    @ApiOperation({ summary: 'Create a public holiday' })
    create(@CurrentUser('organizationId') organizationId: string, @Body() dto: Partial<HrPublicHoliday>) {
        return this.holidayService.create(organizationId, dto);
    }

    @Get()
    @ApiOperation({ summary: 'List public holidays' })
    findAll(@CurrentUser('organizationId') organizationId: string, @Query('year') year?: string) {
        return this.holidayService.findAll(organizationId, year ? +year : undefined);
    }

    @Post('seed-2081')
    @ApiOperation({ summary: 'Seed standard Nepal FY 2081 holidays for this organization' })
    seed(@CurrentUser('organizationId') organizationId: string) {
        return this.holidayService.seedNepalHolidays2081(organizationId);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Update a holiday' })
    update(@CurrentUser('organizationId') organizationId: string, @Param('id') id: string, @Body() dto: Partial<HrPublicHoliday>) {
        return this.holidayService.update(organizationId, id, dto);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Delete a holiday' })
    remove(@CurrentUser('organizationId') organizationId: string, @Param('id') id: string) {
        return this.holidayService.remove(organizationId, id);
    }
}
