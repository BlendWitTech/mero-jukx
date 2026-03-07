import { IsString, IsOptional, IsEnum, IsObject } from 'class-validator';
import { CmsPageStatus } from '../entities/cms-page.entity';

export class CreatePageDto {
    @IsString()
    title: string;

    @IsOptional()
    @IsString()
    slug?: string;

    @IsOptional()
    @IsObject()
    content?: Record<string, any>;

    @IsOptional()
    @IsString()
    meta_title?: string;

    @IsOptional()
    @IsString()
    meta_description?: string;

    @IsOptional()
    @IsEnum(CmsPageStatus)
    status?: CmsPageStatus;
}

export class UpdatePageDto extends CreatePageDto {}
