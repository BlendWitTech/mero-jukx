import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { ShiftService } from './shift.service';
import { HrShift } from '../../../../../src/database/entities';
import { JwtAuthGuard } from '../../../../../src/auth/guards/jwt-auth.guard';
import { AppAccessGuard } from '../../../../../src/common/guards/app-access.guard';
import { AppSlug } from '../../../../../src/common/decorators/app-slug.decorator';
import { CurrentUser } from '../../../../../src/common/decorators/current-user.decorator';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('HR Shifts')
@Controller('hr/shifts')
@UseGuards(JwtAuthGuard, AppAccessGuard)
@AppSlug('mero-hr')
export class ShiftController {
    constructor(private readonly shiftService: ShiftService) { }

    @Post()
    @ApiOperation({ summary: 'Create a shift' })
    create(@CurrentUser('organizationId') organizationId: string, @Body() dto: Partial<HrShift>) {
        return this.shiftService.create(organizationId, dto);
    }

    @Get()
    @ApiOperation({ summary: 'List all shifts' })
    findAll(@CurrentUser('organizationId') organizationId: string) {
        return this.shiftService.findAll(organizationId);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get a shift by ID' })
    findOne(@CurrentUser('organizationId') organizationId: string, @Param('id') id: string) {
        return this.shiftService.findOne(organizationId, id);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Update a shift' })
    update(@CurrentUser('organizationId') organizationId: string, @Param('id') id: string, @Body() dto: Partial<HrShift>) {
        return this.shiftService.update(organizationId, id, dto);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Delete a shift' })
    remove(@CurrentUser('organizationId') organizationId: string, @Param('id') id: string) {
        return this.shiftService.remove(organizationId, id);
    }
}
