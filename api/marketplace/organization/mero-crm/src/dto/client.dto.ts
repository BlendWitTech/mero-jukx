import { IsString, IsEmail, IsOptional, IsBoolean, IsEnum, IsArray, IsObject, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CreateContactDto } from './contact.dto';

export class CreateClientDto {
    @ApiProperty({ example: 'Acme Corporation' })
    @IsString()
    name: string;

    @ApiPropertyOptional({ example: 'john@acme.com' })
    @IsEmail()
    @IsOptional()
    email?: string;

    @ApiPropertyOptional({ example: '+1234567890' })
    @IsString()
    @IsOptional()
    phone?: string;

    @ApiPropertyOptional({ example: 'United States' })
    @IsString()
    @IsOptional()
    country?: string;

    @ApiPropertyOptional({ example: '123 Main St, New York, NY 10001' })
    @IsString()
    @IsOptional()
    address?: string;

    @ApiPropertyOptional({ example: 'Twitter' })
    @IsString()
    @IsOptional()
    company?: string;

    @ApiPropertyOptional({ example: 'Kathmandu' })
    @IsString()
    @IsOptional()
    city?: string;

    @ApiPropertyOptional({ example: 'Bagmati' })
    @IsString()
    @IsOptional()
    state?: string;

    @ApiPropertyOptional({ example: '44600' })
    @IsString()
    @IsOptional()
    zipCode?: string;

    @ApiPropertyOptional({ example: 'Some notes' })
    @IsString()
    @IsOptional()
    notes?: string;

    @ApiPropertyOptional({ example: 'user-id-here' })
    @IsString()
    @IsOptional()
    assignedToId?: string;

    @ApiPropertyOptional({ enum: ['LEAD', 'CUSTOMER', 'VENDOR', 'PARTNER'] })
    @IsEnum(['LEAD', 'CUSTOMER', 'VENDOR', 'PARTNER'])
    @IsOptional()
    category?: string;

    @ApiPropertyOptional({ type: [String] })
    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    tags?: string[];

    @ApiPropertyOptional()
    @IsObject()
    @IsOptional()
    customFields?: Record<string, any>;

    @ApiPropertyOptional({ type: [CreateContactDto] })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CreateContactDto)
    @IsOptional()
    contacts?: CreateContactDto[];
}

export class UpdateClientDto {
    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    name?: string;

    @ApiPropertyOptional()
    @IsEmail()
    @IsOptional()
    email?: string;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    phone?: string;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    country?: string;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    address?: string;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    company?: string;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    city?: string;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    state?: string;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    zipCode?: string;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    notes?: string;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    assignedToId?: string;

    @ApiPropertyOptional()
    @IsBoolean()
    @IsOptional()
    enabled?: boolean;

    @ApiPropertyOptional({ enum: ['LEAD', 'CUSTOMER', 'VENDOR', 'PARTNER'] })
    @IsEnum(['LEAD', 'CUSTOMER', 'VENDOR', 'PARTNER'])
    @IsOptional()
    category?: string;

    @ApiPropertyOptional({ type: [String] })
    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    tags?: string[];

    @ApiPropertyOptional()
    @IsObject()
    @IsOptional()
    customFields?: Record<string, any>;

    @ApiPropertyOptional({ type: [CreateContactDto] })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CreateContactDto)
    @IsOptional()
    contacts?: CreateContactDto[];
}
