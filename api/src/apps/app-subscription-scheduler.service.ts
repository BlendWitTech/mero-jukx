import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, Between } from 'typeorm';
import {
  OrganizationApp,
  OrganizationAppStatus,
} from '../database/entities/organization_apps.entity';
import { Organization } from '../database/entities/organizations.entity';
import { App } from '../database/entities/apps.entity';
import {
  NotificationHelperService,
  NotificationType,
} from '../notifications/notification-helper.service';
import { EmailService } from '../common/services/email.service';
import { EmailTemplatesService } from '../common/services/email-templates.service';
import { User } from '../database/entities/users.entity';
import {
  OrganizationMember,
  OrganizationMemberStatus,
} from '../database/entities/organization_members.entity';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { OrganizationAppsService } from './organization-apps.service';
import { PaymentsService } from '../payments/payments.service';
import { PaymentGateway } from '../database/entities/payments.entity';
import { InvoicesService } from '../invoices/invoices.service';

@Injectable()
export class AppSubscriptionSchedulerService {
  private readonly logger = new Logger(AppSubscriptionSchedulerService.name);

  constructor(
    @InjectRepository(OrganizationApp)
    private orgAppRepository: Repository<OrganizationApp>,
    @InjectRepository(Organization)
    private organizationRepository: Repository<Organization>,
    @InjectRepository(App)
    private appRepository: Repository<App>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(OrganizationMember)
    private memberRepository: Repository<OrganizationMember>,
    private notificationHelper: NotificationHelperService,
    private emailService: EmailService,
    private emailTemplatesService: EmailTemplatesService,
    private auditLogsService: AuditLogsService,
    private organizationAppsService: OrganizationAppsService,
    private paymentsService: PaymentsService,
    private invoicesService: InvoicesService,
  ) {}

  /**
   * Check for expired trials and mark them as EXPIRED (runs every hour)
   */
  @Cron(CronExpression.EVERY_HOUR)
  async expireTrials() {
    this.logger.log('Checking for expired app trials...');

    const now = new Date();

    const expiredTrials = await this.orgAppRepository.find({
      where: {
        status: OrganizationAppStatus.TRIAL,
        trial_ends_at: LessThanOrEqual(now),
      },
      relations: ['app', 'organization'],
    });

    for (const subscription of expiredTrials) {
      try {
        await this.orgAppRepository.update(
          { id: subscription.id },
          { status: OrganizationAppStatus.EXPIRED },
        );

        await this.notificationHelper.notifyAppSubscriptionExpired(
          subscription.organization_id,
          subscription.app?.name || 'App',
        );

        this.logger.log(
          `Trial expired for app ${subscription.app?.name} in org ${subscription.organization_id}`,
        );
      } catch (error) {
        this.logger.error(`Error expiring trial subscription ${subscription.id}:`, error);
      }
    }

    this.logger.log(`Expired ${expiredTrials.length} trial subscriptions`);
  }

  /**
   * Check for app subscriptions expiring in 7 days (runs daily at 9 AM)
   */
  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async checkSubscriptionsExpiringIn7Days() {
    this.logger.log('Checking for app subscriptions expiring in 7 days...');

    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    sevenDaysFromNow.setHours(0, 0, 0, 0);

    const sevenDaysPlusOne = new Date(sevenDaysFromNow);
    sevenDaysPlusOne.setDate(sevenDaysPlusOne.getDate() + 1);

    const subscriptions = await this.orgAppRepository.find({
      where: {
        subscription_end: Between(sevenDaysFromNow, sevenDaysPlusOne),
        status: OrganizationAppStatus.ACTIVE,
      },
      relations: ['app', 'organization'],
    });

    for (const subscription of subscriptions) {
      try {
        // Send notification
        await this.notificationHelper.notifyAppSubscriptionExpiringSoon(
          subscription.organization_id,
          subscription.app.name,
          7,
        );

        // Send email
        await this.sendSubscriptionExpiringEmails(subscription, 7);

        this.logger.log(
          `Sent 7-day expiration warning for app ${subscription.app.name} to organization ${subscription.organization_id}`,
        );
      } catch (error) {
        this.logger.error(
          `Error sending 7-day expiration warning for subscription ${subscription.id}:`,
          error,
        );
      }
    }

    this.logger.log(`Checked ${subscriptions.length} subscriptions expiring in 7 days`);
  }

  /**
   * Check for app subscriptions expiring in 3 days (runs daily at 9 AM)
   */
  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async checkSubscriptionsExpiringIn3Days() {
    this.logger.log('Checking for app subscriptions expiring in 3 days or less...');

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
    threeDaysFromNow.setHours(23, 59, 59, 999);

    const subscriptions = await this.orgAppRepository.find({
      where: {
        subscription_end: Between(now, threeDaysFromNow),
        status: OrganizationAppStatus.ACTIVE,
      },
      relations: ['app', 'organization'],
    });

    for (const subscription of subscriptions) {
      try {
        const daysRemaining = Math.ceil(
          (subscription.subscription_end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
        );

        // Send notification
        await this.notificationHelper.notifyAppSubscriptionExpiringSoon(
          subscription.organization_id,
          subscription.app.name,
          daysRemaining,
        );

        // Send email
        await this.sendSubscriptionExpiringEmails(subscription, daysRemaining);

        this.logger.log(
          `Sent ${daysRemaining}-day expiration warning for app ${subscription.app.name} to organization ${subscription.organization_id}`,
        );
      } catch (error) {
        this.logger.error(
          `Error sending expiration warning for subscription ${subscription.id}:`,
          error,
        );
      }
    }

    this.logger.log(`Checked ${subscriptions.length} subscriptions expiring in 3 days or less`);
  }

  /**
   * Check for expired subscriptions and mark them as expired (runs daily at midnight)
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async checkExpiredSubscriptions() {
    this.logger.log('Checking for expired app subscriptions...');

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const subscriptions = await this.orgAppRepository.find({
      where: {
        subscription_end: LessThanOrEqual(now),
        status: OrganizationAppStatus.ACTIVE,
      },
      relations: ['app', 'organization'],
    });

    for (const subscription of subscriptions) {
      try {
        // Mark as expired
        await this.orgAppRepository.update(
          { id: subscription.id },
          {
            status: OrganizationAppStatus.EXPIRED,
          },
        );

        // Send notification
        await this.notificationHelper.notifyAppSubscriptionExpired(
          subscription.organization_id,
          subscription.app.name,
        );

        // Send email
        await this.sendSubscriptionExpiredEmails(subscription);

        // Create audit log
        await this.auditLogsService.createAuditLog(
          subscription.organization_id,
          null, // System action
          'app.subscription.expired',
          'organization_app',
          subscription.id.toString(),
          {
            status: OrganizationAppStatus.ACTIVE,
            subscription_end: subscription.subscription_end,
          },
          {
            status: OrganizationAppStatus.EXPIRED,
            subscription_end: subscription.subscription_end,
            reason: 'Subscription expired automatically',
          },
        );

        this.logger.log(
          `Marked subscription ${subscription.id} for app ${subscription.app.name} as expired`,
        );
      } catch (error) {
        this.logger.error(`Error expiring subscription ${subscription.id}:`, error);
      }
    }

    this.logger.log(`Checked ${subscriptions.length} expired subscriptions`);
  }

  /**
   * Check for subscriptions due for renewal (runs daily at midnight)
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async checkSubscriptionsDueForRenewal() {
    this.logger.log('Checking for app subscriptions due for renewal...');

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const subscriptions = await this.orgAppRepository.find({
      where: {
        next_billing_date: Between(now, tomorrow),
        status: OrganizationAppStatus.ACTIVE,
        auto_renew: true,
      },
      relations: ['app', 'organization', 'payment'],
    });

    for (const subscription of subscriptions) {
      try {
        this.logger.log(
          `Subscription ${subscription.id} for app ${subscription.app.name} is due for renewal`,
        );

        // Create invoice for renewal
        const currency = subscription.payment?.currency || 'USD';
        const invoice = await this.invoicesService.createInvoiceForApp(
          subscription.organization_id,
          subscription.app_id,
          parseFloat(subscription.subscription_price.toString()),
          currency,
          {
            subscription_id: subscription.id,
            billing_period: subscription.billing_period,
            renewal: true,
          },
        );

        this.logger.log(
          `Created invoice ${invoice.id} for subscription ${subscription.id} renewal`,
        );

        // Send notification that renewal is due
        await this.notificationHelper.notifyAppSubscriptionRenewalDue(
          subscription.organization_id,
          subscription.app.name,
        );

        await this.sendSubscriptionRenewalDueEmails(subscription, invoice.id);
      } catch (error) {
        this.logger.error(`Error processing renewal for subscription ${subscription.id}:`, error);
      }
    }

    this.logger.log(`Checked ${subscriptions.length} subscriptions due for renewal`);
  }

  /**
   * Send expiration warning emails
   */
  private async sendSubscriptionExpiringEmails(
    subscription: OrganizationApp,
    daysRemaining: number,
  ): Promise<void> {
    try {
      const organization = await this.organizationRepository.findOne({
        where: { id: subscription.organization_id },
      });

      if (!organization) {
        return;
      }

      // Get organization owner and admins
      const members = await this.memberRepository.find({
        where: {
          organization_id: organization.id,
          status: OrganizationMemberStatus.ACTIVE,
        },
        relations: ['role', 'user'],
      });

      const adminsAndOwners = members.filter(
        (m) => m.role.is_organization_owner || m.role.slug === 'admin',
      );

      const emailRecipients = new Set<string>();

      // Add organization email
      if (organization.email) {
        emailRecipients.add(organization.email);
      }

      // Add admin/owner emails
      for (const member of adminsAndOwners) {
        if (member.user?.email) {
          emailRecipients.add(member.user.email);
        }
      }

      // Send emails
      for (const email of emailRecipients) {
        const user = await this.userRepository.findOne({ where: { email } });
        const userName = user
          ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email
          : organization.name;

        // Check if should send email (for users, respect preferences)
        if (user) {
          const shouldSend = await this.notificationHelper.shouldSendEmail(
            user.id,
            organization.id,
            NotificationType.APP_SUBSCRIPTION_EXPIRING_SOON,
          );
          if (!shouldSend) {
            continue;
          }
        }

        const emailHtml = this.emailTemplatesService.getAppSubscriptionExpiringEmail(
          userName,
          organization.name,
          subscription.app.name,
          daysRemaining,
        );

        await this.emailService.sendEmail(
          email,
          `Action Required: Your ${subscription.app.name} Subscription Expires in ${daysRemaining} Day${daysRemaining !== 1 ? 's' : ''}`,
          emailHtml,
        );
      }
    } catch (error) {
      this.logger.error(
        `Error sending expiration emails for subscription ${subscription.id}:`,
        error,
      );
    }
  }

  /**
   * Send subscription expired emails
   */
  private async sendSubscriptionExpiredEmails(subscription: OrganizationApp): Promise<void> {
    try {
      const organization = await this.organizationRepository.findOne({
        where: { id: subscription.organization_id },
      });

      if (!organization) {
        return;
      }

      // Get organization owner and admins
      const members = await this.memberRepository.find({
        where: {
          organization_id: organization.id,
          status: OrganizationMemberStatus.ACTIVE,
        },
        relations: ['role', 'user'],
      });

      const adminsAndOwners = members.filter(
        (m) => m.role.is_organization_owner || m.role.slug === 'admin',
      );

      const emailRecipients = new Set<string>();

      // Add organization email
      if (organization.email) {
        emailRecipients.add(organization.email);
      }

      // Add admin/owner emails
      for (const member of adminsAndOwners) {
        if (member.user?.email) {
          emailRecipients.add(member.user.email);
        }
      }

      // Send emails
      for (const email of emailRecipients) {
        const user = await this.userRepository.findOne({ where: { email } });
        const userName = user
          ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email
          : organization.name;

        // Check if should send email (for users, respect preferences)
        if (user) {
          const shouldSend = await this.notificationHelper.shouldSendEmail(
            user.id,
            organization.id,
            NotificationType.APP_SUBSCRIPTION_EXPIRED,
          );
          if (!shouldSend) {
            continue;
          }
        }

        const emailHtml = this.emailTemplatesService.getAppSubscriptionExpiredEmail(
          userName,
          organization.name,
          subscription.app.name,
        );

        await this.emailService.sendEmail(
          email,
          `Your ${subscription.app.name} Subscription Has Expired`,
          emailHtml,
        );
      }
    } catch (error) {
      this.logger.error(`Error sending expired emails for subscription ${subscription.id}:`, error);
    }
  }

  /**
   * Send renewal due emails
   */
  private async sendSubscriptionRenewalDueEmails(
    subscription: OrganizationApp,
    invoiceId?: string,
  ): Promise<void> {
    try {
      const organization = await this.organizationRepository.findOne({
        where: { id: subscription.organization_id },
      });

      if (!organization) {
        return;
      }

      // Get organization owner and admins
      const members = await this.memberRepository.find({
        where: {
          organization_id: organization.id,
          status: OrganizationMemberStatus.ACTIVE,
        },
        relations: ['role', 'user'],
      });

      const adminsAndOwners = members.filter(
        (m) => m.role.is_organization_owner || m.role.slug === 'admin',
      );

      const emailRecipients = new Set<string>();

      // Add organization email
      if (organization.email) {
        emailRecipients.add(organization.email);
      }

      // Add admin/owner emails
      for (const member of adminsAndOwners) {
        if (member.user?.email) {
          emailRecipients.add(member.user.email);
        }
      }

      // Send emails
      for (const email of emailRecipients) {
        const user = await this.userRepository.findOne({ where: { email } });
        const userName = user
          ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email
          : organization.name;

        // Check if should send email (for users, respect preferences)
        if (user) {
          const shouldSend = await this.notificationHelper.shouldSendEmail(
            user.id,
            organization.id,
            NotificationType.APP_SUBSCRIPTION_RENEWAL_DUE,
          );
          if (!shouldSend) {
            continue;
          }
        }

        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
        const invoiceUrl = invoiceId
          ? `${frontendUrl}/org/${organization.slug}/billing/invoices/${invoiceId}`
          : `${frontendUrl}/org/${organization.slug}/billing`;

        const emailHtml = invoiceId
          ? `
            <h2>Subscription Renewal Invoice</h2>
            <p>Hello ${userName},</p>
            <p>Your subscription for <strong>${subscription.app.name}</strong> in organization <strong>${organization.name}</strong> is due for renewal.</p>
            <p><strong>Amount:</strong> ${subscription.payment?.currency || 'USD'} ${subscription.subscription_price}</p>
            <p>An invoice has been created and payment is due within 15 days.</p>
            <p><a href="${invoiceUrl}">View and Pay Invoice</a></p>
            <p>If you wish to disable auto-renewal, you can do so from your subscription settings.</p>
            <p>Thank you,<br>Mero Jugx Team</p>
          `
          : this.emailTemplatesService.getAppSubscriptionRenewalDueEmail(
              userName,
              organization.name,
              subscription.app.name,
              subscription.subscription_price,
            );

        await this.emailService.sendEmail(
          email,
          `Renewal Due: ${subscription.app.name} Subscription`,
          emailHtml,
        );
      }
    } catch (error) {
      this.logger.error(`Error sending renewal due emails for subscription ${subscription.id}:`, error);
    }
  }
}

