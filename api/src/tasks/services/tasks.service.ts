import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Task } from '../../database/entities/tasks.entity';
import { TaskComment } from '../../database/entities/task_comments.entity';
import { TaskAttachment } from '../../database/entities/task_attachments.entity';
import { TaskWatcher } from '../../database/entities/task_watchers.entity';
import { CreateTaskDto } from '../dto/create-task.dto';
import { UpdateTaskDto } from '../dto/update-task.dto';
import { AddCommentDto } from '../dto/add-comment.dto';

@Injectable()
export class TasksService {
    constructor(
        @InjectRepository(Task)
        private taskRepository: Repository<Task>,
        @InjectRepository(TaskComment)
        private commentRepository: Repository<TaskComment>,
        @InjectRepository(TaskAttachment)
        private attachmentRepository: Repository<TaskAttachment>,
        @InjectRepository(TaskWatcher)
        private watcherRepository: Repository<TaskWatcher>,
    ) { }

    async create(createTaskDto: CreateTaskDto, projectId: string, userId: string, organizationId: string): Promise<Task> {
        const task = this.taskRepository.create({
            ...createTaskDto,
            project_id: projectId,
            organization_id: organizationId,
            created_by: userId,
        });
        return this.taskRepository.save(task);
    }

    async findAll(projectId: string, organizationId: string, accessibleOrganizationIds?: string[]): Promise<{ data: Task[]; meta: any }> {
        const orgIds = accessibleOrganizationIds && accessibleOrganizationIds.length > 0
            ? accessibleOrganizationIds
            : [organizationId];

        const tasks = await this.taskRepository.find({
            where: { project_id: projectId, organization_id: In(orgIds) },
            relations: ['assignee', 'creator'],
            order: { created_at: 'DESC' },
        });

        return {
            data: tasks,
            meta: { total: tasks.length },
        };
    }

    async findOne(id: string, projectId: string, organizationId: string, accessibleOrganizationIds?: string[]): Promise<Task> {
        const orgIds = accessibleOrganizationIds && accessibleOrganizationIds.length > 0
            ? accessibleOrganizationIds
            : [organizationId];

        const task = await this.taskRepository.findOne({
            where: { id, project_id: projectId, organization_id: In(orgIds) },
            relations: ['assignee', 'creator', 'tags'],
        });

        if (!task) {
            throw new NotFoundException(`Task with ID ${id} not found`);
        }
        return task;
    }

    async update(id: string, projectId: string, updateTaskDto: UpdateTaskDto, organizationId: string, accessibleOrganizationIds?: string[]): Promise<Task> {
        const task = await this.findOne(id, projectId, organizationId, accessibleOrganizationIds);
        Object.assign(task, updateTaskDto);
        return this.taskRepository.save(task);
    }

    async remove(id: string, projectId: string, organizationId: string, accessibleOrganizationIds?: string[]): Promise<void> {
        const task = await this.findOne(id, projectId, organizationId, accessibleOrganizationIds);
        await this.taskRepository.remove(task);
    }

    // Comments
    async addComment(taskId: string, projectId: string, userId: string, dto: AddCommentDto, organizationId: string, accessibleOrganizationIds?: string[]): Promise<TaskComment> {
        await this.findOne(taskId, projectId, organizationId, accessibleOrganizationIds); // Verify task exists and access
        const comment = this.commentRepository.create({
            ...dto,
            task_id: taskId,
            created_by: userId,
        });
        return this.commentRepository.save(comment);
    }

    async getComments(taskId: string, projectId: string, organizationId: string, accessibleOrganizationIds?: string[]): Promise<{ data: TaskComment[]; meta: any }> {
        await this.findOne(taskId, projectId, organizationId, accessibleOrganizationIds);
        const comments = await this.commentRepository.find({
            where: { task_id: taskId },
            relations: ['author', 'parent_comment'],
            order: { created_at: 'ASC' },
        });
        return { data: comments, meta: { total: comments.length } };
    }

    async deleteComment(commentId: string, taskId: string, projectId: string, userId: string, organizationId: string, accessibleOrganizationIds?: string[]): Promise<void> {
        await this.findOne(taskId, projectId, organizationId, accessibleOrganizationIds);
        const comment = await this.commentRepository.findOne({ where: { id: commentId, task_id: taskId } });
        if (!comment) throw new NotFoundException('Comment not found');
        if (comment.created_by !== userId) throw new ForbiddenException('Cannot delete comment created by another user');

        await this.commentRepository.remove(comment);
    }

    // Attachments - Simplified for now, assuming file upload returns URL
    async addAttachment(taskId: string, projectId: string, userId: string, fileData: any, organizationId: string, accessibleOrganizationIds?: string[]): Promise<TaskAttachment> {
        await this.findOne(taskId, projectId, organizationId, accessibleOrganizationIds);
        const attachment = this.attachmentRepository.create({
            ...fileData,
            task_id: taskId,
            uploaded_by: userId,
        });
        const saved = await this.attachmentRepository.save(attachment);
        return Array.isArray(saved) ? saved[0] : saved;
    }

    async getAttachments(taskId: string, projectId: string, organizationId: string, accessibleOrganizationIds?: string[]): Promise<TaskAttachment[]> {
        await this.findOne(taskId, projectId, organizationId, accessibleOrganizationIds);
        return this.attachmentRepository.find({
            where: { task_id: taskId },
            relations: ['uploader'],
            order: { created_at: 'DESC' },
        });
    }

    async deleteAttachment(attachmentId: string, taskId: string, projectId: string, organizationId: string, accessibleOrganizationIds?: string[]): Promise<void> {
        await this.findOne(taskId, projectId, organizationId, accessibleOrganizationIds);
        const result = await this.attachmentRepository.delete({ id: attachmentId, task_id: taskId });
        if (result.affected === 0) throw new NotFoundException('Attachment not found');
    }

    // --- Watchers ---
    async addWatcher(taskId: string, userId: string): Promise<TaskWatcher> {
        // Prevent duplicate
        const existing = await this.watcherRepository.findOne({ where: { task_id: taskId, user_id: userId } });
        if (existing) return existing;
        const watcher = this.watcherRepository.create({ task_id: taskId, user_id: userId });
        return this.watcherRepository.save(watcher);
    }

    async removeWatcher(taskId: string, userId: string): Promise<void> {
        await this.watcherRepository.delete({ task_id: taskId, user_id: userId });
    }

    async getWatchers(taskId: string): Promise<TaskWatcher[]> {
        return this.watcherRepository.find({ where: { task_id: taskId }, relations: ['user'] });
    }

    // List/Table View with sorting/filtering/pagination
    async listView(
        projectId: string,
        organizationId: string,
        accessibleOrganizationIds: string[],
        query: any
    ): Promise<{ data: Task[]; meta: any }> {
        const orgIds = accessibleOrganizationIds && accessibleOrganizationIds.length > 0
            ? accessibleOrganizationIds
            : [organizationId];

        const qb = this.taskRepository.createQueryBuilder('task')
            .where('task.project_id = :projectId', { projectId })
            .andWhere('task.organization_id IN (:...orgIds)', { orgIds });

        // Filtering
        if (query.status) {
            qb.andWhere('task.status = :status', { status: query.status });
        }
        if (query.assignee_id) {
            qb.andWhere('task.assignee_id = :assignee_id', { assignee_id: query.assignee_id });
        }
        if (query.priority) {
            qb.andWhere('task.priority = :priority', { priority: query.priority });
        }
        if (query.search) {
            qb.andWhere('task.title ILIKE :search OR task.description ILIKE :search', { search: `%${query.search}%` });
        }
        // Sorting
        if (query.sortBy && query.sortOrder) {
            qb.orderBy(`task.${query.sortBy}`, query.sortOrder.toUpperCase() === 'DESC' ? 'DESC' : 'ASC');
        } else {
            qb.orderBy('task.created_at', 'DESC');
        }
        // Pagination
        const page = parseInt(query.page, 10) || 1;
        const pageSize = parseInt(query.pageSize, 10) || 20;
        qb.skip((page - 1) * pageSize).take(pageSize);

        qb.leftJoinAndSelect('task.assignee', 'assignee');
        qb.leftJoinAndSelect('task.creator', 'creator');

        const [tasks, total] = await qb.getManyAndCount();
        return {
            data: tasks,
            meta: { total, page, pageSize },
        };
    }
}
