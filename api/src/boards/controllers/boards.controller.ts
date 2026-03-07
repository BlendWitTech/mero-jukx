import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, Query } from '@nestjs/common';
import { SavedFilter } from '../../database/entities/saved_filters.entity';
import { BoardsService } from '../services/boards.service';
import { CreateBoardDto, UpdateBoardDto } from '../dto/boards.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { BoardPrivacyGuard } from '../guards/board-privacy.guard';

@Controller('boards')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class BoardsController {
    constructor(private readonly boardsService: BoardsService) { }

    @Post()
    @Permissions('boards.create')
    create(@Body() createBoardDto: CreateBoardDto, @Request() req) {
        return this.boardsService.create(createBoardDto, req.user.organizationId, req.user.id);
    }

    @Get()
    @Permissions('boards.view')
    findAll(@Request() req, @Query('projectId') projectId?: string) {
        return this.boardsService.findAll(req.user.organizationId, projectId);
    }


    @Get(':id')
    @Permissions('boards.view')
    @UseGuards(BoardPrivacyGuard)
    findOne(@Param('id') id: string, @Request() req) {
        return this.boardsService.findOne(id, req.user.organizationId);
    }


    @Patch(':id')
    @Permissions('boards.update')
    @UseGuards(BoardPrivacyGuard)
    update(@Param('id') id: string, @Body() updateBoardDto: UpdateBoardDto, @Request() req) {
        return this.boardsService.update(id, updateBoardDto, req.user.organizationId);
    }

    @Delete(':id')
    @Permissions('boards.delete')
    @UseGuards(BoardPrivacyGuard)
    remove(@Param('id') id: string, @Request() req) {
        return this.boardsService.remove(id, req.user.organizationId);
    }

    // --- Saved Filter Presets ---
    @Post(':id/saved-filters')
    @Permissions('boards.view')
    async createSavedFilter(
        @Param('id') boardId: string,
        @Request() req,
        @Body() body: { name: string; filters: any }
    ): Promise<SavedFilter> {
        return this.boardsService.createSavedFilter(req.user.id, boardId, body.name, body.filters);
    }

    @Get(':id/saved-filters')
    @Permissions('boards.view')
    async getSavedFilters(
        @Param('id') boardId: string,
        @Request() req
    ): Promise<SavedFilter[]> {
        return this.boardsService.getSavedFilters(req.user.id, boardId);
    }

    @Patch('saved-filters/:filterId')
    @Permissions('boards.view')
    async updateSavedFilter(
        @Param('filterId') filterId: string,
        @Request() req,
        @Body() body: { name: string; filters: any }
    ): Promise<SavedFilter> {
        return this.boardsService.updateSavedFilter(req.user.id, filterId, body.name, body.filters);
    }

    @Delete('saved-filters/:filterId')
    @Permissions('boards.view')
    async deleteSavedFilter(
        @Param('filterId') filterId: string,
        @Request() req
    ): Promise<{ success: boolean }> {
        await this.boardsService.deleteSavedFilter(req.user.id, filterId);
        return { success: true };
    }

    @Post(':id/pin')
    @Permissions('boards.view')
    pinBoard(@Param('id') id: string, @Request() req) {
        return this.boardsService.pinBoard(req.user.id, id);
    }

    @Post(':id/unpin')
    @Permissions('boards.view')
    unpinBoard(@Param('id') id: string, @Request() req) {
        return this.boardsService.unpinBoard(req.user.id, id);
    }

    @Get('favorites/list')
    @Permissions('boards.view')
    getFavoriteBoards(@Request() req) {
        return this.boardsService.getFavoriteBoards(req.user.id);
    }
}
