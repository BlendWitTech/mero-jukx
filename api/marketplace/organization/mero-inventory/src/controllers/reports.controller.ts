import { Controller, Get, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ReportsService } from '../services/reports.service';
import { JwtAuthGuard } from '../../../../../src/auth/guards/jwt-auth.guard';
import { AppAccessGuard } from '../../../../../src/common/guards/app-access.guard';
import { PermissionsGuard } from '../../../../../src/common/guards/permissions.guard';
import { AppSlug } from '../../../../../src/common/decorators/app-slug.decorator';
import { CurrentOrganization } from '../../../../../src/common/decorators/current-organization.decorator';

@Controller('inventory/reports')
@UseGuards(JwtAuthGuard, AppAccessGuard, PermissionsGuard)
@AppSlug('mero-inventory')
export class ReportsController {
    constructor(private readonly reportsService: ReportsService) { }

    @Get('dashboard')
    getDashboardStats(@CurrentOrganization('id') orgId: string) {
        return this.reportsService.getDashboardStats(orgId);
    }

    @Get('stock-valuation')
    getStockValuation(@CurrentOrganization('id') orgId: string) {
        return this.reportsService.getStockValuation(orgId);
    }

    @Get('low-stock')
    getLowStockAlerts(
        @CurrentOrganization('id') orgId: string,
        @Query('threshold') threshold?: number
    ) {
        return this.reportsService.getLowStockAlerts(orgId);
    }

    @Get('stock-movements')
    getStockMovementHistory(
        @CurrentOrganization('id') orgId: string,
        @Query('limit') limit?: number
    ) {
        return this.reportsService.getStockMovementHistory(orgId, limit ? Number(limit) : 50);
    }

    @Get('expiring')
    getExpiringProducts(
        @CurrentOrganization('id') orgId: string,
        @Query('days') days?: number
    ) {
        return this.reportsService.getExpiringProducts(orgId, days ? Number(days) : 30);
    }

    @Get('aging')
    getAgingAnalysis(
        @CurrentOrganization('id') orgId: string,
        @Query('days') days?: string
    ) {
        return this.reportsService.getAgingAnalysis(orgId, days ? Number(days) : 90);
    }

    @Get('valuation')
    getValuationReport(@CurrentOrganization('id') orgId: string) {
        return this.reportsService.getStockValuation(orgId).then(data => ({
            data: data.breakdown.map((b: any) => ({
                productId: '',
                productName: b.product,
                sku: '',
                category: '',
                warehouseName: b.warehouse,
                availableQuantity: b.quantity,
                unitPrice: b.unitCost,
                totalValue: b.totalValue,
            })),
            summary: {
                totalItems: data.breakdown.reduce((s: number, b: any) => s + Number(b.quantity), 0),
                totalValue: data.totalValuation,
                warehouseBreakdown: data.warehouseValuation,
                categoryBreakdown: {},
            },
        }));
    }
}
