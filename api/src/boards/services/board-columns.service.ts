import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BoardColumn } from '../../database/entities/board_columns.entity';
import { CreateBoardColumnDto, UpdateBoardColumnDto } from '../dto/board-columns.dto';

@Injectable()
export class BoardColumnsService {
    constructor(
        @InjectRepository(BoardColumn)
        private columnsRepository: Repository<BoardColumn>,
    ) { }

    async create(boardId: string, createColumnDto: CreateBoardColumnDto): Promise<BoardColumn> {
        const column = this.columnsRepository.create({
            ...createColumnDto,
            board_id: boardId,
        });
        return this.columnsRepository.save(column);
    }

    async findAll(boardId: string): Promise<BoardColumn[]> {
        return this.columnsRepository.find({
            where: { board_id: boardId },
            order: { position: 'ASC' },
            relations: ['tickets'], // Load tickets with columns for Kanban view
        });
    }

    async update(id: string, updateColumnDto: UpdateBoardColumnDto): Promise<BoardColumn> {
        const column = await this.columnsRepository.findOne({ where: { id } });
        if (!column) {
            throw new NotFoundException(`Column with ID ${id} not found`);
        }

        Object.assign(column, updateColumnDto);
        return this.columnsRepository.save(column);
    }

    async remove(id: string): Promise<void> {
        const result = await this.columnsRepository.delete(id);
        if (result.affected === 0) {
            throw new NotFoundException(`Column with ID ${id} not found`);
        }
    }

    async updatePosition(id: string, newPosition: number): Promise<BoardColumn> {
        const column = await this.columnsRepository.findOne({ where: { id } });
        if (!column) throw new NotFoundException('Column not found');

        column.position = newPosition;
        return this.columnsRepository.save(column);
    }

    async reorder(boardId: string, columnId: string, newPosition: number): Promise<BoardColumn[]> {
        const columns = await this.columnsRepository.find({
            where: { board_id: boardId },
            order: { position: 'ASC' },
        });

        const columnToMove = columns.find(c => c.id === columnId);
        if (!columnToMove) throw new NotFoundException('Column not found');

        // Simple reorder logic: 
        // 1. Remove column from current list
        const filteredColumns = columns.filter(c => c.id !== columnId);

        // 2. Insert into new position
        filteredColumns.splice(newPosition, 0, columnToMove);

        // 3. Update all positions
        for (let i = 0; i < filteredColumns.length; i++) {
            filteredColumns[i].position = i;
        }

        return this.columnsRepository.save(filteredColumns);
    }
}
