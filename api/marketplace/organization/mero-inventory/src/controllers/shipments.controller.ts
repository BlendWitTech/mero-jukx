import { Controller, Get, Post, Body, Put, Param, UseGuards, Request } from '@nestjs/common';
import { ShipmentsService } from '../services/shipments.service';
import { ShipmentStatus } from '../entities/shipment.entity';
import { JwtAuthGuard } from '../../../../../src/auth/guards/jwt-auth.guard';
import { AppAccessGuard } from '../../../../../src/common/guards/app-access.guard';
import { PermissionsGuard } from '../../../../../src/common/guards/permissions.guard';
import { AppSlug } from '../../../../../src/common/decorators/app-slug.decorator';

@Controller('inventory/shipments')
@UseGuards(JwtAuthGuard, AppAccessGuard, PermissionsGuard)
@AppSlug('mero-inventory')
export class ShipmentsController {
    constructor(private readonly shipmentsService: ShipmentsService) { }

    @Post()
    create(
        @Body() body: any,
        @Request() req
    ) {
        return this.shipmentsService.create(body.salesOrderId, req.user.organizationId, req.user.userId, body);
    }

    @Get()
    findAll(@Request() req) {
        return this.shipmentsService.findAll(req.user.organizationId);
    }

    @Get(':id')
    findOne(
        @Param('id') id: string,
        @Request() req
    ) {
        return this.shipmentsService.findOne(id, req.user.organizationId);
    }

    @Put(':id/status')
    updateStatus(
        @Param('id') id: string,
        @Body('status') status: ShipmentStatus,
        @Request() req
    ) {
        return this.shipmentsService.updateStatus(id, status, req.user.organizationId, req.user.userId);
    }
}
