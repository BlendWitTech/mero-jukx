import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task, TaskStatus, TaskPriority } from '../../../../src/database/entities/tasks.entity';
import { Project } from '../../../../src/database/entities/projects.entity';
import { WorkspaceMember, WorkspaceRole } from '../entities/workspace-member.entity';
import { TaskComment } from '../entities/task-comment.entity';
import { TaskAttachment } from '../entities/task-attachment.entity';
import { TaskActivity, TaskActivityType } from '../entities/task-activity.entity';
import { TaskDependency, TaskDependencyType } from '../entities/task-dependency.entity';
import { TaskChecklistItem } from '../entities/task-checklist-item.entity';
import { CreateTaskDependencyDto } from '../dto/create-task-dependency.dto';
import { TaskTimeLog } from '../entities/task-time-log.entity';
import { CreateTaskTimeLogDto } from '../dto/create-task-time-log.dto';
import { UpdateTaskTimeLogDto } from '../dto/update-task-time-log.dto';
import { CreateTaskDto } from '../dto/create-task.dto';
import { UpdateTaskDto } from '../dto/update-task.dto';
import { AddTaskCommentDto } from '../dto/add-task-comment.dto';
import { UpdateTaskCommentDto } from '../dto/update-task-comment.dto';
import { AddTaskAttachmentDto } from '../dto/add-task-attachment.dto';
import { NotificationHelperService, NotificationType } from '../../../../src/notifications/notification-helper.service';
import { BoardGateway } from '../gateways/board.gateway';
import { User } from '../../../../src/database/entities/users.entity';
import { TaskWatcher } from '../../../../src/database/entities/task_watchers.entity';

@Injectable()
export class TaskService {
  private readonly logger = new Logger(TaskService.name);

  constructor(
    @InjectRepository(Task)
    private taskRepository: Repository<Task>,
    @InjectRepository(Project)
    private projectRepository: Repository<Project>,
    @InjectRepository(WorkspaceMember)
    private memberRepository: Repository<WorkspaceMember>,
    @InjectRepository(TaskComment)
    private commentRepository: Repository<TaskComment>,
    @InjectRepository(TaskAttachment)
    private attachmentRepository: Repository<TaskAttachment>,
    @InjectRepository(TaskActivity)
    private activityRepository: Repository<TaskActivity>,
    @InjectRepository(TaskDependency)
    private dependencyRepository: Repository<TaskDependency>,
    @InjectRepository(TaskTimeLog)
    private timeLogRepository: Repository<TaskTimeLog>,
    @InjectRepository(TaskChecklistItem)
    private checklistRepository: Repository<TaskChecklistItem>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(TaskWatcher)
    private watcherRepository: Repository<TaskWatcher>,
    private notificationHelper: NotificationHelperService,
    private boardGateway: BoardGateway,
  ) { }

  async createTask(
    userId: string,
    organizationId: string,
    projectId: string,
    createDto: CreateTaskDto,
  ): Promise<Task> {
    // Verify project exists and user has access
    const project = await this.projectRepository.findOne({
      where: {
        id: projectId,
        organization_id: organizationId,
      },
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

    const task = this.taskRepository.create({
      ...createDto,
      organization_id: organizationId,
      project_id: projectId,
      created_by: userId,
      status: createDto.status || TaskStatus.TODO,
      priority: createDto.priority || TaskPriority.MEDIUM,
      parent_task_id: (createDto as any).parent_task_id || null,
      column_id: (createDto as any).column_id || null,
      board_id: (createDto as any).board_id || null,
    });

    const savedTask = await this.taskRepository.save(task);

    // Create activity
    await this.createActivity(savedTask.id, userId, TaskActivityType.CREATED);

    // Broadcast update
    if (savedTask.board_id) {
      this.boardGateway.broadcastTaskUpdated(savedTask.board_id, savedTask);
    }

    // Send notifications
    try {
      const project = await this.projectRepository.findOne({
        where: { id: projectId },
        relations: ['workspace'],
      });

      const creator = await this.userRepository.findOne({ where: { id: userId } });
      const creatorName = creator ? `${creator.first_name} ${creator.last_name}` : 'Someone';

      // Notify workspace members (except creator and assignee)
      if (project?.workspace_id) {
        const workspaceMembers = await this.memberRepository.find({
          where: {
            workspace_id: project.workspace_id,
            is_active: true,
          },
          relations: ['user'],
        });

        for (const member of workspaceMembers) {
          // Skip creator and assignee (already notified)
          if (member.user_id === userId || member.user_id === savedTask.assignee_id) {
            continue;
          }

          await this.notificationHelper.createNotification(
            member.user_id,
            organizationId,
            NotificationType.TASK_CREATED,
            'New task created',
            `${creatorName} created a new task: ${savedTask.title}`,
            {
              route: `/org/:slug/app/mero-board/workspaces/${project.workspace_id}/projects/${projectId}/tasks/${savedTask.id}`,
              params: { slug: organizationId },
            },
            {
              task_id: savedTask.id,
              task_title: savedTask.title,
              project_id: projectId,
              workspace_id: project.workspace_id,
              creator_id: userId,
              creator_name: creatorName,
            },
          );
        }
      }
    } catch (error) {
      // Log error but don't fail task creation
      this.logger.error('Failed to send task creation notifications', error);
    }

    return savedTask;
  }

  async getTasksForCalendar(
    userId: string,
    organizationId: string,
    projectId: string,
    startDate: string,
    endDate: string,
  ): Promise<Task[]> {
    const project = await this.projectRepository.findOne({
      where: { id: projectId, organization_id: organizationId },
    });
    if (!project) {
      throw new NotFoundException('Project not found');
    }
    if (project.workspace_id) {
      const membership = await this.memberRepository.findOne({
        where: { workspace_id: project.workspace_id, user_id: userId, is_active: true },
      });
      if (!membership) {
        throw new ForbiddenException('You are not a member of this workspace');
      }
    }
    return this.taskRepository
      .createQueryBuilder('task')
      .where('task.project_id = :projectId', { projectId })
      .andWhere('task.organization_id = :organizationId', { organizationId })
      .andWhere('task.due_date >= :startDate', { startDate })
      .andWhere('task.due_date <= :endDate', { endDate })
      .leftJoinAndSelect('task.creator', 'creator')
      .leftJoinAndSelect('task.assignee', 'assignee')
      .getMany();
  }

  async getTasks(
    userId: string,
    organizationId: string,
    projectId: string,
    filters?: {
      status?: string;
      priority?: string;
      assigneeId?: string;
      search?: string;
      dueDate?: string;
      tags?: string[];
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
      page?: number;
      limit?: number;
    },
  ): Promise<{ data: Task[]; meta: { total: number; page: number; limit: number; totalPages: number } }> {
    // Verify project exists and user has access
    const project = await this.projectRepository.findOne({
      where: {
        id: projectId,
        organization_id: organizationId,
      },
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

    const queryBuilder = this.taskRepository
      .createQueryBuilder('task')
      .where('task.project_id = :projectId', { projectId })
      .andWhere('task.organization_id = :organizationId', { organizationId })
      .leftJoinAndSelect('task.creator', 'creator')
      .leftJoinAndSelect('task.assignee', 'assignee')
      .leftJoinAndSelect('task.assignees', 'assignees');

    if (filters?.status) {
      queryBuilder.andWhere('task.status = :status', { status: filters.status });
    }

    if (filters?.priority) {
      queryBuilder.andWhere('task.priority = :priority', { priority: filters.priority });
    }

    if (filters?.assigneeId) {
      if (filters.assigneeId === 'unassigned') {
        queryBuilder.andWhere('task.assignee_id IS NULL');
      } else {
        queryBuilder.andWhere('task.assignee_id = :assigneeId', { assigneeId: filters.assigneeId });
      }
    }

    if (filters?.search) {
      queryBuilder.andWhere(
        '(task.title ILIKE :search OR task.description ILIKE :search)',
        { search: `%${filters.search}%` },
      );
    }

    // Due date filtering
    if (filters?.dueDate) {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekEnd = new Date(today);
      weekEnd.setDate(weekEnd.getDate() + 7);
      const monthEnd = new Date(today);
      monthEnd.setMonth(monthEnd.getMonth() + 1);

      switch (filters.dueDate) {
        case 'overdue':
          queryBuilder.andWhere('task.due_date < :today', { today });
          break;
        case 'today':
          queryBuilder.andWhere('task.due_date >= :today', { today });
          queryBuilder.andWhere('task.due_date < :tomorrow', { tomorrow: new Date(today.getTime() + 24 * 60 * 60 * 1000) });
          break;
        case 'this_week':
          queryBuilder.andWhere('task.due_date >= :today', { today });
          queryBuilder.andWhere('task.due_date < :weekEnd', { weekEnd });
          break;
        case 'this_month':
          queryBuilder.andWhere('task.due_date >= :today', { today });
          queryBuilder.andWhere('task.due_date < :monthEnd', { monthEnd });
          break;
        case 'none':
          queryBuilder.andWhere('task.due_date IS NULL');
          break;
      }
    }

    // Tag filtering
    if (filters?.tags && filters.tags.length > 0) {
      queryBuilder.andWhere('task.tags && :tags', { tags: filters.tags });
    }

    // Sorting
    const sortBy = filters?.sortBy || 'created_at';
    const sortOrder = filters?.sortOrder || 'desc';

    if (sortBy === 'due_date') {
      queryBuilder.orderBy('task.due_date', sortOrder.toUpperCase() as 'ASC' | 'DESC');
      queryBuilder.addOrderBy('task.created_at', 'DESC');
    } else if (sortBy === 'priority') {
      const priorityOrder = { low: 1, medium: 2, high: 3, urgent: 4 };
      queryBuilder.orderBy(
        `CASE 
          WHEN task.priority = 'low' THEN 1
          WHEN task.priority = 'medium' THEN 2
          WHEN task.priority = 'high' THEN 3
          WHEN task.priority = 'urgent' THEN 4
        END`,
        sortOrder.toUpperCase() as 'ASC' | 'DESC',
      );
      queryBuilder.addOrderBy('task.created_at', 'DESC');
    } else if (sortBy === 'status') {
      const statusOrder = { todo: 1, in_progress: 2, in_review: 3, done: 4 };
      queryBuilder.orderBy(
        `CASE 
          WHEN task.status = 'todo' THEN 1
          WHEN task.status = 'in_progress' THEN 2
          WHEN task.status = 'in_review' THEN 3
          WHEN task.status = 'done' THEN 4
        END`,
        sortOrder.toUpperCase() as 'ASC' | 'DESC',
      );
      queryBuilder.addOrderBy('task.created_at', 'DESC');
    } else {
      queryBuilder.orderBy(`task.${sortBy}`, sortOrder.toUpperCase() as 'ASC' | 'DESC');
    }

    // Pagination
    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const skip = (page - 1) * limit;

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

  async getTask(
    userId: string,
    organizationId: string,
    projectId: string,
    taskId: string,
  ): Promise<Task> {
    // Verify project exists and user has access
    const project = await this.projectRepository.findOne({
      where: {
        id: projectId,
        organization_id: organizationId,
      },
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

    const task = await this.taskRepository.findOne({
      where: {
        id: taskId,
        project_id: projectId,
        organization_id: organizationId,
      },
      relations: ['creator', 'assignee', 'assignees', 'project', 'checklist_items', 'sub_tasks', 'sub_tasks.assignee'],
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    return task;
  }

  async updateTask(
    userId: string,
    organizationId: string,
    projectId: string,
    taskId: string,
    updateDto: UpdateTaskDto,
  ): Promise<Task> {
    const task = await this.getTask(userId, organizationId, projectId, taskId);

    // Check if user has permission (creator, assignee, or workspace admin/owner)
    if (task.created_by !== userId && task.assignee_id !== userId) {
      if (task.project?.workspace_id) {
        const membership = await this.memberRepository.findOne({
          where: {
            workspace_id: task.project.workspace_id,
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
            'You do not have permission to update this task',
          );
        }
      } else {
        throw new ForbiddenException(
          'You do not have permission to update this task',
        );
      }
    }

    // Track changes for activity log
    const changes: Record<string, any> = {};

    if (updateDto.status && updateDto.status !== task.status) {
      changes.status = { old: task.status, new: updateDto.status };
      await this.createActivity(
        taskId,
        userId,
        TaskActivityType.STATUS_CHANGED,
        { old_status: task.status, new_status: updateDto.status },
      );
    }

    if (updateDto.priority && updateDto.priority !== task.priority) {
      changes.priority = { old: task.priority, new: updateDto.priority };
      await this.createActivity(
        taskId,
        userId,
        TaskActivityType.PRIORITY_CHANGED,
        { old_priority: task.priority, new_priority: updateDto.priority },
      );
    }

    if (updateDto.assignee_id !== undefined) {
      if (updateDto.assignee_id && !task.assignee_id) {
        await this.createActivity(taskId, userId, TaskActivityType.ASSIGNED);
      } else if (!updateDto.assignee_id && task.assignee_id) {
        await this.createActivity(taskId, userId, TaskActivityType.UNASSIGNED);
      }
    }

    if (updateDto.due_date !== undefined) {
      const newDueDate = updateDto.due_date ? new Date(updateDto.due_date) : null;
      const oldDueDate = task.due_date;

      if (newDueDate && !oldDueDate) {
        await this.createActivity(taskId, userId, TaskActivityType.DUE_DATE_SET);
      } else if (newDueDate && oldDueDate && newDueDate.getTime() !== oldDueDate.getTime()) {
        await this.createActivity(taskId, userId, TaskActivityType.DUE_DATE_CHANGED);
      } else if (!newDueDate && oldDueDate) {
        await this.createActivity(taskId, userId, TaskActivityType.DUE_DATE_REMOVED);
      }
    }

    const oldAssigneeId = task.assignee_id;
    const oldStatus = task.status;
    const oldPriority = task.priority;
    const oldDueDate = task.due_date;

    Object.assign(task, updateDto);
    const updated = await this.taskRepository.save(task);

    // Create general update activity if there were other changes
    if (Object.keys(updateDto).some(key => !['status', 'priority', 'assignee_id', 'due_date'].includes(key))) {
      await this.createActivity(taskId, userId, TaskActivityType.UPDATED);
    }

    // Broadcast update
    if (updated.board_id) {
      this.boardGateway.broadcastTaskUpdated(updated.board_id, updated);
    }

    // Send notifications for changes
    try {
      const project = await this.projectRepository.findOne({
        where: { id: projectId },
        relations: ['workspace'],
      });

      const updater = await this.userRepository.findOne({ where: { id: userId } });
      const updaterName = updater ? `${updater.first_name} ${updater.last_name}` : 'Someone';

      // Notify on assignment change
      if (updateDto.assignee_id !== undefined && updateDto.assignee_id !== oldAssigneeId) {
        if (updateDto.assignee_id && updateDto.assignee_id !== userId) {
          // New assignment
          await this.notificationHelper.createNotification(
            updateDto.assignee_id,
            organizationId,
            NotificationType.TASK_ASSIGNED,
            'Task assigned to you',
            `${updaterName} assigned task "${updated.title}" to you`,
            {
              route: `/org/:slug/app/mero-board/workspaces/${project?.workspace_id}/projects/${projectId}/tasks/${taskId}`,
              params: { slug: organizationId },
            },
            {
              task_id: taskId,
              task_title: updated.title,
              project_id: projectId,
              workspace_id: project?.workspace_id,
            },
          );
        }
        if (oldAssigneeId && oldAssigneeId !== userId && oldAssigneeId !== updateDto.assignee_id) {
          // Unassignment
          await this.notificationHelper.createNotification(
            oldAssigneeId,
            organizationId,
            NotificationType.TASK_UNASSIGNED,
            'Task unassigned',
            `${updaterName} unassigned you from task "${updated.title}"`,
            {
              route: `/org/:slug/app/mero-board/workspaces/${project?.workspace_id}/projects/${projectId}/tasks/${taskId}`,
              params: { slug: organizationId },
            },
            {
              task_id: taskId,
              task_title: updated.title,
              project_id: projectId,
              workspace_id: project?.workspace_id,
            },
          );
        }
      }

      // Notify assignee on status change
      if (updateDto.status && updateDto.status !== oldStatus && updated.assignee_id && updated.assignee_id !== userId) {
        await this.notificationHelper.createNotification(
          updated.assignee_id,
          organizationId,
          NotificationType.TASK_STATUS_CHANGED,
          'Task status updated',
          `${updaterName} changed status of "${updated.title}" from ${oldStatus} to ${updateDto.status}`,
          {
            route: `/org/:slug/app/mero-board/workspaces/${project?.workspace_id}/projects/${projectId}/tasks/${taskId}`,
            params: { slug: organizationId },
          },
          {
            task_id: taskId,
            task_title: updated.title,
            old_status: oldStatus,
            new_status: updateDto.status,
            project_id: projectId,
            workspace_id: project?.workspace_id,
          },
        );
      }

      // Notify assignee on priority change
      if (updateDto.priority && updateDto.priority !== oldPriority && updated.assignee_id && updated.assignee_id !== userId) {
        await this.notificationHelper.createNotification(
          updated.assignee_id,
          organizationId,
          NotificationType.TASK_PRIORITY_CHANGED,
          'Task priority updated',
          `${updaterName} changed priority of "${updated.title}" from ${oldPriority} to ${updateDto.priority}`,
          {
            route: `/org/:slug/app/mero-board/workspaces/${project?.workspace_id}/projects/${projectId}/tasks/${taskId}`,
            params: { slug: organizationId },
          },
          {
            task_id: taskId,
            task_title: updated.title,
            old_priority: oldPriority,
            new_priority: updateDto.priority,
            project_id: projectId,
            workspace_id: project?.workspace_id,
          },
        );
      }

      // Notify assignee on due date change
      if (updateDto.due_date !== undefined && String(updateDto.due_date) !== String(oldDueDate) && updated.assignee_id && updated.assignee_id !== userId) {
        await this.notificationHelper.createNotification(
          updated.assignee_id,
          organizationId,
          NotificationType.TASK_DUE_DATE_CHANGED,
          'Task due date updated',
          `${updaterName} ${updateDto.due_date ? `set due date for "${updated.title}" to ${new Date(updateDto.due_date).toLocaleDateString()}` : `removed due date from "${updated.title}"`}`,
          {
            route: `/org/:slug/app/mero-board/workspaces/${project?.workspace_id}/projects/${projectId}/tasks/${taskId}`,
            params: { slug: organizationId },
          },
          {
            task_id: taskId,
            task_title: updated.title,
            old_due_date: oldDueDate,
            new_due_date: updateDto.due_date,
            project_id: projectId,
            workspace_id: project?.workspace_id,
          },
        );
      }
    } catch (error) {
      // Log error but don't fail task update
      this.logger.error('Failed to send task update notifications', error);
    }

    return updated;
  }

  async deleteTask(
    userId: string,
    organizationId: string,
    projectId: string,
    taskId: string,
  ): Promise<void> {
    const task = await this.getTask(userId, organizationId, projectId, taskId);

    // Only creator or workspace owner/admin can delete
    if (task.created_by !== userId) {
      if (task.project?.workspace_id) {
        const membership = await this.memberRepository.findOne({
          where: {
            workspace_id: task.project.workspace_id,
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
            'You do not have permission to delete this task',
          );
        }
      } else {
        throw new ForbiddenException(
          'Only the task creator can delete this task',
        );
      }
    }

    await this.taskRepository.remove(task);
  }

  // Task Movement (Kanban)
  async moveTask(
    userId: string,
    organizationId: string,
    projectId: string,
    taskId: string,
    targetColumnId: string,
    position: number,
  ): Promise<Task> {
    const task = await this.getTask(userId, organizationId, projectId, taskId);

    const oldColumnId = task.column_id;
    task.column_id = targetColumnId;
    task.sort_order = position;

    const savedTask = await this.taskRepository.save(task);

    if (oldColumnId !== targetColumnId) {
      await this.createActivity(
        taskId,
        userId,
        TaskActivityType.STATUS_CHANGED,
        { old_column: oldColumnId, new_column: targetColumnId },
      );
    }

    // Broadcast movement
    if (savedTask.board_id) {
      this.boardGateway.broadcastTaskMoved(savedTask.board_id, {
        taskId,
        targetColumnId,
        position,
      });
    }

    return savedTask;
  }

  // Task Checklists
  async addChecklistItem(
    userId: string,
    organizationId: string,
    projectId: string,
    taskId: string,
    title: string,
  ): Promise<TaskChecklistItem> {
    await this.getTask(userId, organizationId, projectId, taskId);

    const item = this.checklistRepository.create({
      task_id: taskId,
      title,
      created_by_id: userId,
    });

    const savedItem = await this.checklistRepository.save(item);

    await this.createActivity(taskId, userId, TaskActivityType.UPDATED, {
      action: 'checklist_item_added',
      item_id: savedItem.id
    });

    return savedItem;
  }

  async toggleChecklistItem(
    userId: string,
    organizationId: string,
    projectId: string,
    taskId: string,
    itemId: string,
  ): Promise<TaskChecklistItem> {
    await this.getTask(userId, organizationId, projectId, taskId);

    const item = await this.checklistRepository.findOne({
      where: { id: itemId, task_id: taskId },
    });

    if (!item) {
      throw new NotFoundException('Checklist item not found');
    }

    item.is_completed = !item.is_completed;
    if (item.is_completed) {
      item.completed_at = new Date();
      item.completed_by_id = userId;
    } else {
      item.completed_at = null;
      item.completed_by_id = null;
    }

    const savedItem = await this.checklistRepository.save(item);

    await this.createActivity(taskId, userId, TaskActivityType.UPDATED, {
      action: item.is_completed ? 'checklist_item_completed' : 'checklist_item_uncompleted',
      item_id: item.id
    });

    return savedItem;
  }

  async deleteChecklistItem(
    userId: string,
    organizationId: string,
    projectId: string,
    taskId: string,
    itemId: string,
  ): Promise<void> {
    await this.getTask(userId, organizationId, projectId, taskId);

    const item = await this.checklistRepository.findOne({
      where: { id: itemId, task_id: taskId },
    });

    if (!item) {
      throw new NotFoundException('Checklist item not found');
    }

    await this.checklistRepository.remove(item);

    await this.createActivity(taskId, userId, TaskActivityType.UPDATED, {
      action: 'checklist_item_deleted',
      item_id: itemId
    });
  }

  // Task Comments
  async addComment(
    userId: string,
    organizationId: string,
    projectId: string,
    taskId: string,
    dto: AddTaskCommentDto,
  ): Promise<TaskComment> {
    const task = await this.getTask(userId, organizationId, projectId, taskId);

    const comment = this.commentRepository.create({
      task_id: taskId,
      author_id: userId,
      body: dto.body,
      parent_comment_id: dto.parent_comment_id || null,
    });

    const savedComment = await this.commentRepository.save(comment);

    // Create activity
    await this.createActivity(
      taskId,
      userId,
      TaskActivityType.COMMENT_ADDED,
      { comment_id: savedComment.id },
    );

    // Send notifications
    try {
      const project = await this.projectRepository.findOne({
        where: { id: projectId },
        relations: ['workspace'],
      });

      const commenter = await this.userRepository.findOne({ where: { id: userId } });
      const commenterName = commenter ? `${commenter.first_name} ${commenter.last_name}` : 'Someone';

      // Notify task assignee (if not the commenter)
      if (task.assignee_id && task.assignee_id !== userId) {
        await this.notificationHelper.createNotification(
          task.assignee_id,
          organizationId,
          NotificationType.TASK_COMMENT_ADDED,
          'New comment on your task',
          `${commenterName} commented on task "${task.title}"`,
          {
            route: `/org/:slug/app/mero-board/workspaces/${project?.workspace_id}/projects/${projectId}/tasks/${taskId}`,
            params: { slug: organizationId },
          },
          {
            task_id: taskId,
            task_title: task.title,
            comment_id: savedComment.id,
            commenter_id: userId,
            commenter_name: commenterName,
            project_id: projectId,
            workspace_id: project?.workspace_id,
          },
        );
      }

      // Notify task creator (if not the commenter and not the assignee)
      if (task.created_by && task.created_by !== userId && task.created_by !== task.assignee_id) {
        await this.notificationHelper.createNotification(
          task.created_by,
          organizationId,
          NotificationType.TASK_COMMENT_ADDED,
          'New comment on your task',
          `${commenterName} commented on task "${task.title}"`,
          {
            route: `/org/:slug/app/mero-board/workspaces/${project?.workspace_id}/projects/${projectId}/tasks/${taskId}`,
            params: { slug: organizationId },
          },
          {
            task_id: taskId,
            task_title: task.title,
            comment_id: savedComment.id,
            commenter_id: userId,
            commenter_name: commenterName,
            project_id: projectId,
            workspace_id: project?.workspace_id,
          },
        );
      }

      // Notify other commenters (if not the commenter, assignee, or creator)
      if (project?.workspace_id) {
        const otherComments = await this.commentRepository.find({
          where: { task_id: taskId, is_deleted: false },
          relations: ['author'],
        });

        const notifiedUserIds = new Set([userId, task.assignee_id, task.created_by].filter(Boolean));
        const otherCommenterIds = new Set(
          otherComments
            .map(c => c.author_id)
            .filter(id => id && !notifiedUserIds.has(id))
        );

        for (const commenterId of otherCommenterIds) {
          await this.notificationHelper.createNotification(
            commenterId,
            organizationId,
            NotificationType.TASK_COMMENT_ADDED,
            'New comment on task',
            `${commenterName} commented on task "${task.title}"`,
            {
              route: `/org/:slug/app/mero-board/workspaces/${project.workspace_id}/projects/${projectId}/tasks/${taskId}`,
              params: { slug: organizationId },
            },
            {
              task_id: taskId,
              task_title: task.title,
              comment_id: savedComment.id,
              commenter_id: userId,
              commenter_name: commenterName,
              project_id: projectId,
              workspace_id: project.workspace_id,
            },
          );
        }
      }
    } catch (error) {
      // Log error but don't fail comment creation
      this.logger.error('Failed to send comment notifications', error);
    }

    return this.commentRepository.findOne({
      where: { id: savedComment.id },
      relations: ['author', 'parent_comment'],
    });
  }

  async getComments(
    userId: string,
    organizationId: string,
    projectId: string,
    taskId: string,
    page?: number,
    limit?: number,
  ): Promise<{ data: TaskComment[]; meta: { total: number; page: number; limit: number; totalPages: number } }> {
    await this.getTask(userId, organizationId, projectId, taskId);

    const pageNum = page || 1;
    const limitNum = limit || 50;
    const skip = (pageNum - 1) * limitNum;

    const [data, total] = await this.commentRepository.findAndCount({
      where: { task_id: taskId, is_deleted: false },
      relations: ['author', 'parent_comment'],
      order: { created_at: 'ASC' },
      skip,
      take: limitNum,
    });

    return {
      data,
      meta: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  }

  async updateComment(
    userId: string,
    organizationId: string,
    projectId: string,
    taskId: string,
    commentId: string,
    dto: UpdateTaskCommentDto,
  ): Promise<TaskComment> {
    await this.getTask(userId, organizationId, projectId, taskId);

    const comment = await this.commentRepository.findOne({
      where: { id: commentId, task_id: taskId },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    if (comment.author_id !== userId) {
      throw new ForbiddenException('You can only edit your own comments');
    }

    comment.body = dto.body || comment.body;
    comment.is_edited = true;

    const updated = await this.commentRepository.save(comment);

    // Create activity
    await this.createActivity(
      taskId,
      userId,
      TaskActivityType.COMMENT_EDITED,
      { comment_id: commentId },
    );

    return this.commentRepository.findOne({
      where: { id: updated.id },
      relations: ['author', 'parent_comment'],
    });
  }

  async deleteComment(
    userId: string,
    organizationId: string,
    projectId: string,
    taskId: string,
    commentId: string,
  ): Promise<void> {
    await this.getTask(userId, organizationId, projectId, taskId);

    const comment = await this.commentRepository.findOne({
      where: { id: commentId, task_id: taskId },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    if (comment.author_id !== userId) {
      throw new ForbiddenException('You can only delete your own comments');
    }

    comment.is_deleted = true;
    await this.commentRepository.save(comment);

    // Create activity
    await this.createActivity(
      taskId,
      userId,
      TaskActivityType.COMMENT_DELETED,
      { comment_id: commentId },
    );
  }

  // Task Attachments
  async addAttachment(
    userId: string,
    organizationId: string,
    projectId: string,
    taskId: string,
    dto: AddTaskAttachmentDto,
  ): Promise<TaskAttachment> {
    const task = await this.getTask(userId, organizationId, projectId, taskId);

    const attachment = this.attachmentRepository.create({
      task_id: taskId,
      uploaded_by: userId,
      ...dto,
    });

    const savedAttachment = await this.attachmentRepository.save(attachment);

    // Create activity
    await this.createActivity(
      taskId,
      userId,
      TaskActivityType.ATTACHMENT_ADDED,
      { attachment_id: savedAttachment.id, file_name: dto.file_name },
    );

    return this.attachmentRepository.findOne({
      where: { id: savedAttachment.id },
      relations: ['uploader'],
    });
  }

  async getAttachments(
    userId: string,
    organizationId: string,
    projectId: string,
    taskId: string,
  ): Promise<TaskAttachment[]> {
    await this.getTask(userId, organizationId, projectId, taskId);

    return this.attachmentRepository.find({
      where: { task_id: taskId },
      relations: ['uploader'],
      order: { created_at: 'DESC' },
    });
  }

  async deleteAttachment(
    userId: string,
    organizationId: string,
    projectId: string,
    taskId: string,
    attachmentId: string,
  ): Promise<void> {
    const task = await this.getTask(userId, organizationId, projectId, taskId);

    const attachment = await this.attachmentRepository.findOne({
      where: { id: attachmentId, task_id: taskId },
    });

    if (!attachment) {
      throw new NotFoundException('Attachment not found');
    }

    if (attachment.uploaded_by !== userId) {
      throw new ForbiddenException('You can only delete your own attachments');
    }

    await this.attachmentRepository.remove(attachment);

    // Create activity
    await this.createActivity(
      taskId,
      userId,
      TaskActivityType.ATTACHMENT_REMOVED,
      { attachment_id: attachmentId, file_name: attachment.file_name },
    );
  }

  // Task Activities
  async getActivities(
    userId: string,
    organizationId: string,
    projectId: string,
    taskId: string,
    page?: number,
    limit?: number,
  ): Promise<{ data: TaskActivity[]; meta: { total: number; page: number; limit: number; totalPages: number } }> {
    await this.getTask(userId, organizationId, projectId, taskId);

    const pageNum = page || 1;
    const limitNum = limit || 50;
    const skip = (pageNum - 1) * limitNum;

    const [data, total] = await this.activityRepository.findAndCount({
      where: { task_id: taskId },
      relations: ['user'],
      order: { created_at: 'DESC' },
      skip,
      take: limitNum,
    });

    return {
      data,
      meta: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  }

  // Helper method to create activities
  private async createActivity(
    taskId: string,
    userId: string,
    activityType: TaskActivityType,
    metadata?: Record<string, any>,
  ): Promise<TaskActivity> {
    const activity = this.activityRepository.create({
      task_id: taskId,
      user_id: userId,
      activity_type: activityType,
      description: this.getActivityDescription(activityType, metadata),
      new_value: metadata,
    });

    return this.activityRepository.save(activity);
  }

  private getActivityDescription(
    activityType: TaskActivityType,
    metadata?: Record<string, any>,
  ): string {
    switch (activityType) {
      case TaskActivityType.CREATED:
        return 'Task created';
      case TaskActivityType.STATUS_CHANGED:
        return `Status changed to ${metadata?.new_status || 'unknown'}`;
      case TaskActivityType.PRIORITY_CHANGED:
        return `Priority changed to ${metadata?.new_priority || 'unknown'}`;
      case TaskActivityType.ASSIGNED:
        return `Task assigned`;
      case TaskActivityType.UNASSIGNED:
        return `Task unassigned`;
      case TaskActivityType.DUE_DATE_SET:
        return `Due date set`;
      case TaskActivityType.DUE_DATE_CHANGED:
        return `Due date changed`;
      case TaskActivityType.DUE_DATE_REMOVED:
        return `Due date removed`;
      case TaskActivityType.COMMENT_ADDED:
        return 'Comment added';
      case TaskActivityType.COMMENT_EDITED:
        return 'Comment edited';
      case TaskActivityType.COMMENT_DELETED:
        return 'Comment deleted';
      case TaskActivityType.ATTACHMENT_ADDED:
        return `Attachment added: ${metadata?.file_name || 'file'}`;
      case TaskActivityType.ATTACHMENT_REMOVED:
        return `Attachment removed: ${metadata?.file_name || 'file'}`;
      case TaskActivityType.TAG_ADDED:
        return `Tag added: ${metadata?.tag || 'tag'}`;
      case TaskActivityType.TAG_REMOVED:
        return `Tag removed: ${metadata?.tag || 'tag'}`;
      default:
        return 'Task updated';
    }
  }

  // Task Dependencies
  async addDependency(
    userId: string,
    organizationId: string,
    projectId: string,
    taskId: string,
    dto: CreateTaskDependencyDto,
  ): Promise<TaskDependency> {
    // Verify the current task exists and user has access
    const task = await this.getTask(userId, organizationId, projectId, taskId);

    // Verify the dependent task exists and user has access (may be in different project)
    // First, find the task by ID within the organization
    const dependsOnTask = await this.taskRepository.findOne({
      where: {
        id: dto.depends_on_task_id,
        organization_id: organizationId,
      },
      relations: ['project', 'project.workspace'],
    });

    if (!dependsOnTask) {
      throw new NotFoundException('Dependent task not found');
    }

    // Verify user has access to the dependent task's project/workspace
    if (dependsOnTask.project?.workspace_id) {
      const membership = await this.memberRepository.findOne({
        where: {
          workspace_id: dependsOnTask.project.workspace_id,
          user_id: userId,
          is_active: true,
        },
      });

      if (!membership) {
        throw new ForbiddenException('You do not have access to the dependent task');
      }
    }

    // Prevent circular dependencies
    if (taskId === dto.depends_on_task_id) {
      throw new ForbiddenException('A task cannot depend on itself');
    }

    // Check if dependency already exists
    const existing = await this.dependencyRepository.findOne({
      where: {
        task_id: taskId,
        depends_on_task_id: dto.depends_on_task_id,
      },
    });

    if (existing) {
      throw new ForbiddenException('This dependency already exists');
    }

    // Check for circular dependency
    const reverseDependency = await this.dependencyRepository.findOne({
      where: {
        task_id: dto.depends_on_task_id,
        depends_on_task_id: taskId,
      },
    });

    if (reverseDependency) {
      throw new ForbiddenException('Circular dependency detected');
    }

    const dependency = this.dependencyRepository.create({
      task_id: taskId,
      depends_on_task_id: dto.depends_on_task_id,
      dependency_type: dto.dependency_type || TaskDependencyType.BLOCKS,
    });

    return this.dependencyRepository.save(dependency);
  }

  async getDependencies(
    userId: string,
    organizationId: string,
    projectId: string,
    taskId: string,
  ): Promise<{ blocking: TaskDependency[]; blocked_by: TaskDependency[]; related: TaskDependency[] }> {
    await this.getTask(userId, organizationId, projectId, taskId);

    const allDependencies = await this.dependencyRepository.find({
      where: [
        { task_id: taskId },
        { depends_on_task_id: taskId },
      ],
      relations: ['task', 'depends_on_task'],
    });

    const blocking = allDependencies.filter(
      (d) => d.task_id === taskId && d.dependency_type === TaskDependencyType.BLOCKS,
    );
    const blocked_by = allDependencies.filter(
      (d) => d.depends_on_task_id === taskId && d.dependency_type === TaskDependencyType.BLOCKS,
    );
    const related = allDependencies.filter(
      (d) => d.dependency_type === TaskDependencyType.RELATED,
    );

    return { blocking, blocked_by, related };
  }

  async removeDependency(
    userId: string,
    organizationId: string,
    projectId: string,
    taskId: string,
    dependencyId: string,
  ): Promise<void> {
    await this.getTask(userId, organizationId, projectId, taskId);

    const dependency = await this.dependencyRepository.findOne({
      where: {
        id: dependencyId,
        task_id: taskId,
      },
    });

    if (!dependency) {
      // Check if it's a reverse dependency
      const reverseDependency = await this.dependencyRepository.findOne({
        where: {
          id: dependencyId,
          depends_on_task_id: taskId,
        },
      });

      if (!reverseDependency) {
        throw new NotFoundException('Dependency not found');
      }

      await this.dependencyRepository.remove(reverseDependency);
      return;
    }

    await this.dependencyRepository.remove(dependency);
  }

  // Time Tracking
  async logTime(
    userId: string,
    organizationId: string,
    projectId: string,
    taskId: string,
    dto: CreateTaskTimeLogDto,
  ): Promise<TaskTimeLog> {
    await this.getTask(userId, organizationId, projectId, taskId);

    const timeLog = this.timeLogRepository.create({
      task_id: taskId,
      user_id: userId,
      logged_date: new Date(dto.logged_date),
      duration_minutes: dto.duration_minutes,
      description: dto.description || null,
      is_billable: dto.is_billable || false,
    });

    return this.timeLogRepository.save(timeLog);
  }

  async getTimeLogs(
    userId: string,
    organizationId: string,
    projectId: string,
    taskId: string,
    page?: number,
    limit?: number,
  ): Promise<{ data: TaskTimeLog[]; meta: { total: number; page: number; limit: number; totalPages: number } }> {
    await this.getTask(userId, organizationId, projectId, taskId);

    const pageNum = page || 1;
    const limitNum = limit || 50;
    const skip = (pageNum - 1) * limitNum;

    const [data, total] = await this.timeLogRepository.findAndCount({
      where: { task_id: taskId },
      relations: ['user'],
      order: { logged_date: 'DESC', created_at: 'DESC' },
      skip,
      take: limitNum,
    });

    return {
      data,
      meta: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  }

  async updateTimeLog(
    userId: string,
    organizationId: string,
    projectId: string,
    taskId: string,
    timeLogId: string,
    dto: UpdateTaskTimeLogDto,
  ): Promise<TaskTimeLog> {
    await this.getTask(userId, organizationId, projectId, taskId);

    const timeLog = await this.timeLogRepository.findOne({
      where: { id: timeLogId, task_id: taskId },
    });

    if (!timeLog) {
      throw new NotFoundException('Time log not found');
    }

    if (timeLog.user_id !== userId) {
      throw new ForbiddenException('You can only update your own time logs');
    }

    Object.assign(timeLog, dto);
    if (dto.logged_date) {
      timeLog.logged_date = new Date(dto.logged_date);
    }

    return this.timeLogRepository.save(timeLog);
  }

  async deleteTimeLog(
    userId: string,
    organizationId: string,
    projectId: string,
    taskId: string,
    timeLogId: string,
  ): Promise<void> {
    await this.getTask(userId, organizationId, projectId, taskId);

    const timeLog = await this.timeLogRepository.findOne({
      where: { id: timeLogId, task_id: taskId },
    });

    if (!timeLog) {
      throw new NotFoundException('Time log not found');
    }

    if (timeLog.user_id !== userId) {
      throw new ForbiddenException('You can only delete your own time logs');
    }

    await this.timeLogRepository.remove(timeLog);
  }

  async getTimeReport(
    userId: string,
    organizationId: string,
    projectId: string,
    startDate?: string,
    endDate?: string,
  ): Promise<{
    total_minutes: number;
    total_billable_minutes: number;
    logs_by_user: Array<{ user_id: string; user_name: string; total_minutes: number; billable_minutes: number }>;
    logs_by_task: Array<{ task_id: string; task_title: string; total_minutes: number; billable_minutes: number }>;
  }> {
    // Verify user has access to project
    const project = await this.projectRepository.findOne({
      where: { id: projectId, organization_id: organizationId },
      relations: ['workspace', 'workspace.members'],
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const queryBuilder = this.timeLogRepository
      .createQueryBuilder('log')
      .innerJoin('log.task', 'task')
      .where('task.project_id = :projectId', { projectId })
      .andWhere('task.organization_id = :organizationId', { organizationId });

    if (startDate) {
      queryBuilder.andWhere('log.logged_date >= :startDate', { startDate });
    }
    if (endDate) {
      queryBuilder.andWhere('log.logged_date <= :endDate', { endDate });
    }

    const logs = await queryBuilder
      .leftJoinAndSelect('log.user', 'user')
      .leftJoinAndSelect('log.task', 'task')
      .getMany();

    const total_minutes = logs.reduce((sum, log) => sum + log.duration_minutes, 0);
    const total_billable_minutes = logs
      .filter((log) => log.is_billable)
      .reduce((sum, log) => sum + log.duration_minutes, 0);

    // Group by user
    const userMap = new Map<string, { user_id: string; user_name: string; total_minutes: number; billable_minutes: number }>();
    logs.forEach((log) => {
      const key = log.user_id;
      if (!userMap.has(key)) {
        userMap.set(key, {
          user_id: log.user_id,
          user_name: `${log.user.first_name} ${log.user.last_name}`,
          total_minutes: 0,
          billable_minutes: 0,
        });
      }
      const userData = userMap.get(key)!;
      userData.total_minutes += log.duration_minutes;
      if (log.is_billable) {
        userData.billable_minutes += log.duration_minutes;
      }
    });

    // Group by task
    const taskMap = new Map<string, { task_id: string; task_title: string; total_minutes: number; billable_minutes: number }>();
    logs.forEach((log) => {
      const key = log.task_id;
      if (!taskMap.has(key)) {
        taskMap.set(key, {
          task_id: log.task_id,
          task_title: log.task.title,
          total_minutes: 0,
          billable_minutes: 0,
        });
      }
      const taskData = taskMap.get(key)!;
      taskData.total_minutes += log.duration_minutes;
      if (log.is_billable) {
        taskData.billable_minutes += log.duration_minutes;
      }
    });

    return {
      total_minutes,
      total_billable_minutes,
      logs_by_user: Array.from(userMap.values()),
      logs_by_task: Array.from(taskMap.values()),
    };
  }

  // ── Card Watchers ─────────────────────────────────────────────────────────

  async addWatcher(
    userId: string,
    organizationId: string,
    projectId: string,
    taskId: string,
  ): Promise<TaskWatcher> {
    await this.getTask(userId, organizationId, projectId, taskId);
    const existing = await this.watcherRepository.findOne({ where: { task_id: taskId, user_id: userId } });
    if (existing) return existing;
    const watcher = this.watcherRepository.create({ task_id: taskId, user_id: userId });
    return this.watcherRepository.save(watcher);
  }

  async removeWatcher(
    userId: string,
    organizationId: string,
    projectId: string,
    taskId: string,
  ): Promise<void> {
    await this.getTask(userId, organizationId, projectId, taskId);
    await this.watcherRepository.delete({ task_id: taskId, user_id: userId });
  }

  async getWatchers(
    userId: string,
    organizationId: string,
    projectId: string,
    taskId: string,
  ): Promise<TaskWatcher[]> {
    await this.getTask(userId, organizationId, projectId, taskId);
    return this.watcherRepository.find({ where: { task_id: taskId }, relations: ['user'] });
  }

  // ── CRM Deal Linking ─────────────────────────────────────────────────────

  async linkCrmDeal(
    userId: string,
    organizationId: string,
    projectId: string,
    taskId: string,
    crmDealId: string | null,
  ): Promise<Task> {
    const task = await this.taskRepository.findOne({
      where: { id: taskId, project_id: projectId, organization_id: organizationId },
    });
    if (!task) throw new NotFoundException('Task not found');

    task.crm_deal_id = crmDealId;
    return this.taskRepository.save(task);
  }
}


