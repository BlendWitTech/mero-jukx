import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../../../src/auth/guards/jwt-auth.guard';
import { CurrentOrganization } from '../../../../../src/common/decorators/current-organization.decorator';
import { DashboardService } from './dashboard.service';

@Controller('hr/dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
    constructor(private readonly dashboardService: DashboardService) { }

    @Get('stats')
    async getDashboardStats(@CurrentOrganization('id') organizationId: string) {
        return this.dashboardService.getDashboardStats(organizationId);
    }
}
