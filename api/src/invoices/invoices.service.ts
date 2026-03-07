import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Invoice, InvoiceStatus } from '../database/entities/invoices.entity';
import { Organization } from '../database/entities/organizations.entity';
import { OrganizationMember, OrganizationMemberStatus } from '../database/entities/organization_members.entity';
import { OrganizationApp, OrganizationAppStatus } from '../database/entities/organization_apps.entity';
import { Payment, PaymentGateway, PaymentType, PaymentStatus } from '../database/entities/payments.entity';
import { App } from '../database/entities/apps.entity';
import { PaymentsService } from '../payments/payments.service';
import { EmailService } from '../common/services/email.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

@Injectable()
export class InvoicesService {
  constructor(
    @InjectRepository(Invoice)
    private invoiceRepository: Repository<Invoice>,
    @InjectRepository(Organization)
    private organizationRepository: Repository<Organization>,
    @InjectRepository(OrganizationMember)
    private memberRepository: Repository<OrganizationMember>,
    @InjectRepository(OrganizationApp)
    private orgAppRepository: Repository<OrganizationApp>,
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
    @InjectRepository(App)
    private appRepository: Repository<App>,
    @Inject(forwardRef(() => PaymentsService))
    private paymentsService: PaymentsService,
    private emailService: EmailService,
    private auditLogsService: AuditLogsService,
  ) { }

  /**
   * Create invoice for app subscription renewal
   */
  async createInvoiceForApp(
    orgId: string,
    appId: number,
    amount: number,
    currency: string,
    metadata?: Record<string, any>,
  ): Promise<Invoice> {
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 15); // 15 days from now

    const invoice = this.invoiceRepository.create({
      organization_id: orgId,
      app_id: appId,
      amount,
      currency,
      status: InvoiceStatus.UNPAID,
      due_date: dueDate,
      metadata: metadata || {},
    });

    const saved = await this.invoiceRepository.save(invoice);

    // Send email notification
    await this.sendInvoiceCreatedEmail(orgId, saved);

    return saved;
  }

  /**
   * Get invoices for organization
   */
  async getInvoices(
    orgId: string,
    userId: string,
    status?: InvoiceStatus,
    page: number = 1,
    limit: number = 20,
  ) {
    // Verify permission
    const membership = await this.memberRepository.findOne({
      where: {
        organization_id: orgId,
        user_id: userId,
        status: OrganizationMemberStatus.ACTIVE,
      },
      relations: ['role'],
    });

    if (!membership) {
      throw new ForbiddenException('You are not a member of this organization');
    }

    const hasPermission =
      membership.role.is_organization_owner ||
      membership.role.role_permissions?.some((rp) => rp.permission.slug === 'packages.view');

    if (!hasPermission) {
      throw new ForbiddenException('You do not have permission to view invoices');
    }

    const where: any = { organization_id: orgId };
    if (status) {
      where.status = status;
    }

    const [invoices, total] = await this.invoiceRepository.findAndCount({
      where,
      relations: ['app', 'payment'],
      order: { created_at: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    // Update overdue status
    const now = new Date();
    for (const invoice of invoices) {
      if (
        invoice.status === InvoiceStatus.UNPAID &&
        invoice.due_date < now
      ) {
        invoice.status = InvoiceStatus.OVERDUE;
        await this.invoiceRepository.save(invoice);
      }
    }

    return {
      invoices,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get single invoice
   */
  async getInvoice(orgId: string, userId: string, invoiceId: string): Promise<Invoice> {
    // Verify permission
    const membership = await this.memberRepository.findOne({
      where: {
        organization_id: orgId,
        user_id: userId,
        status: OrganizationMemberStatus.ACTIVE,
      },
    });

    if (!membership) {
      throw new ForbiddenException('You are not a member of this organization');
    }

    const invoice = await this.invoiceRepository.findOne({
      where: { id: invoiceId, organization_id: orgId },
      relations: ['app', 'payment', 'organization'],
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    // Update overdue status
    const now = new Date();
    if (invoice.status === InvoiceStatus.UNPAID && invoice.due_date < now) {
      invoice.status = InvoiceStatus.OVERDUE;
      await this.invoiceRepository.save(invoice);
    }

    return invoice;
  }

  /**
   * Pay single invoice
   */
  async payInvoice(
    orgId: string,
    userId: string,
    invoiceId: string,
    paymentMethod: 'stripe' | 'esewa',
    origin?: string,
  ): Promise<{ payment: Payment; payment_url?: string }> {
    const invoice = await this.getInvoice(orgId, userId, invoiceId);

    if (invoice.status === InvoiceStatus.PAID) {
      throw new BadRequestException('Invoice is already paid');
    }

    // Create payment
    const paymentResult = await this.paymentsService.createPayment(userId, orgId, {
      amount: parseFloat(invoice.amount.toString()),
      gateway: paymentMethod === 'stripe' ? PaymentGateway.STRIPE : PaymentGateway.ESEWA,
      payment_type: PaymentType.SUBSCRIPTION,
      description: `Invoice payment: ${invoice.app?.name || 'App subscription'}`,
      metadata: {
        invoice_id: invoice.id,
        app_id: invoice.app_id,
        app_name: invoice.app?.name,
      },
    }, origin);

    const payment = await this.paymentRepository.findOne({
      where: { id: paymentResult.payment.id },
    });

    if (payment) {
      invoice.payment_id = payment.id;
      invoice.status = InvoiceStatus.PAID;
      invoice.paid_at = new Date();
      await this.invoiceRepository.save(invoice);

      // If this invoice was for an app renewal, update subscription
      if (invoice.app_id) {
        const orgApp = await this.orgAppRepository.findOne({
          where: {
            organization_id: orgId,
            app_id: invoice.app_id,
          },
        });

        if (orgApp && payment.status === PaymentStatus.COMPLETED) {
          // Extend subscription
          const now = new Date();
          if (orgApp.billing_period === 'monthly') {
            orgApp.subscription_end = new Date(now);
            orgApp.subscription_end.setMonth(orgApp.subscription_end.getMonth() + 1);
          } else {
            orgApp.subscription_end = new Date(now);
            orgApp.subscription_end.setFullYear(orgApp.subscription_end.getFullYear() + 1);
          }
          orgApp.next_billing_date = orgApp.subscription_end;
          orgApp.status = OrganizationAppStatus.ACTIVE;
          await this.orgAppRepository.save(orgApp);
        }
      }
    }

    await this.auditLogsService.createAuditLog(
      orgId,
      userId,
      'invoice.paid',
      'invoice',
      invoice.id,
      { status: invoice.status },
      { status: InvoiceStatus.PAID },
    );

    return {
      payment: payment!,
      payment_url: paymentResult.payment_form?.formUrl,
    };
  }

  /**
   * Pay all unpaid invoices
   */
  async payAllInvoices(
    orgId: string,
    userId: string,
    paymentMethod: 'stripe' | 'esewa',
    origin?: string,
  ): Promise<{ payments: Payment[]; payment_urls: string[] }> {
    const { invoices } = await this.getInvoices(orgId, userId, InvoiceStatus.UNPAID, 1, 100);

    if (invoices.length === 0) {
      throw new BadRequestException('No unpaid invoices found');
    }

    // Group by currency
    const byCurrency: Record<string, Invoice[]> = {};
    for (const invoice of invoices) {
      if (!byCurrency[invoice.currency]) {
        byCurrency[invoice.currency] = [];
      }
      byCurrency[invoice.currency].push(invoice);
    }

    const payments: Payment[] = [];
    const paymentUrls: string[] = [];

    // Process each currency group
    for (const [currency, currencyInvoices] of Object.entries(byCurrency)) {
      const totalAmount = currencyInvoices.reduce(
        (sum, inv) => sum + parseFloat(inv.amount.toString()),
        0,
      );

      // Create single payment for all invoices in this currency
      const paymentResult = await this.paymentsService.createPayment(userId, orgId, {
        amount: totalAmount,
        gateway: paymentMethod === 'stripe' ? PaymentGateway.STRIPE : PaymentGateway.ESEWA,
        payment_type: PaymentType.SUBSCRIPTION,
        description: `Payment for ${currencyInvoices.length} invoice(s)`,
        metadata: {
          invoice_ids: currencyInvoices.map((inv) => inv.id),
          currency,
        },
      }, origin);

      const payment = await this.paymentRepository.findOne({
        where: { id: paymentResult.payment.id },
      });

      if (payment) {
        payments.push(payment);
        if (paymentResult.payment_form?.formUrl) {
          paymentUrls.push(paymentResult.payment_form.formUrl);
        }

        // Mark all invoices as paid when payment completes
        // Note: In production, you'd want to handle this via webhook when payment actually completes
        if (payment.status === PaymentStatus.COMPLETED) {
          for (const invoice of currencyInvoices) {
            invoice.payment_id = payment.id;
            invoice.status = InvoiceStatus.PAID;
            invoice.paid_at = new Date();
            await this.invoiceRepository.save(invoice);

            // Update app subscriptions if applicable
            if (invoice.app_id) {
              const orgApp = await this.orgAppRepository.findOne({
                where: {
                  organization_id: orgId,
                  app_id: invoice.app_id,
                },
              });

              if (orgApp) {
                const now = new Date();
                if (orgApp.billing_period === 'monthly') {
                  orgApp.subscription_end = new Date(now);
                  orgApp.subscription_end.setMonth(orgApp.subscription_end.getMonth() + 1);
                } else {
                  orgApp.subscription_end = new Date(now);
                  orgApp.subscription_end.setFullYear(orgApp.subscription_end.getFullYear() + 1);
                }
                orgApp.next_billing_date = orgApp.subscription_end;
                orgApp.status = OrganizationAppStatus.ACTIVE;
                await this.orgAppRepository.save(orgApp);
              }
            }
          }
        }
      }
    }

    await this.auditLogsService.createAuditLog(
      orgId,
      userId,
      'invoice.paid_all',
      'invoice',
      null,
      null,
      { count: invoices.length },
    );

    return { payments, payment_urls: paymentUrls };
  }

  /**
   * Send invoice created email
   */
  private async sendInvoiceCreatedEmail(orgId: string, invoice: Invoice): Promise<void> {
    try {
      const organization = await this.organizationRepository.findOne({
        where: { id: orgId },
        relations: ['members', 'members.user', 'members.role'],
      });

      if (!organization) return;

      // Get organization owners/admins
      const owners = organization.members.filter(
        (m) => m.role.is_organization_owner && m.status === OrganizationMemberStatus.ACTIVE,
      );

      const app = invoice.app_id
        ? await this.appRepository.findOne({ where: { id: invoice.app_id } })
        : null;

      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
      const invoiceUrl = `${frontendUrl}/org/${organization.slug}/billing/invoices/${invoice.id}`;

      for (const owner of owners) {
        if (owner.user?.email) {
          await this.emailService.sendEmail(
            owner.user.email,
            `New Invoice: ${app?.name || 'App Subscription'}`,
            `
            <h2>New Invoice Created</h2>
            <p>Hello,</p>
            <p>A new invoice has been created for your organization <strong>${organization.name}</strong>.</p>
            <p><strong>Invoice Details:</strong></p>
            <ul>
              <li>Amount: ${invoice.currency} ${invoice.amount}</li>
              <li>Due Date: ${invoice.due_date.toLocaleDateString()}</li>
              ${app ? `<li>App: ${app.name}</li>` : ''}
            </ul>
            <p>Please pay this invoice within 15 days to avoid service interruption.</p>
            <p><a href="${invoiceUrl}">View and Pay Invoice</a></p>
            <p>If you wish to disable auto-renewal, you can do so from your subscription settings.</p>
            <p>Thank you,<br>Mero Jugx Team</p>
          `,
          );
        }
      }
    } catch (error) {
      console.error('Failed to send invoice email:', error);
    }
  }
}

