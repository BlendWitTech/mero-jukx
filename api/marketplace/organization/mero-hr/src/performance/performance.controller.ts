import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query } from '@nestjs/common';
import { PerformanceService } from './performance.service';
import { JwtAuthGuard } from '../../../../../src/auth/guards/jwt-auth.guard';
import { AppAccessGuard } from '../../../../../src/common/guards/app-access.guard';
import { AppSlug } from '../../../../../src/common/decorators/app-slug.decorator';
import { CurrentUser } from '../../../../../src/common/decorators/current-user.decorator';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('HR Performance')
@Controller('hr/performance')
@UseGuards(JwtAuthGuard, AppAccessGuard)
@AppSlug('mero-hr')
export class PerformanceController {
    constructor(private readonly service: PerformanceService) { }

    // ─── Goals ────────────────────────────────────────────────────────────────

    @Get('goals')
    @ApiOperation({ summary: 'List performance goals' })
    getGoals(
        @CurrentUser('organizationId') orgId: string,
        @Query('employeeId') employeeId?: string,
        @Query('fiscalYear') fiscalYear?: string,
    ) {
        return this.service.getGoals(orgId, employeeId, fiscalYear);
    }

    @Post('goals')
    @ApiOperation({ summary: 'Create a performance goal' })
    createGoal(@CurrentUser('organizationId') orgId: string, @Body() body: any) {
        return this.service.createGoal(orgId, body);
    }

    @Patch('goals/:id')
    @ApiOperation({ summary: 'Update a performance goal' })
    updateGoal(@CurrentUser('organizationId') orgId: string, @Param('id') id: string, @Body() body: any) {
        return this.service.updateGoal(orgId, id, body);
    }

    @Delete('goals/:id')
    @ApiOperation({ summary: 'Delete a performance goal' })
    deleteGoal(@CurrentUser('organizationId') orgId: string, @Param('id') id: string) {
        return this.service.deleteGoal(orgId, id);
    }

    // ─── Reviews ──────────────────────────────────────────────────────────────

    @Get('reviews')
    @ApiOperation({ summary: 'List performance reviews' })
    getReviews(
        @CurrentUser('organizationId') orgId: string,
        @Query('employeeId') employeeId?: string,
        @Query('fiscalYear') fiscalYear?: string,
    ) {
        return this.service.getReviews(orgId, employeeId, fiscalYear);
    }

    @Post('reviews')
    @ApiOperation({ summary: 'Create a performance review' })
    createReview(@CurrentUser('organizationId') orgId: string, @Body() body: any) {
        return this.service.createReview(orgId, body);
    }

    @Patch('reviews/:id')
    @ApiOperation({ summary: 'Update a performance review' })
    updateReview(@CurrentUser('organizationId') orgId: string, @Param('id') id: string, @Body() body: any) {
        return this.service.updateReview(orgId, id, body);
    }

    @Delete('reviews/:id')
    @ApiOperation({ summary: 'Delete a performance review' })
    deleteReview(@CurrentUser('organizationId') orgId: string, @Param('id') id: string) {
        return this.service.deleteReview(orgId, id);
    }
}
