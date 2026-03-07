import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query } from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { CreateAttendanceDto } from './dto/create-attendance.dto';
import { JwtAuthGuard } from '../../../../../src/auth/guards/jwt-auth.guard';
import { AppAccessGuard } from '../../../../../src/common/guards/app-access.guard';
import { AppSlug } from '../../../../../src/common/decorators/app-slug.decorator';
import { CurrentUser } from '../../../../../src/common/decorators/current-user.decorator';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('HR Attendance')
@Controller('hr/attendance')
@UseGuards(JwtAuthGuard, AppAccessGuard)
@AppSlug('mero-hr')
export class AttendanceController {
    constructor(private readonly attendanceService: AttendanceService) { }

    @Post('check-in')
    @ApiOperation({ summary: 'Check in attendance' })
    checkIn(@CurrentUser('organizationId') organizationId: string, @CurrentUser('userId') userId: string, @Body() createAttendanceDto: CreateAttendanceDto) {
        return this.attendanceService.checkIn(
            organizationId,
            userId,
            createAttendanceDto.employeeId,
            createAttendanceDto.location,
            createAttendanceDto.remarks
        );
    }

    @Post('check-out')
    @ApiOperation({ summary: 'Check out attendance' })
    checkOut(@CurrentUser('organizationId') organizationId: string, @CurrentUser('userId') userId: string, @Body() body: { employeeId?: string; remarks?: string }) {
        return this.attendanceService.checkOut(organizationId, userId, body.employeeId, body.remarks);
    }

    @Get()
    @ApiOperation({ summary: 'Get all attendance' })
    findAll(@CurrentUser('organizationId') organizationId: string, @Query('employeeId') employeeId?: string) {
        return this.attendanceService.findAll(organizationId, employeeId);
    }

    @Get('my')
    @ApiOperation({ summary: 'Get my attendance' })
    findMy(@CurrentUser('organizationId') organizationId: string, @CurrentUser('userId') userId: string, @Query('startDate') startDate?: string, @Query('endDate') endDate?: string) {
        return this.attendanceService.findMy(organizationId, userId, startDate, endDate);
    }
}
