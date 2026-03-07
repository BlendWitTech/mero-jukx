import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { AnalyticsService } from '../services/analytics.service';
import { JwtAuthGuard } from '../../../../../src/auth/guards/jwt-auth.guard';
import { AppAccessGuard } from '../../../../../src/common/guards/app-access.guard';
import { PermissionsGuard } from '../../../../../src/common/guards/permissions.guard';
import { Permissions } from '../../../../../src/common/decorators/permissions.decorator';
import { AppSlug } from '../../../../../src/common/decorators/app-slug.decorator';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('CRM - Analytics')
@Controller('crm/analytics')
@UseGuards(JwtAuthGuard, AppAccessGuard, PermissionsGuard)
@AppSlug('mero-crm')
@ApiBearerAuth()
export class AnalyticsController {
    constructor(private readonly analyticsService: AnalyticsService) { }

    @Get('stats')
    @Permissions('crm.analytics.view')
    @ApiOperation({ summary: 'Get overall CRM dashboard stats' })
    async getStats(@Request() req) {
        return this.analyticsService.getDashboardStats(req.user.organizationId);
    }

    @Get('funnel')
    @Permissions('crm.analytics.view')
    @ApiOperation({ summary: 'Get lead conversion funnel data' })
    async getFunnel(@Request() req) {
        return this.analyticsService.getFunnelData(req.user.organizationId);
    }

    @Get('performance')
    @Permissions('crm.analytics.view')
    @ApiOperation({ summary: 'Get sales performance data' })
    async getPerformance(@Request() req) {
        return this.analyticsService.getSalesPerformance(req.user.organizationId);
    }

    @Get('win-loss')
    @Permissions('crm.analytics.view')
    @ApiOperation({ summary: 'Get win/loss analytics with reason breakdown' })
    async getWinLoss(@Request() req) {
        return this.analyticsService.getWinLossAnalytics(req.user.organizationId);
    }

    @Get('lead-scores')
    @Permissions('crm.analytics.view')
    @ApiOperation({ summary: 'Get lead score distribution (hot/warm/cold)' })
    async getLeadScores(@Request() req) {
        return this.analyticsService.getLeadScoreDistribution(req.user.organizationId);
    }
}
