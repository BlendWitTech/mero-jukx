import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { TaskService } from '../services/task.service';
import { JwtAuthGuard } from '../../../../src/auth/guards/jwt-auth.guard';
import { AppAccessGuard } from '../../../../src/common/guards/app-access.guard';
import { PermissionsGuard } from '../../../../src/common/guards/permissions.guard';
import { Permissions } from '../../../../src/common/decorators/permissions.decorator';
import { CurrentUser } from '../../../../src/common/decorators/current-user.decorator';
import { CurrentOrganization } from '../../../../src/common/decorators/current-organization.decorator';
import { CreateTaskDto } from '../dto/create-task.dto';
import { UpdateTaskDto } from '../dto/update-task.dto';
import { AddTaskCommentDto } from '../dto/add-task-comment.dto';
import { UpdateTaskCommentDto } from '../dto/update-task-comment.dto';
import { AddTaskAttachmentDto } from '../dto/add-task-attachment.dto';
import { CreateTaskDependencyDto } from '../dto/create-task-dependency.dto';
import { CreateTaskTimeLogDto } from '../dto/create-task-time-log.dto';
import { UpdateTaskTimeLogDto } from '../dto/update-task-time-log.dto';

@ApiTags('mero-board-tasks')
@Controller('apps/:appSlug/projects/:projectId/tasks')
@UseGuards(JwtAuthGuard, AppAccessGuard, PermissionsGuard)
@ApiBearerAuth()
export class TaskController {
  constructor(private readonly taskService: TaskService) { }

  @Post()
  @Permissions('board.tasks.manage')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new task' })
  @ApiResponse({ status: 201, description: 'Task created successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiParam({ name: 'appSlug', description: 'App Slug' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  async createTask(
    @CurrentUser() user: any,
    @CurrentOrganization() organization: any,
    @Param('appSlug') appSlug: string,
    @Param('projectId') projectId: string,
    @Body() createDto: CreateTaskDto,
  ) {
    return this.taskService.createTask(
      user.userId,
      organization.id,
      projectId,
      createDto,
    );
  }

  @Get()
  @Permissions('board.tasks.view')
  @ApiOperation({ summary: 'Get all tasks for a project' })
  @ApiResponse({ status: 200, description: 'Tasks retrieved successfully' })
  @ApiParam({ name: 'appSlug', description: 'App Slug' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by status' })
  @ApiQuery({ name: 'priority', required: false, description: 'Filter by priority' })
  @ApiQuery({ name: 'assigneeId', required: false, description: 'Filter by assignee (use "unassigned" for unassigned tasks)' })
  @ApiQuery({ name: 'search', required: false, description: 'Search in title and description' })
  @ApiQuery({ name: 'dueDate', required: false, description: 'Filter by due date: overdue, today, this_week, this_month, none' })
  @ApiQuery({ name: 'tags', required: false, description: 'Filter by tags (comma-separated)' })
  @ApiQuery({ name: 'sortBy', required: false, description: 'Sort by: created_at, due_date, priority, status, title' })
  @ApiQuery({ name: 'sortOrder', required: false, description: 'Sort order: asc, desc' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number', type: Number })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page', type: Number })
  async getTasks(
    @CurrentUser() user: any,
    @CurrentOrganization() organization: any,
    @Param('appSlug') appSlug: string,
    @Param('projectId') projectId: string,
    @Query('status') status?: string,
    @Query('priority') priority?: string,
    @Query('assigneeId') assigneeId?: string,
    @Query('search') search?: string,
    @Query('dueDate') dueDate?: string,
    @Query('tags') tags?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const tagsArray = tags ? tags.split(',').filter(Boolean) : undefined;
    const pageNum = page ? parseInt(String(page), 10) : undefined;
    const limitNum = limit ? parseInt(String(limit), 10) : undefined;
    return this.taskService.getTasks(
      user.userId,
      organization.id,
      projectId,
      { status, priority, assigneeId, search, dueDate, tags: tagsArray, sortBy, sortOrder, page: pageNum, limit: limitNum },
    );
  }

  @Get('calendar')
  @Permissions('board.tasks.view')
  @ApiOperation({ summary: 'Get all tasks for a project within a date range (calendar view)' })
  @ApiResponse({ status: 200, description: 'Tasks retrieved successfully' })
  @ApiParam({ name: 'appSlug', description: 'App Slug' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiQuery({ name: 'startDate', required: true, description: 'Start date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'endDate', required: true, description: 'End date (YYYY-MM-DD)' })
  async getTasksForCalendar(
    @CurrentUser() user: any,
    @CurrentOrganization() organization: any,
    @Param('appSlug') appSlug: string,
    @Param('projectId') projectId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.taskService.getTasksForCalendar(
      user.userId,
      organization.id,
      projectId,
      startDate,
      endDate,
    );
  }

  @Get(':taskId')
  @Permissions('board.tasks.view')
  @ApiOperation({ summary: 'Get a specific task' })
  @ApiResponse({ status: 200, description: 'Task retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  @ApiParam({ name: 'appSlug', description: 'App Slug' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'taskId', description: 'Task ID' })
  async getTask(
    @CurrentUser() user: any,
    @CurrentOrganization() organization: any,
    @Param('appSlug') appSlug: string,
    @Param('projectId') projectId: string,
    @Param('taskId') taskId: string,
  ) {
    return this.taskService.getTask(
      user.userId,
      organization.id,
      projectId,
      taskId,
    );
  }

  @Put(':taskId')
  @Permissions('board.tasks.manage')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update a task' })
  @ApiResponse({ status: 200, description: 'Task updated successfully' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiParam({ name: 'appSlug', description: 'App Slug' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'taskId', description: 'Task ID' })
  async updateTask(
    @CurrentUser() user: any,
    @CurrentOrganization() organization: any,
    @Param('appSlug') appSlug: string,
    @Param('projectId') projectId: string,
    @Param('taskId') taskId: string,
    @Body() updateDto: UpdateTaskDto,
  ) {
    return this.taskService.updateTask(
      user.userId,
      organization.id,
      projectId,
      taskId,
      updateDto,
    );
  }

  @Delete(':taskId')
  @Permissions('board.tasks.manage')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a task' })
  @ApiResponse({ status: 204, description: 'Task deleted successfully' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiParam({ name: 'appSlug', description: 'App Slug' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'taskId', description: 'Task ID' })
  async deleteTask(
    @CurrentUser() user: any,
    @CurrentOrganization() organization: any,
    @Param('appSlug') appSlug: string,
    @Param('projectId') projectId: string,
    @Param('taskId') taskId: string,
  ) {
    await this.taskService.deleteTask(
      user.userId,
      organization.id,
      projectId,
      taskId,
    );
  }

  @Post(':taskId/move')
  @Permissions('board.tasks.manage')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Move a task to a different column/position' })
  @ApiResponse({ status: 200, description: 'Task moved successfully' })
  @ApiParam({ name: 'appSlug', description: 'App Slug' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'taskId', description: 'Task ID' })
  async moveTask(
    @CurrentUser() user: any,
    @CurrentOrganization() organization: any,
    @Param('appSlug') appSlug: string,
    @Param('projectId') projectId: string,
    @Param('taskId') taskId: string,
    @Body() body: { targetColumnId: string; position: number },
  ) {
    return this.taskService.moveTask(
      user.userId,
      organization.id,
      projectId,
      taskId,
      body.targetColumnId,
      body.position,
    );
  }

  // Task Checklists
  @Post(':taskId/checklist')
  @Permissions('board.tasks.manage')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add a checklist item to a task' })
  @ApiParam({ name: 'appSlug', description: 'App Slug' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'taskId', description: 'Task ID' })
  async addChecklistItem(
    @CurrentUser() user: any,
    @CurrentOrganization() organization: any,
    @Param('appSlug') appSlug: string,
    @Param('projectId') projectId: string,
    @Param('taskId') taskId: string,
    @Body() body: { title: string },
  ) {
    return this.taskService.addChecklistItem(
      user.userId,
      organization.id,
      projectId,
      taskId,
      body.title,
    );
  }

  @Put(':taskId/checklist/:itemId/toggle')
  @Permissions('board.tasks.manage')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Toggle a checklist item completion status' })
  @ApiParam({ name: 'appSlug', description: 'App Slug' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'taskId', description: 'Task ID' })
  @ApiParam({ name: 'itemId', description: 'Checklist Item ID' })
  async toggleChecklistItem(
    @CurrentUser() user: any,
    @CurrentOrganization() organization: any,
    @Param('appSlug') appSlug: string,
    @Param('projectId') projectId: string,
    @Param('taskId') taskId: string,
    @Param('itemId') itemId: string,
  ) {
    return this.taskService.toggleChecklistItem(
      user.userId,
      organization.id,
      projectId,
      taskId,
      itemId,
    );
  }

  @Delete(':taskId/checklist/:itemId')
  @Permissions('board.tasks.manage')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a checklist item' })
  @ApiParam({ name: 'appSlug', description: 'App Slug' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'taskId', description: 'Task ID' })
  @ApiParam({ name: 'itemId', description: 'Checklist Item ID' })
  async deleteChecklistItem(
    @CurrentUser() user: any,
    @CurrentOrganization() organization: any,
    @Param('appSlug') appSlug: string,
    @Param('projectId') projectId: string,
    @Param('taskId') taskId: string,
    @Param('itemId') itemId: string,
  ) {
    await this.taskService.deleteChecklistItem(
      user.userId,
      organization.id,
      projectId,
      taskId,
      itemId,
    );
  }

  // Task Comments
  @Post(':taskId/comments')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add a comment to a task' })
  @ApiResponse({ status: 201, description: 'Comment added successfully' })
  @ApiParam({ name: 'appSlug', description: 'App Slug' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'taskId', description: 'Task ID' })
  async addComment(
    @CurrentUser() user: any,
    @CurrentOrganization() organization: any,
    @Param('appSlug') appSlug: string,
    @Param('projectId') projectId: string,
    @Param('taskId') taskId: string,
    @Body() dto: AddTaskCommentDto,
  ) {
    return this.taskService.addComment(
      user.userId,
      organization.id,
      projectId,
      taskId,
      dto,
    );
  }

  @Get(':taskId/comments')
  @ApiOperation({ summary: 'Get all comments for a task' })
  @ApiResponse({ status: 200, description: 'Comments retrieved successfully' })
  @ApiParam({ name: 'appSlug', description: 'App Slug' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'taskId', description: 'Task ID' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number', type: Number })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page', type: Number })
  async getComments(
    @CurrentUser() user: any,
    @CurrentOrganization() organization: any,
    @Param('appSlug') appSlug: string,
    @Param('projectId') projectId: string,
    @Param('taskId') taskId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const pageNum = page ? parseInt(String(page), 10) : undefined;
    const limitNum = limit ? parseInt(String(limit), 10) : undefined;
    return this.taskService.getComments(
      user.userId,
      organization.id,
      projectId,
      taskId,
      pageNum,
      limitNum,
    );
  }

  @Put(':taskId/comments/:commentId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update a task comment' })
  @ApiResponse({ status: 200, description: 'Comment updated successfully' })
  @ApiParam({ name: 'appSlug', description: 'App Slug' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'taskId', description: 'Task ID' })
  @ApiParam({ name: 'commentId', description: 'Comment ID' })
  async updateComment(
    @CurrentUser() user: any,
    @CurrentOrganization() organization: any,
    @Param('appSlug') appSlug: string,
    @Param('projectId') projectId: string,
    @Param('taskId') taskId: string,
    @Param('commentId') commentId: string,
    @Body() dto: UpdateTaskCommentDto,
  ) {
    return this.taskService.updateComment(
      user.userId,
      organization.id,
      projectId,
      taskId,
      commentId,
      dto,
    );
  }

  @Delete(':taskId/comments/:commentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a task comment' })
  @ApiResponse({ status: 204, description: 'Comment deleted successfully' })
  @ApiParam({ name: 'appSlug', description: 'App Slug' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'taskId', description: 'Task ID' })
  @ApiParam({ name: 'commentId', description: 'Comment ID' })
  async deleteComment(
    @CurrentUser() user: any,
    @CurrentOrganization() organization: any,
    @Param('appSlug') appSlug: string,
    @Param('projectId') projectId: string,
    @Param('taskId') taskId: string,
    @Param('commentId') commentId: string,
  ) {
    await this.taskService.deleteComment(
      user.userId,
      organization.id,
      projectId,
      taskId,
      commentId,
    );
  }

  // Task Attachments
  @Post(':taskId/attachments')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add an attachment to a task' })
  @ApiResponse({ status: 201, description: 'Attachment added successfully' })
  @ApiParam({ name: 'appSlug', description: 'App Slug' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'taskId', description: 'Task ID' })
  async addAttachment(
    @CurrentUser() user: any,
    @CurrentOrganization() organization: any,
    @Param('appSlug') appSlug: string,
    @Param('projectId') projectId: string,
    @Param('taskId') taskId: string,
    @Body() dto: AddTaskAttachmentDto,
  ) {
    return this.taskService.addAttachment(
      user.userId,
      organization.id,
      projectId,
      taskId,
      dto,
    );
  }

  @Get(':taskId/attachments')
  @ApiOperation({ summary: 'Get all attachments for a task' })
  @ApiResponse({ status: 200, description: 'Attachments retrieved successfully' })
  @ApiParam({ name: 'appSlug', description: 'App Slug' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'taskId', description: 'Task ID' })
  async getAttachments(
    @CurrentUser() user: any,
    @CurrentOrganization() organization: any,
    @Param('appSlug') appSlug: string,
    @Param('projectId') projectId: string,
    @Param('taskId') taskId: string,
  ) {
    return this.taskService.getAttachments(
      user.userId,
      organization.id,
      projectId,
      taskId,
    );
  }

  @Delete(':taskId/attachments/:attachmentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a task attachment' })
  @ApiResponse({ status: 204, description: 'Attachment deleted successfully' })
  @ApiParam({ name: 'appSlug', description: 'App Slug' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'taskId', description: 'Task ID' })
  @ApiParam({ name: 'attachmentId', description: 'Attachment ID' })
  async deleteAttachment(
    @CurrentUser() user: any,
    @CurrentOrganization() organization: any,
    @Param('appSlug') appSlug: string,
    @Param('projectId') projectId: string,
    @Param('taskId') taskId: string,
    @Param('attachmentId') attachmentId: string,
  ) {
    await this.taskService.deleteAttachment(
      user.userId,
      organization.id,
      projectId,
      taskId,
      attachmentId,
    );
  }

  // Task Activities
  @Get(':taskId/activities')
  @ApiOperation({ summary: 'Get activity timeline for a task' })
  @ApiResponse({ status: 200, description: 'Activities retrieved successfully' })
  @ApiParam({ name: 'appSlug', description: 'App Slug' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'taskId', description: 'Task ID' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number', type: Number })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page', type: Number })
  async getActivities(
    @CurrentUser() user: any,
    @CurrentOrganization() organization: any,
    @Param('appSlug') appSlug: string,
    @Param('projectId') projectId: string,
    @Param('taskId') taskId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const pageNum = page ? parseInt(String(page), 10) : undefined;
    const limitNum = limit ? parseInt(String(limit), 10) : undefined;
    return this.taskService.getActivities(
      user.userId,
      organization.id,
      projectId,
      taskId,
      pageNum,
      limitNum,
    );
  }

  // Task Dependencies
  @Post(':taskId/dependencies')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add a task dependency' })
  @ApiResponse({ status: 201, description: 'Dependency created successfully' })
  @ApiParam({ name: 'appSlug', description: 'App Slug' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'taskId', description: 'Task ID' })
  async addDependency(
    @CurrentUser() user: any,
    @CurrentOrganization() organization: any,
    @Param('appSlug') appSlug: string,
    @Param('projectId') projectId: string,
    @Param('taskId') taskId: string,
    @Body() dto: CreateTaskDependencyDto,
  ) {
    return this.taskService.addDependency(
      user.userId,
      organization.id,
      projectId,
      taskId,
      dto,
    );
  }

  @Get(':taskId/dependencies')
  @ApiOperation({ summary: 'Get task dependencies' })
  @ApiResponse({ status: 200, description: 'Dependencies retrieved successfully' })
  @ApiParam({ name: 'appSlug', description: 'App Slug' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'taskId', description: 'Task ID' })
  async getDependencies(
    @CurrentUser() user: any,
    @CurrentOrganization() organization: any,
    @Param('appSlug') appSlug: string,
    @Param('projectId') projectId: string,
    @Param('taskId') taskId: string,
  ) {
    return this.taskService.getDependencies(
      user.userId,
      organization.id,
      projectId,
      taskId,
    );
  }

  @Delete(':taskId/dependencies/:dependencyId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a task dependency' })
  @ApiResponse({ status: 204, description: 'Dependency removed successfully' })
  @ApiParam({ name: 'appSlug', description: 'App Slug' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'taskId', description: 'Task ID' })
  @ApiParam({ name: 'dependencyId', description: 'Dependency ID' })
  async removeDependency(
    @CurrentUser() user: any,
    @CurrentOrganization() organization: any,
    @Param('appSlug') appSlug: string,
    @Param('projectId') projectId: string,
    @Param('taskId') taskId: string,
    @Param('dependencyId') dependencyId: string,
  ) {
    await this.taskService.removeDependency(
      user.userId,
      organization.id,
      projectId,
      taskId,
      dependencyId,
    );
  }

  // Time Tracking
  @Post(':taskId/time-logs')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Log time for a task' })
  @ApiResponse({ status: 201, description: 'Time logged successfully' })
  @ApiParam({ name: 'appSlug', description: 'App Slug' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'taskId', description: 'Task ID' })
  async logTime(
    @CurrentUser() user: any,
    @CurrentOrganization() organization: any,
    @Param('appSlug') appSlug: string,
    @Param('projectId') projectId: string,
    @Param('taskId') taskId: string,
    @Body() dto: CreateTaskTimeLogDto,
  ) {
    return this.taskService.logTime(
      user.userId,
      organization.id,
      projectId,
      taskId,
      dto,
    );
  }

  @Get(':taskId/time-logs')
  @ApiOperation({ summary: 'Get time logs for a task' })
  @ApiResponse({ status: 200, description: 'Time logs retrieved successfully' })
  @ApiParam({ name: 'appSlug', description: 'App Slug' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'taskId', description: 'Task ID' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number', type: Number })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page', type: Number })
  async getTimeLogs(
    @CurrentUser() user: any,
    @CurrentOrganization() organization: any,
    @Param('appSlug') appSlug: string,
    @Param('projectId') projectId: string,
    @Param('taskId') taskId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const pageNum = page ? parseInt(String(page), 10) : undefined;
    const limitNum = limit ? parseInt(String(limit), 10) : undefined;
    return this.taskService.getTimeLogs(
      user.userId,
      organization.id,
      projectId,
      taskId,
      pageNum,
      limitNum,
    );
  }

  @Put(':taskId/time-logs/:timeLogId')
  @ApiOperation({ summary: 'Update a time log' })
  @ApiResponse({ status: 200, description: 'Time log updated successfully' })
  @ApiParam({ name: 'appSlug', description: 'App Slug' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'taskId', description: 'Task ID' })
  @ApiParam({ name: 'timeLogId', description: 'Time Log ID' })
  async updateTimeLog(
    @CurrentUser() user: any,
    @CurrentOrganization() organization: any,
    @Param('appSlug') appSlug: string,
    @Param('projectId') projectId: string,
    @Param('taskId') taskId: string,
    @Param('timeLogId') timeLogId: string,
    @Body() dto: UpdateTaskTimeLogDto,
  ) {
    return this.taskService.updateTimeLog(
      user.userId,
      organization.id,
      projectId,
      taskId,
      timeLogId,
      dto,
    );
  }

  @Delete(':taskId/time-logs/:timeLogId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a time log' })
  @ApiResponse({ status: 204, description: 'Time log deleted successfully' })
  @ApiParam({ name: 'appSlug', description: 'App Slug' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'taskId', description: 'Task ID' })
  @ApiParam({ name: 'timeLogId', description: 'Time Log ID' })
  async deleteTimeLog(
    @CurrentUser() user: any,
    @CurrentOrganization() organization: any,
    @Param('appSlug') appSlug: string,
    @Param('projectId') projectId: string,
    @Param('taskId') taskId: string,
    @Param('timeLogId') timeLogId: string,
  ) {
    await this.taskService.deleteTimeLog(
      user.userId,
      organization.id,
      projectId,
      taskId,
      timeLogId,
    );
  }

  @Get('time-report')
  @ApiOperation({ summary: 'Get time tracking report for project' })
  @ApiResponse({ status: 200, description: 'Time report retrieved successfully' })
  @ApiParam({ name: 'appSlug', description: 'App Slug' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  async getTimeReport(
    @CurrentUser() user: any,
    @CurrentOrganization() organization: any,
    @Param('appSlug') appSlug: string,
    @Param('projectId') projectId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.taskService.getTimeReport(
      user.userId,
      organization.id,
      projectId,
      startDate,
      endDate,
    );
  }

  // ── Card Watchers ────────────────────────────────────────────────────────

  @Post(':taskId/watchers')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Watch a task' })
  @ApiResponse({ status: 201, description: 'Now watching task' })
  @ApiParam({ name: 'appSlug', description: 'App Slug' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'taskId', description: 'Task ID' })
  async addWatcher(
    @CurrentUser() user: any,
    @CurrentOrganization() organization: any,
    @Param('appSlug') appSlug: string,
    @Param('projectId') projectId: string,
    @Param('taskId') taskId: string,
  ) {
    return this.taskService.addWatcher(user.userId, organization.id, projectId, taskId);
  }

  @Delete(':taskId/watchers')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Unwatch a task' })
  @ApiResponse({ status: 204, description: 'Stopped watching task' })
  @ApiParam({ name: 'appSlug', description: 'App Slug' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'taskId', description: 'Task ID' })
  async removeWatcher(
    @CurrentUser() user: any,
    @CurrentOrganization() organization: any,
    @Param('appSlug') appSlug: string,
    @Param('projectId') projectId: string,
    @Param('taskId') taskId: string,
  ) {
    await this.taskService.removeWatcher(user.userId, organization.id, projectId, taskId);
  }

  @Get(':taskId/watchers')
  @ApiOperation({ summary: 'Get all watchers of a task' })
  @ApiResponse({ status: 200, description: 'Watchers retrieved' })
  @ApiParam({ name: 'appSlug', description: 'App Slug' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'taskId', description: 'Task ID' })
  async getWatchers(
    @CurrentUser() user: any,
    @CurrentOrganization() organization: any,
    @Param('appSlug') appSlug: string,
    @Param('projectId') projectId: string,
    @Param('taskId') taskId: string,
  ) {
    return this.taskService.getWatchers(user.userId, organization.id, projectId, taskId);
  }

  // ── CRM Deal Linking ─────────────────────────────────────────────────────

  @Put(':taskId/crm-deal')
  @ApiOperation({ summary: 'Link or unlink a CRM deal to a task' })
  @ApiParam({ name: 'appSlug', description: 'App Slug' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'taskId', description: 'Task ID' })
  async linkCrmDeal(
    @CurrentUser() user: any,
    @CurrentOrganization() organization: any,
    @Param('projectId') projectId: string,
    @Param('taskId') taskId: string,
    @Body() body: { crm_deal_id: string | null },
  ) {
    return this.taskService.linkCrmDeal(
      user.userId,
      organization.id,
      projectId,
      taskId,
      body.crm_deal_id,
    );
  }
}


