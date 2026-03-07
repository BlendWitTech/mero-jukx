import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Task } from '../database/entities/tasks.entity';
import { TaskComment } from '../database/entities/task_comments.entity';
import { TaskAttachment } from '../database/entities/task_attachments.entity';
import { TasksController } from './controllers/tasks.controller';
import { TasksService } from './services/tasks.service';
import { OrganizationMember } from '../database/entities/organization_members.entity';
import { Role } from '../database/entities/roles.entity';
import { PermissionsModule } from '../permissions/permissions.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { TaskWatcher } from '../database/entities/task_watchers.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([Task, TaskComment, TaskAttachment, OrganizationMember, Role, TaskWatcher]),
        PermissionsModule,
        AuditLogsModule
    ],
    controllers: [TasksController],
    providers: [TasksService],
    exports: [TasksService],
})
export class TasksModule { }
