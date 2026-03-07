import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { SerialNumbersService } from '../services/serial-numbers.service';
import { JwtAuthGuard } from '../../../../../src/auth/guards/jwt-auth.guard';
import { AppAccessGuard } from '../../../../../src/common/guards/app-access.guard';
import { PermissionsGuard } from '../../../../../src/common/guards/permissions.guard';
import { AppSlug } from '../../../../../src/common/decorators/app-slug.decorator';
import { SerialNumberStatus } from '../entities/serial-number.entity';

@Controller('inventory/serial-numbers')
@UseGuards(JwtAuthGuard, AppAccessGuard, PermissionsGuard)
@AppSlug('mero-inventory')
export class SerialNumbersController {
    constructor(private readonly service: SerialNumbersService) {}

    @Get()
    findAll(@Request() req, @Query('productId') productId?: string) {
        return this.service.findAll(req.organization.id, productId);
    }

    @Get(':id')
    findOne(@Request() req, @Param('id') id: string) {
        return this.service.findOne(req.organization.id, id);
    }

    @Post()
    create(@Request() req, @Body() body: any) {
        return this.service.create(req.organization.id, body);
    }

    @Post('bulk')
    bulkCreate(@Request() req, @Body() body: { productId: string; warehouseId: string; serials: string[] }) {
        return this.service.bulkCreate(req.organization.id, body.productId, body.warehouseId, body.serials);
    }

    @Patch(':id/status')
    updateStatus(@Request() req, @Param('id') id: string, @Body('status') status: SerialNumberStatus) {
        return this.service.updateStatus(req.organization.id, id, status);
    }

    @Delete(':id')
    remove(@Request() req, @Param('id') id: string) {
        return this.service.remove(req.organization.id, id);
    }
}
