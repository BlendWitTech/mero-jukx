import { IsString, IsInt, IsOptional, IsUUID, Min, Max } from 'class-validator';

export class CreateStageDto {
    @IsString()
    name: string;

    @IsOptional()
    @IsInt()
    order?: number;

    @IsOptional()
    @IsInt()
    @Min(0)
    @Max(100)
    probability?: number;

    @IsUUID()
    pipelineId: string;
}

export class UpdateStageDto extends CreateStageDto { }
