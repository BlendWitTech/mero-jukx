import { IsString, IsOptional, IsEmail, MinLength, MaxLength, IsArray, IsNumber } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateBranchDto {
    @ApiPropertyOptional({ description: 'Branch name' })
    @IsOptional()
    @IsString()
    @MinLength(2)
    @MaxLength(255)
    name?: string;

    @ApiPropertyOptional({ description: 'Branch email' })
    @IsOptional()
    @IsEmail()
    email?: string;

    @ApiPropertyOptional({ description: 'Branch phone' })
    @IsOptional()
    @IsString()
    phone?: string;

    @ApiPropertyOptional({ description: 'Branch address' })
    @IsOptional()
    @IsString()
    address?: string;

    @ApiPropertyOptional({ description: 'City' })
    @IsOptional()
    @IsString()
    city?: string;

    @ApiPropertyOptional({ description: 'State/Province' })
    @IsOptional()
    @IsString()
    state?: string;

    @ApiPropertyOptional({ description: 'Country' })
    @IsOptional()
    @IsString()
    country?: string;

    @ApiPropertyOptional({ description: 'Default currency' })
    @IsOptional()
    @IsString()
    @MaxLength(10)
    currency?: string;

    @ApiPropertyOptional({ description: 'Timezone' })
    @IsOptional()
    @IsString()
    timezone?: string;

    @ApiPropertyOptional({ description: 'Language' })
    @IsOptional()
    @IsString()
    language?: string;

    @ApiPropertyOptional({ description: 'List of app IDs this branch can access', type: [Number] })
    @IsOptional()
    @IsArray()
    @IsNumber({}, { each: true })
    app_ids?: number[];
}
