import { IsString, IsOptional, IsEnum, IsArray } from 'class-validator';
import { CmsPostStatus } from '../entities/cms-post.entity';

export class CreatePostDto {
    @IsString()
    title: string;

    @IsOptional()
    @IsString()
    slug?: string;

    @IsOptional()
    @IsString()
    content?: string;

    @IsOptional()
    @IsString()
    excerpt?: string;

    @IsOptional()
    @IsString()
    featured_image?: string;

    @IsOptional()
    @IsString()
    category?: string;

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    tags?: string[];

    @IsOptional()
    @IsEnum(CmsPostStatus)
    status?: CmsPostStatus;

    @IsOptional()
    @IsString()
    meta_title?: string;

    @IsOptional()
    @IsString()
    meta_description?: string;
}

export class UpdatePostDto extends CreatePostDto {}
