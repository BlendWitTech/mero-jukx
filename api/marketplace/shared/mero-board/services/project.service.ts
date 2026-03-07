import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project, ProjectStatus } from '../../../../src/database/entities/projects.entity';
import { Board, BoardType } from '../../../../src/database/entities/boards.entity';
import { BoardColumn } from '../../../../src/database/entities/board_columns.entity';
import { WorkspaceMember, WorkspaceRole } from '../entities/workspace-member.entity';
import { CreateProjectDto } from '../dto/create-project.dto';
import { UpdateProjectDto } from '../dto/update-project.dto';
import { ProjectQueryDto } from '../dto/project-query.dto';

@Injectable()
export class ProjectService {
  private readonly logger = new Logger(ProjectService.name);

  constructor(
    @InjectRepository(Project)
    private projectRepository: Repository<Project>,
    @InjectRepository(Board)
    private boardRepository: Repository<Board>,
    @InjectRepository(BoardColumn)
    private columnRepository: Repository<BoardColumn>,
    @InjectRepository(WorkspaceMember)
    private memberRepository: Repository<WorkspaceMember>,
  ) { }

  async createProject(
    userId: string,
    organizationId: string,
    createDto: CreateProjectDto,
  ): Promise<Project> {
    // If workspace_id is provided, verify user is a member
    if (createDto.workspace_id) {
      const membership = await this.memberRepository.findOne({
        where: {
          workspace_id: createDto.workspace_id,
          user_id: userId,
          is_active: true,
        },
      });

      if (!membership) {
        throw new ForbiddenException('You are not a member of this workspace');
      }
    }

    const project = this.projectRepository.create({
      ...createDto,
      organization_id: organizationId,
      created_by: userId,
      owner_id: createDto.owner_id || userId,
      status: createDto.status || ProjectStatus.PLANNING,
    });

    const savedProject = await this.projectRepository.save(project);

    // Create a default Kanban board for the project
    const board = this.boardRepository.create({
      name: `${savedProject.name} Board`,
      organization_id: organizationId,
      created_by: userId,
      type: BoardType.KANBAN,
      project_id: savedProject.id, // Linking back if possible, though Board entity uses BoardProject
    });

    const savedBoard = await this.boardRepository.save(board);

    // Update project with board_id
    savedProject.board_id = savedBoard.id;
    await this.projectRepository.save(savedProject);

    // Create default columns
    const defaultColumns = [
      { name: 'To Do', position: 1 },
      { name: 'In Progress', position: 2 },
      { name: 'Review', position: 3 },
      { name: 'Done', position: 4 },
    ];

    const columns = defaultColumns.map((col) =>
      this.columnRepository.create({
        ...col,
        board_id: savedBoard.id,
        organizationId: organizationId,
      }),
    );

    await this.columnRepository.save(columns);

    return savedProject;
  }

  async getProjects(
    userId: string,
    organizationId: string,
    workspaceId?: string,
    query?: ProjectQueryDto,
  ): Promise<{ data: Project[]; meta: { total: number; page: number; limit: number; totalPages: number } }> {
    const page = query?.page || 1;
    const limit = query?.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {
      organization_id: organizationId,
    };

    if (workspaceId) {
      // Verify user is a member of the workspace
      const membership = await this.memberRepository.findOne({
        where: {
          workspace_id: workspaceId,
          user_id: userId,
          is_active: true,
        },
      });

      if (!membership) {
        throw new ForbiddenException('You are not a member of this workspace');
      }

      where.workspace_id = workspaceId;
    }

    const queryBuilder = this.projectRepository
      .createQueryBuilder('project')
      .where('project.organization_id = :organizationId', { organizationId })
      .leftJoinAndSelect('project.creator', 'creator')
      .leftJoinAndSelect('project.owner', 'owner')
      .orderBy('project.created_at', 'DESC');

    if (workspaceId) {
      queryBuilder.andWhere('project.workspace_id = :workspaceId', { workspaceId });
    }

    const [data, total] = await queryBuilder.skip(skip).take(limit).getManyAndCount();

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getProject(
    userId: string,
    organizationId: string,
    projectId: string,
  ): Promise<Project> {
    const project = await this.projectRepository.findOne({
      where: {
        id: projectId,
        organization_id: organizationId,
      },
      relations: ['creator', 'owner', 'epics', 'tasks'],
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // If project has a workspace, verify user is a member
    if (project.workspace_id) {
      const membership = await this.memberRepository.findOne({
        where: {
          workspace_id: project.workspace_id,
          user_id: userId,
          is_active: true,
        },
      });

      if (!membership) {
        throw new ForbiddenException('You are not a member of this workspace');
      }
    }

    return project;
  }

  async updateProject(
    userId: string,
    organizationId: string,
    projectId: string,
    updateDto: UpdateProjectDto,
  ): Promise<Project> {
    const project = await this.getProject(userId, organizationId, projectId);

    // Check if user has permission (owner or workspace admin/owner)
    if (project.owner_id !== userId) {
      if (project.workspace_id) {
        const membership = await this.memberRepository.findOne({
          where: {
            workspace_id: project.workspace_id,
            user_id: userId,
            is_active: true,
          },
        });

        if (
          !membership ||
          (membership.role !== WorkspaceRole.OWNER &&
            membership.role !== WorkspaceRole.ADMIN)
        ) {
          throw new ForbiddenException(
            'You do not have permission to update this project',
          );
        }
      } else {
        throw new ForbiddenException(
          'You do not have permission to update this project',
        );
      }
    }

    Object.assign(project, updateDto);
    return this.projectRepository.save(project);
  }

  async deleteProject(
    userId: string,
    organizationId: string,
    projectId: string,
  ): Promise<void> {
    const project = await this.getProject(userId, organizationId, projectId);

    // Only owner can delete
    if (project.owner_id !== userId) {
      if (project.workspace_id) {
        const membership = await this.memberRepository.findOne({
          where: {
            workspace_id: project.workspace_id,
            user_id: userId,
            is_active: true,
          },
        });

        if (!membership || membership.role !== WorkspaceRole.OWNER) {
          throw new ForbiddenException(
            'Only the project owner or workspace owner can delete this project',
          );
        }
      } else {
        throw new ForbiddenException(
          'Only the project owner can delete this project',
        );
      }
    }

    await this.projectRepository.remove(project);
  }
}


