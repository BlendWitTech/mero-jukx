import { IsString, IsBoolean, IsOptional } from 'class-validator';

export class CreatePipelineDto {
    @IsString()
    name: string;

    @IsOptional()
    @IsBoolean()
    is_default?: boolean;
}

export class UpdatePipelineDto extends CreatePipelineDto { }
