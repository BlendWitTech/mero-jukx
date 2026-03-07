import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query } from '@nestjs/common';
import { LeaveService } from './leave.service';
import { CreateLeaveRequestDto } from './dto/create-leave-request.dto';
import { JwtAuthGuard } from '../../../../../src/auth/guards/jwt-auth.guard';
import { AppAccessGuard } from '../../../../../src/common/guards/app-access.guard';
import { AppSlug } from '../../../../../src/common/decorators/app-slug.decorator';
import { CurrentUser } from '../../../../../src/common/decorators/current-user.decorator';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('HR Leave')
@Controller('hr/leave')
@UseGuards(JwtAuthGuard, AppAccessGuard)
@AppSlug('mero-hr')
export class LeaveController {
    constructor(private readonly leaveService: LeaveService) { }

    @Post('request')
    @ApiOperation({ summary: 'Request leave' })
    create(@CurrentUser('organizationId') organizationId: string, @Body() dto: CreateLeaveRequestDto, @Body('employeeId') employeeId: string) {
        return this.leaveService.create(organizationId, employeeId, dto);
    }

    @Get()
    @ApiOperation({ summary: 'Get all leave requests' })
    findAll(@CurrentUser('organizationId') organizationId: string, @Query('employeeId') employeeId?: string) {
        return this.leaveService.findAll(organizationId, employeeId);
    }

    @Patch(':id/approve')
    @ApiOperation({ summary: 'Approve leave request' })
    approve(@CurrentUser('organizationId') organizationId: string, @CurrentUser('userId') userId: string, @Param('id') id: string, @Body() body: { remarks?: string }) {
        return this.leaveService.approve(organizationId, id, userId, body.remarks);
    }

    @Patch(':id/reject')
    @ApiOperation({ summary: 'Reject leave request' })
    reject(@CurrentUser('organizationId') organizationId: string, @CurrentUser('userId') userId: string, @Param('id') id: string, @Body() body: { remarks: string }) {
        return this.leaveService.reject(organizationId, id, userId, body.remarks);
    }

    @Get('my/balances')
    @ApiOperation({ summary: 'Get leave balances for current employee' })
    async getMyBalances(@CurrentUser('organizationId') organizationId: string, @CurrentUser('userId') userId: string) {
        // We need the employeeId to fetch balances from the service
        // Service should probably handle this using user ID, but we can do it here for now
        // The frontend passes 'my' to the service which fails.
        // I will let leaveService handle the userId or we fetch it.
        // Actually, the easiest is to just pass a special flag or fetch the employee here.
        // It's better to implement findByUserId in employee service or let leaveService handle it.
        // I'll call getBalancesByUserId on leaveService and implement it there.
        return this.leaveService.getBalancesByUserId(organizationId, userId);
    }

    @Get(':employeeId/balances')
    @ApiOperation({ summary: 'Get leave balances for an employee (current fiscal year)' })
    getBalances(@CurrentUser('organizationId') organizationId: string, @Param('employeeId') employeeId: string) {
        return this.leaveService.getBalances(organizationId, employeeId);
    }
}
