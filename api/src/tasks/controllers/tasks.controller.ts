import { Controller, Get, Post, Body, Put, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { TasksService } from '../services/tasks.service';
import { CreateTaskDto } from '../dto/create-task.dto';
import { UpdateTaskDto } from '../dto/update-task.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

@Controller('apps/mero-board/projects/:projectId/tasks')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class TasksController {
    constructor(private readonly tasksService: TasksService) { }

    @Post()
    create(
        @Param('projectId') projectId: string,
        @Body() createTaskDto: CreateTaskDto,
        @Request() req
    ) {
        return this.tasksService.create(createTaskDto, projectId, req.user.userId, req.user.organizationId);
    }

    @Get()
    findAll(@Param('projectId') projectId: string, @Request() req) {
        return this.tasksService.findAll(projectId, req.user.organizationId, req.user.accessibleOrganizationIds);
    }

    @Get(':id')
    findOne(
        @Param('projectId') projectId: string,
        @Param('id') id: string,
        @Request() req
    ) {
        return this.tasksService.findOne(id, projectId, req.user.organizationId, req.user.accessibleOrganizationIds);
    }

    @Put(':id')
    update(
        @Param('projectId') projectId: string,
        @Param('id') id: string,
        @Body() updateTaskDto: UpdateTaskDto,
        @Request() req
    ) {
        return this.tasksService.update(id, projectId, updateTaskDto, req.user.organizationId, req.user.accessibleOrganizationIds);
    }

    @Delete(':id')
    remove(
        @Param('projectId') projectId: string,
        @Param('id') id: string,
        @Request() req
    ) {
        return this.tasksService.remove(id, projectId, req.user.organizationId, req.user.accessibleOrganizationIds);
    }

    // Comments
    @Post(':id/comments')
    addComment(
        @Param('projectId') projectId: string,
        @Param('id') id: string,
        @Body() body: any,
        @Request() req
    ) {
        return this.tasksService.addComment(id, projectId, req.user.userId, body, req.user.organizationId, req.user.accessibleOrganizationIds);
    }

    @Get(':id/comments')
    getComments(
        @Param('projectId') projectId: string,
        @Param('id') id: string,
        @Request() req
    ) {
        return this.tasksService.getComments(id, projectId, req.user.organizationId, req.user.accessibleOrganizationIds);
    }

    @Delete(':id/comments/:commentId')
    deleteComment(
        @Param('projectId') projectId: string,
        @Param('id') id: string,
        @Param('commentId') commentId: string,
        @Request() req
    ) {
        return this.tasksService.deleteComment(commentId, id, projectId, req.user.userId, req.user.organizationId, req.user.accessibleOrganizationIds);
    }

    // Attachments
    @Post(':id/attachments')
    addAttachment(
        @Param('projectId') projectId: string,
        @Param('id') id: string,
        @Body() body: any,
        @Request() req
    ) {
        return this.tasksService.addAttachment(id, projectId, req.user.userId, body, req.user.organizationId, req.user.accessibleOrganizationIds);
    }

    @Get(':id/attachments')
    getAttachments(
        @Param('projectId') projectId: string,
        @Param('id') id: string,
        @Request() req
    ) {
        return this.tasksService.getAttachments(id, projectId, req.user.organizationId, req.user.accessibleOrganizationIds);
    }

    @Delete(':id/attachments/:attachmentId')
    deleteAttachment(
        @Param('projectId') projectId: string,
        @Param('id') id: string,
        @Param('attachmentId') attachmentId: string,
        @Request() req
    ) {
        return this.tasksService.deleteAttachment(attachmentId, id, projectId, req.user.organizationId, req.user.accessibleOrganizationIds);
    }

    // --- Watchers ---
    @Post(':id/watchers')
    addWatcher(
        @Param('projectId') projectId: string,
        @Param('id') id: string,
        @Request() req
    ) {
        // Only user themselves can watch
        return this.tasksService.addWatcher(id, req.user.userId);
    }

    @Delete(':id/watchers')
    removeWatcher(
        @Param('projectId') projectId: string,
        @Param('id') id: string,
        @Request() req
    ) {
        return this.tasksService.removeWatcher(id, req.user.userId);
    }

    @Get(':id/watchers')
    getWatchers(
        @Param('projectId') projectId: string,
        @Param('id') id: string
    ) {
        return this.tasksService.getWatchers(id);
    }

    @Get('list')
    listView(
        @Param('projectId') projectId: string,
        @Request() req
    ) {
        // Accept query params for sorting, filtering, pagination
        return this.tasksService.listView(
            projectId,
            req.user.organizationId,
            req.user.accessibleOrganizationIds,
            req.query // pass all query params
        );
    }
}
