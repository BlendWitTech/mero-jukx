import { Controller, Get, Post, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { PurchaseRequisitionsService } from '../services/purchase-requisitions.service';
import { JwtAuthGuard } from '../../../../../src/auth/guards/jwt-auth.guard';
import { AppAccessGuard } from '../../../../../src/common/guards/app-access.guard';
import { PermissionsGuard } from '../../../../../src/common/guards/permissions.guard';
import { AppSlug } from '../../../../../src/common/decorators/app-slug.decorator';

@Controller('inventory/purchase-requisitions')
@UseGuards(JwtAuthGuard, AppAccessGuard, PermissionsGuard)
@AppSlug('mero-inventory')
export class PurchaseRequisitionsController {
    constructor(private readonly service: PurchaseRequisitionsService) {}

    @Get()
    findAll(@Request() req) {
        return this.service.findAll(req.organization.id);
    }

    @Get(':id')
    findOne(@Request() req, @Param('id') id: string) {
        return this.service.findOne(req.organization.id, id);
    }

    @Post()
    create(@Request() req, @Body() body: any) {
        return this.service.create(req.organization.id, req.user.id, body);
    }

    @Post(':id/submit')
    submit(@Request() req, @Param('id') id: string) {
        return this.service.submit(req.organization.id, id);
    }

    @Post(':id/approve')
    approve(@Request() req, @Param('id') id: string) {
        return this.service.approve(req.organization.id, id, req.user.id);
    }

    @Post(':id/reject')
    reject(@Request() req, @Param('id') id: string, @Body('rejection_reason') reason: string) {
        return this.service.reject(req.organization.id, id, req.user.id, reason);
    }

    @Post(':id/convert-to-po')
    convertToPO(@Request() req, @Param('id') id: string, @Body('supplierId') supplierId: string) {
        return this.service.convertToPO(req.organization.id, id, supplierId);
    }

    @Delete(':id')
    remove(@Request() req, @Param('id') id: string) {
        return this.service.remove(req.organization.id, id);
    }
}
