import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Board } from '../../database/entities/boards.entity';
import { CreateBoardDto, UpdateBoardDto } from '../dto/boards.dto';
import { BoardFavorite } from '../../../marketplace/shared/mero-board/entities/board-favorite.entity';
import { SavedFilter } from '../../database/entities/saved_filters.entity';

@Injectable()
export class BoardsService {
    constructor(
        @InjectRepository(Board)
        private boardsRepository: Repository<Board>,
        @InjectRepository(BoardFavorite)
        private boardFavoriteRepository: Repository<BoardFavorite>,
        @InjectRepository(SavedFilter)
        private savedFilterRepository: Repository<SavedFilter>,
    ) { }
        // Saved Filter Presets CRUD
        async createSavedFilter(userId: string, boardId: string, name: string, filters: any): Promise<SavedFilter> {
            // Prevent duplicate name for user/board
            const exists = await this.savedFilterRepository.findOne({ where: { user_id: userId, board_id: boardId, name } });
            if (exists) throw new ConflictException('A filter with this name already exists for this board');
            const saved = this.savedFilterRepository.create({ user_id: userId, board_id: boardId, name, filters });
            return this.savedFilterRepository.save(saved);
        }

        async getSavedFilters(userId: string, boardId: string): Promise<SavedFilter[]> {
            return this.savedFilterRepository.find({ where: { user_id: userId, board_id: boardId }, order: { created_at: 'DESC' } });
        }

        async updateSavedFilter(userId: string, filterId: string, name: string, filters: any): Promise<SavedFilter> {
            const saved = await this.savedFilterRepository.findOne({ where: { id: filterId, user_id: userId } });
            if (!saved) throw new NotFoundException('Saved filter not found');
            saved.name = name;
            saved.filters = filters;
            return this.savedFilterRepository.save(saved);
        }

        async deleteSavedFilter(userId: string, filterId: string): Promise<void> {
            const result = await this.savedFilterRepository.delete({ id: filterId, user_id: userId });
            if (result.affected === 0) throw new NotFoundException('Saved filter not found');
        }
    async pinBoard(userId: string, boardId: string): Promise<BoardFavorite> {
        // Prevent duplicate
        const existing = await this.boardFavoriteRepository.findOne({ where: { user_id: userId, board_id: boardId } });
        if (existing) throw new ConflictException('Board already pinned');
        const favorite = this.boardFavoriteRepository.create({ user_id: userId, board_id: boardId });
        return this.boardFavoriteRepository.save(favorite);
    }

    async unpinBoard(userId: string, boardId: string): Promise<void> {
        await this.boardFavoriteRepository.delete({ user_id: userId, board_id: boardId });
    }

    async getFavoriteBoards(userId: string): Promise<Board[]> {
        const favorites = await this.boardFavoriteRepository.find({ where: { user_id: userId }, relations: ['board'] });
        return favorites.map(fav => fav.board);
    }

    async create(createBoardDto: CreateBoardDto, organizationId: string, userId: string): Promise<Board> {
        const board = this.boardsRepository.create({
            ...createBoardDto,
            project_id: createBoardDto.projectId,
            organization_id: organizationId,
            created_by: userId,
            privacy: createBoardDto.privacy,
        });
        return this.boardsRepository.save(board);
    }

    async findAll(organizationId: string, projectId?: string): Promise<{ data: Board[]; meta: any }> {
        const where: any = { organization_id: organizationId };
        if (projectId) {
            where.project_id = projectId;
        }

        const boards = await this.boardsRepository.find({
            where,
            order: { created_at: 'DESC' },
        });

        return {
            data: boards,
            meta: { total: boards.length },
        };
    }

    async findOne(id: string, organizationId: string): Promise<Board> {
        const board = await this.boardsRepository.findOne({
            where: { id, organization_id: organizationId },
            relations: ['columns'],
        });

        if (!board) {
            throw new NotFoundException(`Board with ID ${id} not found`);
        }

        return board;
    }

    async update(id: string, updateBoardDto: UpdateBoardDto, organizationId: string): Promise<Board> {
        const board = await this.findOne(id, organizationId);
        Object.assign(board, updateBoardDto);
        if (updateBoardDto.privacy) {
            board.privacy = updateBoardDto.privacy;
        }
        return this.boardsRepository.save(board);
    }

    async remove(id: string, organizationId: string): Promise<void> {
        const result = await this.boardsRepository.delete({ id, organization_id: organizationId });
        if (result.affected === 0) {
            throw new NotFoundException(`Board with ID ${id} not found`);
        }
    }
}
