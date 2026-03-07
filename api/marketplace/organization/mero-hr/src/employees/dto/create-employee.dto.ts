import {
    IsString,
    IsEmail,
    IsOptional,
    IsDateString,
    IsEnum,
    IsNumber,
    IsObject,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateEmployeeDto {
    @ApiProperty()
    @IsString()
    first_name: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    last_name?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsEmail()
    email?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    phone?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsDateString()
    date_of_birth?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    gender?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    address?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    designation?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    department?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsDateString()
    joining_date?: string;

    @ApiPropertyOptional({ enum: ['ACTIVE', 'ON_LEAVE', 'TERMINATED', 'RESIGNED'] })
    @IsOptional()
    @IsEnum(['ACTIVE', 'ON_LEAVE', 'TERMINATED', 'RESIGNED'])
    status?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    pan_number?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    citizenship_number?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsNumber()
    base_salary?: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsObject()
    bank_details?: any;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    employee_id?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    userId?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    photo_url?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    departmentId?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    designationId?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    supervisorId?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsDateString()
    probation_end_date?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsDateString()
    contract_end_date?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsObject()
    emergency_contact?: {
        name: string;
        relation: string;
        phone: string;
    };
}
