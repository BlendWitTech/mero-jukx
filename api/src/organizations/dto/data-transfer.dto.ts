import { IsUUID, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class TransferUserDto {
    @ApiProperty({ description: 'User ID to transfer' })
    @IsUUID()
    @IsNotEmpty()
    userId: string;

    @ApiProperty({ description: 'Source organization ID' })
    @IsUUID()
    @IsNotEmpty()
    fromOrgId: string;

    @ApiProperty({ description: 'Target organization ID' })
    @IsUUID()
    @IsNotEmpty()
    toOrgId: string;
}

export class TransferTicketDto {
    @ApiProperty({ description: 'Ticket ID to transfer' })
    @IsUUID()
    @IsNotEmpty()
    ticketId: string;

    @ApiProperty({ description: 'Target organization ID' })
    @IsUUID()
    @IsNotEmpty()
    toOrgId: string;
}
