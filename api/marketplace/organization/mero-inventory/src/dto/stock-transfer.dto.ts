import { IsString, IsNotEmpty, IsNumber, IsUUID, Min } from 'class-validator';

export class CreateStockTransferDto {
    @IsUUID()
    @IsNotEmpty()
    productId: string;

    @IsUUID()
    @IsNotEmpty()
    fromWarehouseId: string;

    @IsUUID()
    @IsNotEmpty()
    toWarehouseId: string;

    @IsNumber()
    @IsNotEmpty()
    @Min(0.01)
    quantity: number;

    @IsString()
    @IsNotEmpty()
    notes: string;
}
