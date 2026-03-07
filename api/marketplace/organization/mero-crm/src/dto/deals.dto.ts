import { IsString, IsOptional, IsEnum, IsNumber, IsUUID, IsDateString, Min, Max, IsArray } from 'class-validator';

export class CreateDealDto {
    @IsString()
    title: string;

    @IsNumber()
    @Min(0)
    value: number;

    @IsOptional()
    @IsString()
    currency?: string;

    @IsOptional()
    @IsString()
    stageName?: string;

    @IsOptional()
    @IsUUID()
    pipeline_id?: string;

    @IsOptional()
    @IsUUID()
    stage_id?: string;

    @IsOptional()
    @IsDateString()
    expected_close_date?: string;

    @IsOptional()
    @IsUUID()
    lead_id?: string;

    @IsOptional()
    @IsUUID()
    assigned_to?: string;

    @IsOptional()
    @IsNumber()
    @Min(0)
    @Max(100)
    probability?: number;

    @IsOptional()
    @IsEnum(['OPEN', 'WON', 'LOST'])
    status?: string;

    @IsOptional()
    @IsString()
    win_loss_reason?: string;

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    competitors?: string[];
}

export class UpdateDealDto extends CreateDealDto { }
