import { IsString, IsOptional, IsEnum, IsNumber, IsUUID, IsObject } from 'class-validator';

export class CreateLeadDto {
    @IsString()
    first_name: string;

    @IsOptional()
    @IsString()
    last_name?: string;

    @IsOptional()
    @IsString()
    email?: string;

    @IsOptional()
    @IsString()
    phone?: string;

    @IsOptional()
    @IsString()
    company?: string;

    @IsOptional()
    @IsString()
    job_title?: string;

    @IsOptional()
    @IsEnum(['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST'])
    status?: string;

    @IsOptional()
    @IsString()
    source?: string;

    @IsOptional()
    @IsNumber()
    estimated_value?: number;

    @IsOptional()
    @IsUUID()
    assigned_to?: string;

    @IsOptional()
    @IsObject()
    custom_fields?: Record<string, any>;

    @IsOptional()
    @IsNumber()
    score?: number;

    @IsOptional()
    @IsString({ each: true })
    tags?: string[];

    @IsOptional()
    @IsString()
    win_loss_reason?: string;
}

export class UpdateLeadDto extends CreateLeadDto { }
