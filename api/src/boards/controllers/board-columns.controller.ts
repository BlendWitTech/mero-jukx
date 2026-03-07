import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, Put } from '@nestjs/common';
import { BoardColumnsService } from '../services/board-columns.service';
import { CreateBoardColumnDto, UpdateBoardColumnDto } from '../dto/board-columns.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';

@Controller('boards/:boardId/columns')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class BoardColumnsController {
    constructor(private readonly columnsService: BoardColumnsService) { }

    @Post()
    @Permissions('boards.update') // Assuming adding columns is updating the board structure
    create(@Param('boardId') boardId: string, @Body() createColumnDto: CreateBoardColumnDto) {
        return this.columnsService.create(boardId, createColumnDto);
    }

    @Get()
    @Permissions('boards.view')
    findAll(@Param('boardId') boardId: string) {
        return this.columnsService.findAll(boardId);
    }

    @Put('reorder')
    @Permissions('boards.update')
    reorder(@Param('boardId') boardId: string, @Body() reorderDto: { columnId: string, newPosition: number }) {
        return this.columnsService.reorder(boardId, reorderDto.columnId, reorderDto.newPosition);
    }
}

@Controller('columns') // Separate controller for direct column operations if needed
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class DirectBoardColumnsController {
    constructor(private readonly columnsService: BoardColumnsService) { }

    @Patch(':id')
    @Permissions('boards.update')
    update(@Param('id') id: string, @Body() updateColumnDto: UpdateBoardColumnDto) {
        return this.columnsService.update(id, updateColumnDto);
    }

    @Delete(':id')
    @Permissions('boards.update')
    remove(@Param('id') id: string) {
        return this.columnsService.remove(id);
    }
}
