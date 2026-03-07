import { IsString, IsNotEmpty, IsOptional, IsNumber, IsBoolean, IsUUID, Min } from 'class-validator';

export class CreateProductDto {
    @IsString()
    @IsNotEmpty()
    sku: string;

    @IsString()
    @IsNotEmpty()
    name: string;

    @IsString()
    @IsOptional()
    name_nepali?: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsString()
    @IsOptional()
    category?: string;

    @IsString()
    @IsNotEmpty()
    unit: string;

    @IsNumber()
    @Min(0)
    cost_price: number;

    @IsNumber()
    @Min(0)
    selling_price: number;

    @IsString()
    @IsOptional()
    barcode?: string;

    @IsString()
    @IsOptional()
    image_url?: string;

    @IsNumber()
    @IsOptional()
    @Min(0)
    min_stock_level?: number;

    @IsNumber()
    @IsOptional()
    @Min(0)
    reorder_level?: number;

    @IsBoolean()
    @IsOptional()
    track_expiry?: boolean;

    @IsBoolean()
    @IsOptional()
    @IsNotEmpty()
    is_active?: boolean;

    @IsUUID()
    @IsOptional()
    parent_id?: string;

    @IsString()
    @IsOptional()
    attribute_type?: string;

    @IsString()
    @IsOptional()
    attribute_value?: string;
}

export class UpdateProductDto {
    @IsString()
    @IsOptional()
    sku?: string;

    @IsString()
    @IsOptional()
    name?: string;

    @IsString()
    @IsOptional()
    name_nepali?: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsString()
    @IsOptional()
    category?: string;

    @IsString()
    @IsOptional()
    unit?: string;

    @IsNumber()
    @IsOptional()
    @Min(0)
    cost_price?: number;

    @IsNumber()
    @IsOptional()
    @Min(0)
    selling_price?: number;

    @IsString()
    @IsOptional()
    barcode?: string;

    @IsString()
    @IsOptional()
    image_url?: string;

    @IsNumber()
    @IsOptional()
    @Min(0)
    min_stock_level?: number;

    @IsNumber()
    @IsOptional()
    @Min(0)
    reorder_level?: number;

    @IsBoolean()
    @IsOptional()
    track_expiry?: boolean;

    @IsBoolean()
    @IsOptional()
    is_active?: boolean;

    @IsUUID()
    @IsOptional()
    parent_id?: string;

    @IsString()
    @IsOptional()
    attribute_type?: string;

    @IsString()
    @IsOptional()
    attribute_value?: string;
}
