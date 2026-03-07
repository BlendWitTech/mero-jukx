import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Board, BoardPrivacy } from '../../database/entities/boards.entity';

@Injectable()
export class BoardPrivacyGuard implements CanActivate {
  constructor(
    @InjectRepository(Board)
    private boardsRepository: Repository<Board>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const boardId = request.params.id || request.params.boardId || request.body.boardId;
    if (!boardId) return true; // Not a board-specific route

    const board = await this.boardsRepository.findOne({ where: { id: boardId } });
    if (!board) throw new ForbiddenException('Board not found');

    // Private: Only creator can access
    if (board.privacy === BoardPrivacy.PRIVATE) {
      if (user.id !== board.created_by) {
        throw new ForbiddenException('This board is private');
      }
    }
    // Team: Only org members can access (already enforced by PermissionsGuard)
    // Org: All org users (already enforced)
    return true;
  }
}
