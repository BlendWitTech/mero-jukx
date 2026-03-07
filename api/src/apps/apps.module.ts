import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppsController, MarketplaceController } from './apps.controller';
import { OrganizationAppsController } from './organization-apps.controller';
import { AppsService } from './apps.service';
import { OrganizationAppsService } from './organization-apps.service';
import { AppSubscriptionSchedulerService } from './app-subscription-scheduler.service';
import { AppAccessService } from './app-access.service';
import { AppInvitationService } from './app-invitation.service';
import { AppInvitationController } from './app-invitation.controller';
import { App } from '../database/entities/apps.entity';
import { AppInvitation } from '../database/entities/app_invitations.entity';
import { OrganizationApp } from '../database/entities/organization_apps.entity';
import { Organization } from '../database/entities/organizations.entity';
import { OrganizationMember } from '../database/entities/organization_members.entity';
import { Payment } from '../database/entities/payments.entity';
import { User } from '../database/entities/users.entity';
import { Invoice } from '../database/entities/invoices.entity';
import { UserAppAccess } from '../database/entities/user_app_access.entity';
import { NotificationPreference } from '../database/entities/notification_preferences.entity';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { PaymentsModule } from '../payments/payments.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { CommonModule } from '../common/common.module';
import { InvoicesModule } from '../invoices/invoices.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      App,
      OrganizationApp,
      Organization,
      OrganizationMember,
      Payment,
      User,
      Invoice,
      UserAppAccess,
      AppInvitation,
      NotificationPreference,
    ]),
    AuditLogsModule,
    forwardRef(() => PaymentsModule),
    NotificationsModule,
    CommonModule,
    forwardRef(() => InvoicesModule),
  ],
  controllers: [AppsController, MarketplaceController, OrganizationAppsController, AppInvitationController],
  providers: [AppsService, OrganizationAppsService, AppSubscriptionSchedulerService, AppAccessService, AppInvitationService],
  exports: [AppsService, OrganizationAppsService, AppAccessService, AppInvitationService],
})
export class AppsModule { }

