import { IsString, IsOptional } from 'class-validator';

export class UpdateMediaDto {
    @IsOptional()
    @IsString()
    alt_text?: string;

    @IsOptional()
    @IsString()
    folder?: string;
}
