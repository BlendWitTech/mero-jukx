import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { CommissionService } from '../services/commission.service';
import { JwtAuthGuard } from '../../../../../src/auth/guards/jwt-auth.guard';
import { AppAccessGuard } from '../../../../../src/common/guards/app-access.guard';
import { PermissionsGuard } from '../../../../../src/common/guards/permissions.guard';
import { AppSlug } from '../../../../../src/common/decorators/app-slug.decorator';

@Controller('inventory/commission')
@UseGuards(JwtAuthGuard, AppAccessGuard, PermissionsGuard)
@AppSlug('mero-inventory')
export class CommissionController {
    constructor(private readonly service: CommissionService) {}

    @Get('rules')
    getRules(@Request() req) {
        return this.service.getRules(req.organization.id);
    }

    @Post('rules')
    createRule(@Request() req, @Body() body: any) {
        return this.service.createRule(req.organization.id, body);
    }

    @Patch('rules/:id')
    updateRule(@Request() req, @Param('id') id: string, @Body() body: any) {
        return this.service.updateRule(req.organization.id, id, body);
    }

    @Delete('rules/:id')
    removeRule(@Request() req, @Param('id') id: string) {
        return this.service.removeRule(req.organization.id, id);
    }

    @Get('records')
    getRecords(@Request() req) {
        return this.service.getRecords(req.organization.id);
    }

    @Get('summary')
    getSummary(@Request() req) {
        return this.service.getSummary(req.organization.id);
    }

    @Post('calculate/:salesOrderId')
    calculateForOrder(@Request() req, @Param('salesOrderId') salesOrderId: string, @Body('salesPerson') salesPerson?: string) {
        return this.service.calculateForOrder(req.organization.id, salesOrderId, salesPerson);
    }

    @Post('records/:id/mark-paid')
    markPaid(@Request() req, @Param('id') id: string) {
        return this.service.markPaid(req.organization.id, id);
    }
}
