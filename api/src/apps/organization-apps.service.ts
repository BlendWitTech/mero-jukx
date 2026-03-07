import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import { App } from '../database/entities/apps.entity';
import {
  OrganizationApp,
  OrganizationAppStatus,
  OrganizationAppBillingPeriod,
} from '../database/entities/organization_apps.entity';
import { Organization } from '../database/entities/organizations.entity';
import {
  OrganizationMember,
  OrganizationMemberStatus,
} from '../database/entities/organization_members.entity';
import { Payment, PaymentType, PaymentGateway } from '../database/entities/payments.entity';
import { Invoice, InvoiceStatus } from '../database/entities/invoices.entity';
import { PurchaseAppDto } from './dto/purchase-app.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';
import { CancelSubscriptionDto } from './dto/cancel-subscription.dto';
import { SubscriptionQueryDto } from './dto/subscription-query.dto';
import { AppsService } from './apps.service';
import { AppAccessService } from './app-access.service';
import { PaymentsService } from '../payments/payments.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { EmailService } from '../common/services/email.service';
import { ConfigService } from '@nestjs/config';

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

@Injectable()
export class OrganizationAppsService {
  constructor(
    @InjectRepository(OrganizationApp)
    private orgAppRepository: Repository<OrganizationApp>,
    @InjectRepository(App)
    private appRepository: Repository<App>,
    @InjectRepository(Organization)
    private organizationRepository: Repository<Organization>,
    @InjectRepository(OrganizationMember)
    private memberRepository: Repository<OrganizationMember>,
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
    @InjectRepository(Invoice)
    private invoiceRepository: Repository<Invoice>,
    private dataSource: DataSource,
    private appsService: AppsService,
    private appAccessService: AppAccessService,
    @Inject(forwardRef(() => PaymentsService))
    private paymentsService: PaymentsService,
    private auditLogsService: AuditLogsService,
    private emailService: EmailService,
    private configService: ConfigService,
  ) { }

  /**
   * Get organization's app subscriptions
   */
  async getOrganizationApps(
    orgId: string,
    query: SubscriptionQueryDto,
  ): Promise<PaginatedResponse<OrganizationApp>> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = { organization_id: orgId };

    if (query.status) {
      where.status = query.status;
    }

    const [data, total] = await this.orgAppRepository.findAndCount({
      where,
      relations: ['app', 'payment'],
      order: { created_at: 'DESC' },
      skip,
      take: limit,
    });

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

  /**
   * Get specific app subscription
   */
  async getSubscription(orgId: string, appId: number): Promise<OrganizationApp> {
    const subscription = await this.orgAppRepository.findOne({
      where: {
        organization_id: orgId,
        app_id: appId,
      },
      relations: ['app', 'payment'],
    });

    if (!subscription) {
      throw new NotFoundException('App subscription not found');
    }

    return subscription;
  }

  /**
   * Check if organization is subscribed to an app
   */
  async isSubscribed(orgId: string, appId: number): Promise<boolean> {
    const subscription = await this.orgAppRepository.findOne({
      where: {
        organization_id: orgId,
        app_id: appId,
        status: OrganizationAppStatus.ACTIVE,
      },
    });

    return !!subscription;
  }

  /**
   * Check subscription status
   */
  async checkSubscriptionStatus(
    orgId: string,
    appId: number,
  ): Promise<OrganizationAppStatus | null> {
    const subscription = await this.orgAppRepository.findOne({
      where: {
        organization_id: orgId,
        app_id: appId,
      },
    });

    return subscription?.status || null;
  }

  /**
   * Purchase/Subscribe to an app
   */
  async purchaseApp(
    orgId: string,
    userId: string,
    dto: PurchaseAppDto,
    origin?: string,
  ): Promise<{ organization_app: OrganizationApp; payment?: Payment; payment_url?: string; payment_form?: any }> {
    // Verify user is member
    const membership = await this.memberRepository.findOne({
      where: {
        user_id: userId,
        organization_id: orgId,
        status: OrganizationMemberStatus.ACTIVE,
      },
    });

    if (!membership) {
      throw new ForbiddenException('You are not an active member of this organization');
    }

    // Get app
    const app = await this.appRepository.findOne({
      where: { id: dto.app_id },
    });

    if (!app) {
      throw new NotFoundException('App not found');
    }

    if (app.status !== 'active') {
      throw new BadRequestException('App is not available for purchase');
    }

    // Check if already subscribed
    const existingSubscription = await this.orgAppRepository.findOne({
      where: {
        organization_id: orgId,
        app_id: dto.app_id,
      },
    });

    if (existingSubscription) {
      if (existingSubscription.status === OrganizationAppStatus.ACTIVE) {
        throw new ConflictException('Organization is already subscribed and active for this app');
      }
      // If cancelled/expired/pending_payment or TRIAL, we can create/update subscription
      // Note: We allow purchasing even if in TRIAL status (converts trial to paid)
    }

    const now = new Date();
    let subscriptionStart = now;
    let subscriptionEnd: Date;
    let trialEndsAt: Date | null = null;
    let status: OrganizationAppStatus = OrganizationAppStatus.ACTIVE;
    let needsPayment = true;

    // Handle trial period
    if (dto.start_trial && app.trial_days > 0) {
      // Check if trial was already used
      if (existingSubscription?.trial_used) {
        throw new BadRequestException('Trial period has already been used for this app');
      }

      trialEndsAt = new Date(now);
      trialEndsAt.setDate(trialEndsAt.getDate() + app.trial_days);
      status = OrganizationAppStatus.TRIAL;
      needsPayment = false; // Payment will be required after trial
    } else if (Number(app.price) > 0) {
      // If payment is required and NOT a trial, set status to pending
      status = OrganizationAppStatus.PENDING_PAYMENT;
    }

    // Calculate subscription end date
    const billingPeriod =
      dto.billing_period === 'monthly'
        ? OrganizationAppBillingPeriod.MONTHLY
        : OrganizationAppBillingPeriod.YEARLY;

    if (billingPeriod === OrganizationAppBillingPeriod.MONTHLY) {
      subscriptionEnd = new Date(now);
      subscriptionEnd.setMonth(subscriptionEnd.getMonth() + 1);
    } else {
      subscriptionEnd = new Date(now);
      subscriptionEnd.setFullYear(subscriptionEnd.getFullYear() + 1);
    }

    // If trial, set subscription end after trial
    if (trialEndsAt) {
      subscriptionStart = trialEndsAt;
      if (billingPeriod === OrganizationAppBillingPeriod.MONTHLY) {
        subscriptionEnd = new Date(trialEndsAt);
        subscriptionEnd.setMonth(subscriptionEnd.getMonth() + 1);
      } else {
        subscriptionEnd = new Date(trialEndsAt);
        subscriptionEnd.setFullYear(subscriptionEnd.getFullYear() + 1);
      }
    }

    // Create or Update subscription
    let organizationApp: OrganizationApp;

    if (existingSubscription && existingSubscription.status === OrganizationAppStatus.PENDING_PAYMENT) {
      // Reuse existing pending subscription
      organizationApp = existingSubscription;
      organizationApp.status = status;
      organizationApp.subscription_start = subscriptionStart;
      organizationApp.subscription_end = subscriptionEnd;
      organizationApp.next_billing_date = needsPayment ? subscriptionEnd : null;
      organizationApp.trial_ends_at = trialEndsAt;
      organizationApp.trial_used = existingSubscription?.trial_used || !!trialEndsAt;
      organizationApp.auto_renew = dto.auto_renew ?? true;
      organizationApp.subscription_price = app.price;
      organizationApp.billing_period = billingPeriod;
    } else {
      // Create new subscription
      organizationApp = this.orgAppRepository.create({
        organization_id: orgId,
        app_id: dto.app_id,
        status,
        subscription_start: subscriptionStart,
        subscription_end: subscriptionEnd,
        next_billing_date: needsPayment ? subscriptionEnd : null,
        trial_ends_at: trialEndsAt,
        trial_used: existingSubscription?.trial_used || !!trialEndsAt,
        auto_renew: dto.auto_renew ?? true,
        subscription_price: app.price,
        billing_period: billingPeriod,
      });
    }

    let payment: Payment | undefined;
    let paymentUrl: string | undefined;
    let paymentForm: any = undefined;

    // Create payment if needed
    if (needsPayment) {
      // Determine gateway
      const gateway =
        dto.payment_method === 'stripe'
          ? PaymentGateway.STRIPE
          : dto.payment_method === 'ime_pay'
          ? PaymentGateway.IME_PAY
          : PaymentGateway.ESEWA;

      let paymentAmount = Number(app.price);

      // Annual subscription: 20% discount (billed as 12 months × 0.80)
      if (billingPeriod === OrganizationAppBillingPeriod.YEARLY) {
        paymentAmount = paymentAmount * 12 * 0.80;
      }

      // Bundle discount: 15% off when org already has 2+ active/trial apps
      const activeAppsCount = await this.orgAppRepository.count({
        where: {
          organization_id: orgId,
          status: In([OrganizationAppStatus.ACTIVE, OrganizationAppStatus.TRIAL]),
        },
      });
      if (activeAppsCount >= 2) {
        paymentAmount = paymentAmount * 0.85;
      }

      // Convert USD to NPR for local gateways
      if (gateway === PaymentGateway.ESEWA || gateway === PaymentGateway.IME_PAY) {
        const nprToUsdRate = this.configService.get<number>('currency.nprToUsdRate') || 0.0075;
        paymentAmount = paymentAmount / nprToUsdRate;
      }

      const paymentResult = await this.paymentsService.createPayment(userId, orgId, {
        amount: paymentAmount,
        gateway: gateway,
        payment_type: PaymentType.SUBSCRIPTION,
        description: `App subscription: ${app.name}`,
        metadata: {
          app_id: app.id,
          app_name: app.name,
          billing_period: dto.billing_period,
          user_ids: dto.user_ids || [], // Store target users for deferred access granting
        },
      }, origin);

      payment = await this.paymentRepository.findOne({ where: { id: paymentResult.payment.id } });
      paymentUrl = paymentResult.payment_form?.formUrl;
      paymentForm = paymentResult.payment_form;

      if (payment) {
        organizationApp.payment_id = payment.id;

        // Create invoice linked to payment (due in 15 days)
        const dueDate = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);
        const invoice = this.invoiceRepository.create({
          organization_id: orgId,
          app_id: app.id,
          payment_id: payment.id,
          amount: Number(payment.amount),
          currency: payment.currency,
          status: InvoiceStatus.UNPAID,
          due_date: dueDate,
          metadata: {
            app_name: app.name,
            billing_period: dto.billing_period,
            auto_renew: dto.auto_renew ?? true,
          },
        });
        await this.invoiceRepository.save(invoice);
      }
    }

    const savedSubscription = await this.orgAppRepository.save(organizationApp);

    // Skip immediate access granting and notifications if payment is pending
    if (status === OrganizationAppStatus.PENDING_PAYMENT) {
      return {
        organization_app: savedSubscription,
        payment,
        payment_url: paymentUrl,
        payment_form: paymentForm,
      };
    }

    // Increment app subscription count (only for trials or free apps, paid apps incremented on payment verify)
    await this.appsService.incrementSubscriptionCount(app.id);

    // Get purchasing user's membership and role
    const purchasingMember = await this.memberRepository.findOne({
      where: {
        user_id: userId,
        organization_id: orgId,
        status: OrganizationMemberStatus.ACTIVE,
      },
      relations: ['role'],
    });

    if (!purchasingMember) {
      throw new ForbiddenException('Purchasing user is not an active member of this organization');
    }

    const isPurchasingUserOwner = purchasingMember.role?.is_organization_owner;

    // Get organization owner
    const ownerMembers = await this.memberRepository.find({
      where: {
        organization_id: orgId,
        status: OrganizationMemberStatus.ACTIVE,
      },
      relations: ['role', 'user'],
    });

    const ownerMember = ownerMembers.find((m) => m.role?.is_organization_owner);

    // Grant access based on purchasing user's role
    if (isPurchasingUserOwner) {
      // If purchasing user is organization owner, grant them access as owner
      try {
        await this.appAccessService.grantAccess(userId, orgId, {
          user_id: userId,
          app_id: dto.app_id,
        }, origin);
      } catch (error: any) {
        // Ignore if access already exists
        if (error?.status !== 400 || !error?.message?.includes('already has access')) {
          console.error('Failed to grant access to purchasing user (owner):', error);
        }
      }
    } else {
      // If purchasing user is NOT organization owner:
      // 1. Grant them access as admin
      try {
        await this.appAccessService.grantAccess(userId, orgId, {
          user_id: userId,
          app_id: dto.app_id,
        }, origin);
      } catch (error: any) {
        // Ignore if access already exists
        if (error?.status !== 400 || !error?.message?.includes('already has access')) {
          console.error('Failed to grant access to purchasing user (admin):', error);
        }
      }

      // 2. Grant organization owner access as owner (if exists and different from purchasing user)
      if (ownerMember && ownerMember.user_id !== userId) {
        try {
          await this.appAccessService.grantAccess(ownerMember.user_id, orgId, {
            user_id: ownerMember.user_id,
            app_id: dto.app_id,
          }, origin);
        } catch (error: any) {
          // Ignore if access already exists
          if (error?.status !== 400 || !error?.message?.includes('already has access')) {
            // Log other errors but don't fail the purchase
            console.error('Failed to grant access to organization owner:', error);
          }
        }
      }
    }

    // Grant access to selected users (excluding purchasing user and owner if already granted)
    if (dto.user_ids && dto.user_ids.length > 0) {
      for (const targetUserId of dto.user_ids) {
        // Skip if it's the purchasing user (already granted above)
        if (targetUserId === userId) {
          continue;
        }
        // Skip if it's the owner and already granted above
        if (ownerMember && targetUserId === ownerMember.user_id && !isPurchasingUserOwner) {
          continue;
        }

        try {
          await this.appAccessService.grantAccess(userId, orgId, {
            user_id: targetUserId,
            app_id: dto.app_id,
          }, origin);
        } catch (error) {
          // Log but don't fail the purchase if granting access fails
          console.error(`Failed to grant access to user ${targetUserId}:`, error);
        }
      }
    }

    // Audit log
    await this.auditLogsService.createAuditLog(
      orgId,
      userId,
      'app.subscribed',
      'organization_app',
      savedSubscription.id.toString(),
      null, // oldValues
      {
        app_id: app.id,
        app_name: app.name,
        billing_period: dto.billing_period,
        trial: !!trialEndsAt,
        users_granted_access: dto.user_ids?.length || 0,
      }, // newValues
    );

    return {
      organization_app: savedSubscription,
      payment,
      payment_url: paymentUrl,
      payment_form: paymentForm, // Include full payment form for eSewa
    };
  }

  /**
   * Update subscription
   */
  async updateSubscription(
    orgId: string,
    appId: number,
    dto: UpdateSubscriptionDto,
    userId: string,
    origin?: string,
  ): Promise<OrganizationApp> {
    const subscription = await this.getSubscription(orgId, appId);

    if (dto.auto_renew !== undefined) {
      const wasAutoRenew = subscription.auto_renew;
      subscription.auto_renew = dto.auto_renew;

      // Send email notification when auto-renewal is activated
      if (!wasAutoRenew && dto.auto_renew) {
        await this.sendAutoRenewalActivatedEmail(orgId, subscription, origin);
      }
    }

    // Optional immediate renewal with payment (creates invoice)
    if (dto.payment_method) {
      const app = await this.appRepository.findOne({ where: { id: appId } });
      if (!app) {
        throw new NotFoundException('App not found');
      }

      const paymentResult = await this.paymentsService.createPayment(userId, orgId, {
        amount: app.price,
        gateway: dto.payment_method === 'stripe' ? PaymentGateway.STRIPE : PaymentGateway.ESEWA,
        payment_type: PaymentType.SUBSCRIPTION,
        description: `App renewal: ${app.name}`,
        metadata: {
          app_id: app.id,
          app_name: app.name,
          billing_period: subscription.billing_period,
        },
      }, origin);

      const payment = await this.paymentRepository.findOne({ where: { id: paymentResult.payment.id } });
      if (payment) {
        subscription.payment_id = payment.id;
        const dueDate = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);
        const invoice = this.invoiceRepository.create({
          organization_id: orgId,
          app_id: app.id,
          payment_id: payment.id,
          amount: Number(app.price),
          currency: payment.currency,
          status: InvoiceStatus.UNPAID,
          due_date: dueDate,
          metadata: {
            app_name: app.name,
            billing_period: subscription.billing_period,
            renewal: true,
          },
        });
        await this.invoiceRepository.save(invoice);
      }
    }

    // Handle billing period change (upgrade/downgrade)
    if (dto.billing_period) {
      const newBillingPeriod =
        dto.billing_period === 'monthly'
          ? OrganizationAppBillingPeriod.MONTHLY
          : OrganizationAppBillingPeriod.YEARLY;
      if (newBillingPeriod !== subscription.billing_period) {
        // This would require payment processing for the difference
        // For now, we'll just update it (in production, you'd want to handle prorating)
        subscription.billing_period = newBillingPeriod;
      }
    }

    const updated = await this.orgAppRepository.save(subscription);

    // Audit log
    await this.auditLogsService.createAuditLog(
      orgId,
      userId,
      'app.subscription.updated',
      'organization_app',
      subscription.id.toString(),
      null, // oldValues
      dto, // newValues
    );

    return updated;
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(
    orgId: string,
    appId: number,
    dto: CancelSubscriptionDto,
    userId: string,
  ): Promise<OrganizationApp> {
    const subscription = await this.getSubscription(orgId, appId);

    if (subscription.status === OrganizationAppStatus.CANCELLED) {
      throw new BadRequestException('Subscription is already cancelled');
    }

    if (subscription.status === OrganizationAppStatus.EXPIRED) {
      throw new BadRequestException('Subscription has already expired');
    }

    subscription.status = OrganizationAppStatus.CANCELLED;
    subscription.cancelled_at = new Date();
    subscription.cancellation_reason = dto.reason || null;
    subscription.auto_renew = false;

    const cancelled = await this.orgAppRepository.save(subscription);

    // Decrement app subscription count
    await this.appsService.decrementSubscriptionCount(appId);

    // Audit log
    await this.auditLogsService.createAuditLog(
      orgId,
      userId,
      'app.subscription.cancelled',
      'organization_app',
      subscription.id.toString(),
      null, // oldValues
      { reason: dto.reason }, // newValues
    );

    return cancelled;
  }

  /**
   * Send email when auto-renewal is activated
   */
  private async sendAutoRenewalActivatedEmail(
    orgId: string,
    subscription: OrganizationApp,
    origin?: string,
  ): Promise<void> {
    try {
      const organization = await this.organizationRepository.findOne({
        where: { id: orgId },
        relations: ['members', 'members.user', 'members.role'],
      });

      if (!organization) return;

      const app = await this.appRepository.findOne({ where: { id: subscription.app_id } });
      if (!app) return;

      // Get organization owners/admins
      const owners = organization.members.filter(
        (m) => m.role.is_organization_owner && m.status === OrganizationMemberStatus.ACTIVE,
      );

      const frontendUrl = origin || process.env.FRONTEND_URL || 'http://localhost:3001';
      const settingsUrl = `${frontendUrl}/org/${organization.slug}/apps`;

      for (const owner of owners) {
        if (owner.user?.email) {
          await this.emailService.sendEmail(
            owner.user.email,
            `Auto-Renewal Activated: ${app.name}`,
            `
            <h2>Auto-Renewal Activated</h2>
            <p>Hello,</p>
            <p>Auto-renewal has been activated for your <strong>${app.name}</strong> subscription in organization <strong>${organization.name}</strong>.</p>
            <p>Your subscription will automatically renew on <strong>${subscription.next_billing_date?.toLocaleDateString() || 'the next billing date'}</strong>.</p>
            <p>If you wish to disable auto-renewal, you can do so from your subscription settings:</p>
            <p><a href="${settingsUrl}">Manage Subscription</a></p>
            <p>Thank you,<br>Mero Jugx Team</p>
          `,
          );
        }
      }
    } catch (error) {
      console.error('Failed to send auto-renewal activation email:', error);
    }
  }

  /**
   * Renew subscription
   */
  async renewSubscription(
    orgId: string,
    appId: number,
    paymentMethod: 'stripe' | 'esewa',
    userId: string,
    origin?: string,
  ): Promise<{ organization_app: OrganizationApp; payment?: Payment; payment_url?: string }> {
    const subscription = await this.getSubscription(orgId, appId);

    if (subscription.status !== OrganizationAppStatus.ACTIVE) {
      throw new BadRequestException('Only active subscriptions can be renewed');
    }

    const app = await this.appRepository.findOne({
      where: { id: appId },
    });

    if (!app) {
      throw new NotFoundException('App not found');
    }

    // Create payment
    const paymentResult = await this.paymentsService.createPayment(userId, orgId, {
      amount: app.price,
      gateway: paymentMethod === 'stripe' ? PaymentGateway.STRIPE : PaymentGateway.ESEWA,
      payment_type: PaymentType.SUBSCRIPTION,
      description: `App subscription renewal: ${app.name}`,
      metadata: {
        app_id: app.id,
        app_name: app.name,
        billing_period: subscription.billing_period,
        renewal: true,
      },
    }, origin);

    // Update subscription dates
    const now = new Date();
    let newEndDate: Date;

    if (subscription.billing_period === OrganizationAppBillingPeriod.MONTHLY) {
      newEndDate = new Date(subscription.subscription_end);
      newEndDate.setMonth(newEndDate.getMonth() + 1);
    } else {
      newEndDate = new Date(subscription.subscription_end);
      newEndDate.setFullYear(newEndDate.getFullYear() + 1);
    }

    subscription.subscription_end = newEndDate;
    subscription.next_billing_date = newEndDate;
    const fullPayment = await this.paymentRepository.findOne({
      where: { id: paymentResult.payment.id },
    });

    if (fullPayment) {
      subscription.payment_id = fullPayment.id;
    }

    const renewed = await this.orgAppRepository.save(subscription);

    // Audit log
    await this.auditLogsService.createAuditLog(
      orgId,
      userId,
      'app.subscription.renewed',
      'organization_app',
      subscription.id.toString(),
      null, // oldValues
      {
        new_end_date: newEndDate,
        billing_period: subscription.billing_period,
      }, // newValues
    );

    return {
      organization_app: renewed,
      payment: fullPayment,
      payment_url: paymentResult.payment_form?.formUrl,
    };
  }
}

