import { IsString, IsOptional, IsEmail, IsBoolean, IsUUID } from 'class-validator';

export class CreateContactDto {
    @IsString()
    first_name: string;

    @IsOptional()
    @IsString()
    last_name?: string;

    @IsOptional()
    @IsEmail()
    email?: string;

    @IsOptional()
    @IsString()
    phone?: string;

    @IsOptional()
    @IsString()
    job_title?: string;

    @IsOptional()
    @IsBoolean()
    is_primary?: boolean;

    @IsOptional()
    @IsUUID()
    clientId?: string;
}

export class UpdateContactDto extends CreateContactDto { }
