import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsModule } from '../../../src/notifications/notifications.module';
import { CommonModule } from '../../../src/common/common.module';
import { Workspace } from './entities/workspace.entity';
import { WorkspaceMember } from './entities/workspace-member.entity';
import { TaskComment } from './entities/task-comment.entity';
import { TaskAttachment } from './entities/task-attachment.entity';
import { TaskActivity } from './entities/task-activity.entity';
import { ProjectTemplate } from './entities/project-template.entity';
import { ProjectTemplateTask } from './entities/project-template-task.entity';
import { WorkspaceTemplate } from './entities/workspace-template.entity';
import { WorkspaceTemplateProject } from './entities/workspace-template-project.entity';
import { TaskDependency } from './entities/task-dependency.entity';
import { TaskTimeLog } from './entities/task-time-log.entity';
import { TaskChecklistItem } from './entities/task-checklist-item.entity';
import { User } from '../../../src/database/entities/users.entity';
import { Board } from '../../../src/database/entities/boards.entity';
import { BoardColumn } from '../../../src/database/entities/board_columns.entity';
import { Project } from '../../../src/database/entities/projects.entity';
import { Task } from '../../../src/database/entities/tasks.entity';
import { Epic } from '../../../src/database/entities/epics.entity';
import { TaskWatcher } from '../../../src/database/entities/task_watchers.entity';
import { BoardGateway } from './gateways/board.gateway';
import { WorkspaceService } from './services/workspace.service';
import { ProjectService } from './services/project.service';
import { TaskService } from './services/task.service';
import { ProjectTemplateService } from './services/project-template.service';
import { WorkspaceTemplateService } from './services/workspace-template.service';
import { ReportService } from './services/report.service';
import { EpicService } from './services/epic.service';
import { WorkspaceController } from './controllers/workspace.controller';
import { ProjectController } from './controllers/project.controller';
import { TaskController } from './controllers/task.controller';
import { ProjectTemplateController } from './controllers/project-template.controller';
import { WorkspaceTemplateController } from './controllers/workspace-template.controller';
import { ReportController } from './controllers/report.controller';
import { EpicController } from './controllers/epic.controller';

@Module({
  imports: [
    NotificationsModule,
    CommonModule,
    TypeOrmModule.forFeature([
      Workspace,
      WorkspaceMember,
      TaskComment,
      TaskAttachment,
      TaskActivity,
      ProjectTemplate,
      ProjectTemplateTask,
      WorkspaceTemplate,
      WorkspaceTemplateProject,
      TaskDependency,
      TaskTimeLog,
      User,
      Project,
      Task,
      Epic,
      Board,
      BoardColumn,
      TaskChecklistItem,
      TaskWatcher,
    ]),
  ],
  controllers: [
    WorkspaceController,
    ProjectController,
    TaskController,
    ProjectTemplateController,
    WorkspaceTemplateController,
    ReportController,
    EpicController,
  ],
  providers: [
    WorkspaceService,
    ProjectService,
    TaskService,
    ProjectTemplateService,
    WorkspaceTemplateService,
    ReportService,
    EpicService,
    BoardGateway,
  ],
  exports: [
    WorkspaceService,
    ProjectService,
    TaskService,
    ProjectTemplateService,
    WorkspaceTemplateService,
    ReportService,
    EpicService,
    BoardGateway,
  ],
})
export class MeroBoardModule { }

