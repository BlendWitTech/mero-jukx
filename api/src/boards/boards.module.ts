import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Board } from '../database/entities/boards.entity';
import { BoardColumn } from '../database/entities/board_columns.entity';


import { BoardsService } from './services/boards.service';
import { BoardColumnsService } from './services/board-columns.service';
import { BoardsController } from './controllers/boards.controller';
import { BoardColumnsController, DirectBoardColumnsController } from './controllers/board-columns.controller';
import { PermissionsModule } from '../permissions/permissions.module'; // Adjust path if needed
import { BoardFavorite } from '../../marketplace/shared/mero-board/entities/board-favorite.entity';
import { SavedFilter } from '../database/entities/saved_filters.entity';
import { OrganizationMember } from '../database/entities/organization_members.entity';
import { Role } from '../database/entities/roles.entity';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { BoardPrivacyGuard } from './guards/board-privacy.guard';

@Module({
    imports: [
        TypeOrmModule.forFeature([Board, BoardColumn, BoardFavorite, OrganizationMember, Role, SavedFilter]),
        PermissionsModule,
        AuditLogsModule,
    ],
    controllers: [BoardsController, BoardColumnsController, DirectBoardColumnsController],
    providers: [BoardsService, BoardColumnsService, BoardPrivacyGuard],
    exports: [BoardsService, BoardColumnsService],
})
export class BoardsModule { }
