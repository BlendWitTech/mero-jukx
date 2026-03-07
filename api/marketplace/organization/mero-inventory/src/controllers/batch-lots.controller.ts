import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { BatchLotsService } from '../services/batch-lots.service';
import { JwtAuthGuard } from '../../../../../src/auth/guards/jwt-auth.guard';
import { AppAccessGuard } from '../../../../../src/common/guards/app-access.guard';
import { PermissionsGuard } from '../../../../../src/common/guards/permissions.guard';
import { AppSlug } from '../../../../../src/common/decorators/app-slug.decorator';

@Controller('inventory/batch-lots')
@UseGuards(JwtAuthGuard, AppAccessGuard, PermissionsGuard)
@AppSlug('mero-inventory')
export class BatchLotsController {
    constructor(private readonly service: BatchLotsService) {}

    @Get()
    findAll(@Request() req, @Query('productId') productId?: string) {
        return this.service.findAll(req.organization.id, productId);
    }

    @Get('expiring')
    getExpiring(@Request() req, @Query('days') days?: string) {
        return this.service.getExpiringBatches(req.organization.id, days ? parseInt(days) : 30);
    }

    @Get(':id')
    findOne(@Request() req, @Param('id') id: string) {
        return this.service.findOne(req.organization.id, id);
    }

    @Post()
    create(@Request() req, @Body() body: any) {
        return this.service.create(req.organization.id, body);
    }

    @Patch(':id')
    update(@Request() req, @Param('id') id: string, @Body() body: any) {
        return this.service.update(req.organization.id, id, body);
    }

    @Post(':id/consume')
    consume(@Request() req, @Param('id') id: string, @Body('quantity') quantity: number) {
        return this.service.consume(req.organization.id, id, quantity);
    }

    @Delete(':id')
    remove(@Request() req, @Param('id') id: string) {
        return this.service.remove(req.organization.id, id);
    }
}
