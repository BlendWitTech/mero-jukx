import { IsString, IsOptional, IsEnum, IsBoolean, IsArray, IsObject } from 'class-validator';
import { CmsFormStatus } from '../entities/cms-form.entity';

export class CreateFormDto {
    @IsString()
    name: string;

    @IsOptional()
    @IsString()
    slug?: string;

    @IsOptional()
    @IsArray()
    fields?: Record<string, any>[];

    @IsOptional()
    @IsBoolean()
    crm_sync?: boolean;

    @IsOptional()
    @IsBoolean()
    email_notify?: boolean;

    @IsOptional()
    @IsString()
    notify_email?: string;

    @IsOptional()
    @IsEnum(CmsFormStatus)
    status?: CmsFormStatus;
}

export class UpdateFormDto extends CreateFormDto {}

export class SubmitFormDto {
    @IsObject()
    data: Record<string, any>;
}
