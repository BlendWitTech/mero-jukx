import { IsString, IsDateString, IsEnum, IsNumber, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateLeaveRequestDto {
    @ApiProperty({ enum: ['SICK', 'CASUAL', 'ANNUAL', 'MATERNITY', 'PATERNITY', 'UNPAID', 'OTHER'] })
    @IsEnum(['SICK', 'CASUAL', 'ANNUAL', 'MATERNITY', 'PATERNITY', 'UNPAID', 'OTHER'])
    leave_type: string;

    @ApiProperty()
    @IsDateString()
    start_date: string;

    @ApiProperty()
    @IsDateString()
    end_date: string;

    @ApiProperty()
    @IsNumber()
    total_days: number;

    @ApiProperty()
    @IsString()
    reason: string;
}
