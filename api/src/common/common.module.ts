import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PermissionsGuard } from './guards/permissions.guard';
import { EmailService } from './services/email.service';
import { EmailTemplatesService } from './services/email-templates.service';
import { RedisService } from './services/redis.service';
import { SentryService } from './services/sentry.service';
import { AppLoggerService } from './services/logger.service';
import { CacheService } from './services/cache.service';
import { CsrfGuard } from './guards/csrf.guard';
import { SystemAdminGuard } from './guards/system-admin.guard';
import {
  Organization,
  OrganizationMember,
  Role,
  User,
  App,
  UserAppAccess,
} from '../database/entities';
import { AppAccessGuard } from './guards/app-access.guard';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { HierarchicalIsolationService } from './services/hierarchical-isolation.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Organization, OrganizationMember, Role, User, App, UserAppAccess]),
    forwardRef(() => AuditLogsModule),
  ],
  providers: [
    PermissionsGuard,
    SystemAdminGuard,
    EmailService,
    EmailTemplatesService,
    RedisService,
    SentryService,
    AppLoggerService,
    CacheService,
    CsrfGuard,
    AppAccessGuard,
    HierarchicalIsolationService,
  ],
  exports: [
    TypeOrmModule,
    PermissionsGuard,
    SystemAdminGuard,
    EmailService,
    EmailTemplatesService,
    RedisService,
    SentryService,
    AppLoggerService,
    CacheService,
    CsrfGuard,
    AppAccessGuard,
    HierarchicalIsolationService,
    forwardRef(() => AuditLogsModule),
  ],
})
export class CommonModule { }
