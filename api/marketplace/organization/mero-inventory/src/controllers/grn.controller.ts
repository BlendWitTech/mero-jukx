import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { GRNService } from '../services/grn.service';
import { JwtAuthGuard } from '../../../../../src/auth/guards/jwt-auth.guard';
import { AppAccessGuard } from '../../../../../src/common/guards/app-access.guard';
import { PermissionsGuard } from '../../../../../src/common/guards/permissions.guard';
import { AppSlug } from '../../../../../src/common/decorators/app-slug.decorator';

@Controller('inventory/grn')
@UseGuards(JwtAuthGuard, AppAccessGuard, PermissionsGuard)
@AppSlug('mero-inventory')
export class GRNController {
    constructor(private readonly service: GRNService) {}

    @Get()
    findAll(@Request() req) {
        return this.service.findAll(req.organization.id);
    }

    @Get(':id')
    findOne(@Request() req, @Param('id') id: string) {
        return this.service.findOne(req.organization.id, id);
    }

    @Get('three-way-match/:purchaseOrderId')
    threeWayMatch(@Request() req, @Param('purchaseOrderId') purchaseOrderId: string) {
        return this.service.getThreeWayMatch(req.organization.id, purchaseOrderId);
    }

    @Post()
    create(@Request() req, @Body() body: any) {
        return this.service.create(req.organization.id, req.user.id, body);
    }

    @Post(':id/confirm')
    confirm(@Request() req, @Param('id') id: string) {
        return this.service.confirm(req.organization.id, id, req.user.id);
    }
}
