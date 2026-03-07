import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_FILTER } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseConfig } from './config/database.config';
import { AuthModule } from './auth/auth.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { UsersModule } from './users/users.module';
import { InvitationsModule } from './invitations/invitations.module';
import { RolesModule } from './roles/roles.module';
import { PackagesModule } from './packages/packages.module';
import { MfaModule } from './mfa/mfa.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AuditLogsModule } from './audit-logs/audit-logs.module';
import { PaymentsModule } from './payments/payments.module';
import { CommonModule } from './common/common.module';
import { ChatModule } from './chat/chat.module';
import { HealthModule } from './health/health.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { SearchModule } from './search/search.module';
import { DataManagementModule } from './data-management/data-management.module';
import { BillingModule } from './billing/billing.module';
import { IntegrationsModule } from './integrations/integrations.module';
import { PermissionsModule } from './permissions/permissions.module';
import { CommunicationModule } from './communication/communication.module';
import { MonitoringModule } from './monitoring/monitoring.module';
import { AppsModule } from './apps/apps.module';
import { TicketsModule } from './tickets/tickets.module';
import { MarketplaceModule } from './marketplace/marketplace.module';
import { InvoicesModule } from './invoices/invoices.module';
import { AdminChatModule } from './admin-chat/admin-chat.module';
import { Invoice } from './database/entities/invoices.entity';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { SentryService } from './common/services/sentry.service';
import { MeroBoardModule } from '../marketplace/shared/mero-board/mero-board.module';
import { MeroCrmModule } from '../marketplace/organization/mero-crm/src/mero-crm.module';
import { MeroSocialModule } from '../marketplace/shared/mero-social/mero-social.module';
import { MeroInventoryModule } from '../marketplace/organization/mero-inventory/mero-inventory.module';
import { MeroAccountingModule } from '../marketplace/organization/mero-accounting/mero-accounting.module';
import { MeroKhataModule } from '../marketplace/organization/mero-khata/mero-khata.module';
import { MeroHrModule } from '../marketplace/organization/mero-hr/mero-hr.module';
import { MeroCmsModule } from '../marketplace/organization/mero-cms/mero-cms.module';
import { CreatorPortalModule } from '../marketplace/creator/portal/creator-portal.module';
import { AnnouncementsModule } from './announcements/announcements.module';
import { BoardsModule } from './boards/boards.module';
import { WorkspacesModule } from './workspaces/workspaces.module';
import { ProjectsModule } from './projects/projects.module';
import { TasksModule } from './tasks/tasks.module';
import { WorkflowsModule } from './workflows/workflows.module';

@Module({
  imports: [
    // Configuration module
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../.env'],
    }),

    // Database module
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useClass: DatabaseConfig,
      inject: [ConfigService],
    }),

    // Rate limiting
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 minute
        limit: 10, // 10 requests per minute
      },
    ]),

    // Scheduled tasks
    ScheduleModule.forRoot(),

    // Common module (guards, decorators, etc.)
    CommonModule,
    // Feature modules
    AuthModule,
    OrganizationsModule,
    UsersModule,
    InvitationsModule,
    RolesModule,
    PackagesModule,
    MfaModule,
    NotificationsModule,
    AuditLogsModule,
    PaymentsModule,
    ChatModule,
    HealthModule,
    AnalyticsModule,
    SearchModule,
    DataManagementModule,
    BillingModule,
    IntegrationsModule,
    PermissionsModule,
    CommunicationModule,
    MonitoringModule,
    AppsModule,
    TicketsModule,
    MarketplaceModule,
    InvoicesModule,
    AdminChatModule,
    MeroBoardModule,
    MeroCrmModule,
    MeroSocialModule,
    MeroInventoryModule,
    MeroAccountingModule,
    MeroKhataModule,
    MeroHrModule,
    MeroCmsModule,
    CreatorPortalModule,
    AnnouncementsModule,
    BoardsModule,
    WorkspacesModule,
    ProjectsModule,
    TasksModule,
    WorkflowsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_FILTER,
      useFactory: (sentryService: SentryService) => {
        return new AllExceptionsFilter(sentryService);
      },
      inject: [SentryService],
    },
  ],
})
export class AppModule { }
