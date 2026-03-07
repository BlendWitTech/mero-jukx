import { IsString, IsOptional } from 'class-validator';

export class UpdateSettingsDto {
    @IsOptional()
    @IsString()
    site_name?: string;

    @IsOptional()
    @IsString()
    site_description?: string;

    @IsOptional()
    @IsString()
    logo_url?: string;

    @IsOptional()
    @IsString()
    favicon_url?: string;

    @IsOptional()
    @IsString()
    primary_color?: string;

    @IsOptional()
    @IsString()
    custom_css?: string;

    @IsOptional()
    @IsString()
    custom_domain?: string;
}
