import { IsString, IsOptional, IsEnum } from 'class-validator';
import { BoardType, BoardPrivacy } from '../../database/entities/boards.entity';

export class CreateBoardDto {
    @IsString()
    name: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsEnum(BoardType)
    type?: BoardType;

    @IsOptional()
    @IsString()
    color?: string;

    @IsOptional()
    @IsString()
    projectId?: string;

    @IsOptional()
    @IsEnum(BoardPrivacy)
    privacy?: BoardPrivacy;
}

export class UpdateBoardDto extends CreateBoardDto { }
