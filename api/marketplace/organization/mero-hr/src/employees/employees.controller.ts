import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    UseGuards,
} from '@nestjs/common';
import { EmployeesService } from './employees.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { JwtAuthGuard } from '../../../../../src/auth/guards/jwt-auth.guard';
import { AppAccessGuard } from '../../../../../src/common/guards/app-access.guard';
import { AppSlug } from '../../../../../src/common/decorators/app-slug.decorator';
import { CurrentUser } from '../../../../../src/common/decorators/current-user.decorator';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('HR Employees')
@Controller('hr/employees')
@UseGuards(JwtAuthGuard, AppAccessGuard)
@AppSlug('mero-hr')
export class EmployeesController {
    constructor(private readonly employeesService: EmployeesService) { }

    @Post()
    @ApiOperation({ summary: 'Create a new employee' })
    create(@CurrentUser('organizationId') organizationId: string, @Body() createEmployeeDto: CreateEmployeeDto) {
        return this.employeesService.create(organizationId, createEmployeeDto);
    }

    @Get()
    @ApiOperation({ summary: 'Get all employees' })
    findAll(@CurrentUser('organizationId') organizationId: string) {
        return this.employeesService.findAll(organizationId);
    }

    @Get('me')
    @ApiOperation({ summary: 'Get current employee profile' })
    findMe(@CurrentUser('userId') userId: string, @CurrentUser('organizationId') organizationId: string) {
        return this.employeesService.findByUserId(organizationId, userId);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get employee by ID' })
    findOne(@CurrentUser('organizationId') organizationId: string, @Param('id') id: string) {
        return this.employeesService.findOne(organizationId, id);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Update employee' })
    update(
        @CurrentUser('organizationId') organizationId: string,
        @Param('id') id: string,
        @Body() updateEmployeeDto: UpdateEmployeeDto,
    ) {
        return this.employeesService.update(organizationId, id, updateEmployeeDto);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Delete employee' })
    remove(@CurrentUser('organizationId') organizationId: string, @Param('id') id: string) {
        return this.employeesService.remove(organizationId, id);
    }
}
