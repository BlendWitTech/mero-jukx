import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { BackordersService } from '../services/backorders.service';
import { JwtAuthGuard } from '../../../../../src/auth/guards/jwt-auth.guard';
import { AppAccessGuard } from '../../../../../src/common/guards/app-access.guard';
import { PermissionsGuard } from '../../../../../src/common/guards/permissions.guard';
import { AppSlug } from '../../../../../src/common/decorators/app-slug.decorator';
import { BackorderStatus } from '../entities/backorder.entity';

@Controller('inventory/backorders')
@UseGuards(JwtAuthGuard, AppAccessGuard, PermissionsGuard)
@AppSlug('mero-inventory')
export class BackordersController {
    constructor(private readonly service: BackordersService) {}

    @Get()
    findAll(@Request() req, @Query('status') status?: BackorderStatus) {
        return this.service.findAll(req.organization.id, status);
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

    @Post(':id/fulfill')
    fulfill(@Request() req, @Param('id') id: string, @Body('quantity') quantity: number) {
        return this.service.fulfill(req.organization.id, id, quantity);
    }

    @Post(':id/cancel')
    cancel(@Request() req, @Param('id') id: string) {
        return this.service.cancel(req.organization.id, id);
    }
}
