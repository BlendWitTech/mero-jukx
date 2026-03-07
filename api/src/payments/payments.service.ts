import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Payment,
  PaymentStatus,
  PaymentGateway,
  PaymentType,
} from '../database/entities/payments.entity';
import { Organization } from '../database/entities/organizations.entity';
import { User } from '../database/entities/users.entity';
import {
  OrganizationMember,
  OrganizationMemberStatus,
} from '../database/entities/organization_members.entity';
import { OrganizationPackageFeature } from '../database/entities/organization_package_features.entity';
import { OrganizationApp, OrganizationAppStatus } from '../database/entities/organization_apps.entity';
import { Invoice, InvoiceStatus } from '../database/entities/invoices.entity';
import { Role } from '../database/entities/roles.entity';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { EsewaService } from './esewa.service';
import { StripeService } from './stripe.service';
import { KhaltiService } from './khalti.service';
import { ConnectIpsService } from './connect-ips.service';
import { PaypalService } from './paypal.service';
import { ImePayService } from './ime-pay.service';
import { PackagesService } from '../packages/packages.service';
import {
  NotificationHelperService,
  NotificationType,
} from '../notifications/notification-helper.service';
import { EmailService } from '../common/services/email.service';
import { EmailTemplatesService } from '../common/services/email-templates.service';
import { AppsService } from '../apps/apps.service';
import { AppAccessService } from '../apps/app-access.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
    @InjectRepository(Organization)
    private organizationRepository: Repository<Organization>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(OrganizationMember)
    private memberRepository: Repository<OrganizationMember>,
    @InjectRepository(OrganizationPackageFeature)
    private orgFeatureRepository: Repository<OrganizationPackageFeature>,
    @InjectRepository(OrganizationApp)
    private orgAppRepository: Repository<OrganizationApp>,
    @InjectRepository(Invoice)
    private invoiceRepository: Repository<Invoice>,
    @InjectRepository(Role)
    private roleRepository: Repository<Role>,
    private esewaService: EsewaService,
    private stripeService: StripeService,
    private khaltiService: KhaltiService,
    private connectIpsService: ConnectIpsService,
    private paypalService: PaypalService,
    private imePayService: ImePayService,
    private packagesService: PackagesService,
    private notificationHelper: NotificationHelperService,
    private emailService: EmailService,
    private emailTemplatesService: EmailTemplatesService,
    @Inject(forwardRef(() => AppsService))
    private appsService: AppsService,
    @Inject(forwardRef(() => AppAccessService))
    private appAccessService: AppAccessService,
  ) { }

  /**
   * Create a new payment and generate eSewa payment form
   */
  async createPayment(
    userId: string,
    organizationId: string,
    createPaymentDto: CreatePaymentDto,
    origin?: string,
  ): Promise<any> {
    try {
      this.logger.log(
        `Creating payment: ${JSON.stringify({ userId, organizationId, gateway: createPaymentDto.gateway, amount: createPaymentDto.amount, payment_type: createPaymentDto.payment_type })}`,
      );

      // Verify organization exists
      const organization = await this.organizationRepository.findOne({
        where: { id: organizationId },
      });

      if (!organization) {
        throw new NotFoundException('Organization not found');
      }

      // Check permissions based on payment type BEFORE creating payment
      // This ensures users can't initiate payments they don't have permission for
      const membership = await this.memberRepository.findOne({
        where: {
          user_id: userId,
          organization_id: organizationId,
          status: OrganizationMemberStatus.ACTIVE,
        },
        relations: ['role'],
      });

      if (!membership) {
        throw new ForbiddenException('You are not an active member of this organization');
      }

      // Check permission based on payment type
      let requiredPermission: string;
      if (createPaymentDto.payment_type === PaymentType.PACKAGE_UPGRADE) {
        requiredPermission = 'packages.upgrade';
      } else if (createPaymentDto.payment_type === PaymentType.ONE_TIME) {
        // For feature purchases
        requiredPermission = 'packages.features.purchase';
      } else {
        // For other payment types, skip permission check (or add as needed)
        requiredPermission = null;
      }

      if (requiredPermission) {
        // Organization owners always have permission
        if (!membership.role.is_organization_owner) {
          const roleWithPermissions = await this.roleRepository.findOne({
            where: { id: membership.role_id },
            relations: ['role_permissions', 'role_permissions.permission'],
          });

          const hasPermission = roleWithPermissions?.role_permissions?.some(
            (rp) => rp.permission.slug === requiredPermission,
          );

          if (!hasPermission) {
            throw new ForbiddenException(
              `You do not have permission to ${requiredPermission === 'packages.upgrade' ? 'upgrade packages' : 'purchase features'}. Please contact your organization administrator.`,
            );
          }
        }
      }

      // Check location-based gateway visibility
      const country = (organization.country || '').toUpperCase();
      const isNepal = country === 'NP' || country === 'NEPAL' || organization.currency === 'NPR';
      const nepalGateways = [PaymentGateway.ESEWA, PaymentGateway.KHALTI, PaymentGateway.CONNECT_IPS, PaymentGateway.IME_PAY];
      const globalGateways = [PaymentGateway.STRIPE, PaymentGateway.PAYPAL];

      if (isNepal && !nepalGateways.includes(createPaymentDto.gateway)) {
        throw new BadRequestException(`Gateway ${createPaymentDto.gateway} is not available for organizations in Nepal. Please use eSewa, Khalti, or ConnectIPS.`);
      }

      if (!isNepal && !globalGateways.includes(createPaymentDto.gateway)) {
        throw new BadRequestException(`Gateway ${createPaymentDto.gateway} is only available for organizations in Nepal. Please use Stripe or PayPal.`);
      }

      // Generate unique transaction ID
      const transactionId = uuidv4();

      // Determine currency based on gateway
      // eSewa/Khalti/ConnectIPS use NPR, Stripe/PayPal use USD
      const isNprGateway = [PaymentGateway.ESEWA, PaymentGateway.KHALTI, PaymentGateway.CONNECT_IPS, PaymentGateway.IME_PAY].includes(createPaymentDto.gateway);
      const currency = isNprGateway ? 'NPR' : 'USD';

      // Calculate amount - ensure it's a valid number with 2 decimal places
      let amount = Math.round(createPaymentDto.amount * 100) / 100;

      // For eSewa: calculate tax (13% VAT in Nepal)
      // For Stripe: amount is as-is (no tax calculation needed, Stripe handles it)
      let finalAmount = amount;
      let baseAmount = amount;
      let taxAmount = 0;

      if (createPaymentDto.gateway === PaymentGateway.ESEWA) {
        // eSewa requires tax calculation: baseAmount = totalAmount / 1.13
        baseAmount = Math.round((amount / 1.13) * 100) / 100;
        taxAmount = Math.round((amount - baseAmount) * 100) / 100;
        finalAmount = Math.round((baseAmount + taxAmount) * 100) / 100;
      }

      // Create payment record
      const payment = this.paymentRepository.create({
        organization_id: organizationId,
        user_id: userId,
        transaction_id: transactionId,
        gateway: createPaymentDto.gateway,
        payment_type: createPaymentDto.payment_type,
        amount: finalAmount,
        currency: currency,
        description: createPaymentDto.description || `Payment for ${createPaymentDto.payment_type}`,
        status: PaymentStatus.PENDING,
        metadata: {
          ...createPaymentDto.metadata,
          package_id: createPaymentDto.package_id,
        },
      });

      await this.paymentRepository.save(payment);

      // Generate payment form based on gateway
      if (createPaymentDto.gateway === PaymentGateway.ESEWA) {
        const frontendUrl = origin || process.env.FRONTEND_URL || 'http://localhost:3001';
        // Generate eSewa payment form
        // Generate eSewa payment form
        const esewaResponse = await this.esewaService.initiatePayment(
          finalAmount,
          transactionId,
          undefined, // Let service use configured product code (merchantId)
          `${frontendUrl}/payment/success`,
          `${frontendUrl}/payment/failure`
        );

        return {
          payment: {
            id: payment.id,
            transaction_id: payment.transaction_id,
            amount: payment.amount,
            status: payment.status,
            created_at: payment.created_at,
          },
          payment_form: {
            formUrl: esewaResponse.gatewayUrl,
            formData: esewaResponse.formData,
          },
        };
      } else if (createPaymentDto.gateway === PaymentGateway.STRIPE) {
        // Generate Stripe checkout session
        const frontendUrl = origin || process.env.FRONTEND_URL || 'http://localhost:3001';

        try {
          const session = await this.stripeService.createCheckoutSession({
            amount: finalAmount,
            currency: currency.toLowerCase(),
            transactionId: transactionId,
            description: payment.description || `Payment for ${createPaymentDto.payment_type}`,
            successUrl: `${frontendUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
            cancelUrl: `${frontendUrl}/payment/failure`,
            metadata: {
              transaction_id: transactionId,
              payment_type: createPaymentDto.payment_type,
              package_id: createPaymentDto.package_id?.toString(),
              organization_id: organizationId.toString(),
              user_id: userId.toString(),
            },
          });

          if (!session.url) {
            throw new BadRequestException('Stripe session created but no redirect URL available');
          }

          return {
            payment: {
              id: payment.id,
              transaction_id: payment.transaction_id,
              amount: payment.amount,
              status: payment.status,
              created_at: payment.created_at,
            },
            payment_form: {
              formUrl: session.url,
              formData: {
                session_id: session.id,
              },
            },
          };
        } catch (error) {
          // Log the error for debugging
          this.logger.error('Error creating Stripe checkout session:', error);
          this.logger.error('Error details:', {
            message: error.message,
            stack: error.stack,
            type: error.constructor.name,
          });
          throw error; // Re-throw to let NestJS handle it
        }
      } else if (createPaymentDto.gateway === PaymentGateway.KHALTI) {
        // Generate Khalti payment form
        const customerInfo = {
          name: `${membership.user.first_name} ${membership.user.last_name}`,
          email: membership.user.email,
          phone: membership.user.phone || '',
        };
        const khaltiResponse = await this.khaltiService.initiatePayment(
          finalAmount,
          transactionId,
          createPaymentDto.description || `Payment for ${createPaymentDto.payment_type}`,
          customerInfo,
        );

        return {
          payment: {
            id: payment.id,
            transaction_id: payment.transaction_id,
            amount: payment.amount,
            status: payment.status,
            created_at: payment.created_at,
          },
          payment_form: {
            formUrl: khaltiResponse.payment_url,
            formData: {
              pidx: khaltiResponse.pidx,
            },
          },
        };
      } else if (createPaymentDto.gateway === PaymentGateway.CONNECT_IPS) {
        // Generate ConnectIPS payment form
        const connectIpsResponse = await this.connectIpsService.initiatePayment(
          finalAmount,
          transactionId,
          createPaymentDto.description || `Payment for ${createPaymentDto.payment_type}`,
        );

        return {
          payment: {
            id: payment.id,
            transaction_id: payment.transaction_id,
            amount: payment.amount,
            status: payment.status,
            created_at: payment.created_at,
          },
          payment_form: {
            formUrl: connectIpsResponse.gatewayUrl,
            formData: connectIpsResponse.formData,
          },
        };
      } else if (createPaymentDto.gateway === PaymentGateway.PAYPAL) {
        // Generate PayPal order
        const paypalResponse = await this.paypalService.createOrder(
          finalAmount,
          currency,
          transactionId,
          createPaymentDto.description || `Payment for ${createPaymentDto.payment_type}`,
        );

        return {
          payment: {
            id: payment.id,
            transaction_id: payment.transaction_id,
            amount: payment.amount,
            status: payment.status,
            created_at: payment.created_at,
          },
          payment_form: {
            formUrl: paypalResponse.approvalUrl,
            formData: {
              orderId: paypalResponse.orderId,
            },
          },
        };
      } else if (createPaymentDto.gateway === PaymentGateway.IME_PAY) {
        // Generate IME Pay payment form
        const imePayResponse = await this.imePayService.initiatePayment(
          finalAmount,
          transactionId,
          createPaymentDto.description || `Payment for ${createPaymentDto.payment_type}`,
        );

        return {
          payment: {
            id: payment.id,
            transaction_id: payment.transaction_id,
            amount: payment.amount,
            status: payment.status,
            created_at: payment.created_at,
          },
          payment_form: {
            formUrl: imePayResponse.gatewayUrl,
            formData: imePayResponse.formData,
          },
        };
      } else {
        throw new BadRequestException(`Unsupported payment gateway: ${createPaymentDto.gateway}`);
      }
    } catch (error) {
      this.logger.error('Error in createPayment:', error);
      this.logger.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name,
        userId,
        organizationId,
        dto: createPaymentDto,
      });

      // Re-throw known exceptions
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      // Wrap unknown errors
      throw new BadRequestException(
        `Failed to create payment: ${error.message || 'Unknown error'}`,
      );
    }
  }

  /**
   * Verify and complete payment after gateway callback
   */
  async verifyPayment(transactionId: string, refId?: string, sessionId?: string) {
    // For Stripe, if we have sessionId but no transactionId, find payment by session metadata
    let payment;
    if (sessionId && !transactionId) {
      // Find payment by searching metadata for session_id or by verifying session
      const stripeService = this.stripeService;
      const verificationResult = await stripeService.verifyPayment(sessionId);
      if (verificationResult.transactionId) {
        payment = await this.paymentRepository.findOne({
          where: { transaction_id: verificationResult.transactionId },
          relations: ['organization', 'user'],
        });
      }
    } else if (transactionId) {
      // Find payment by transaction ID
      payment = await this.paymentRepository.findOne({
        where: { transaction_id: transactionId },
        relations: ['organization', 'user'],
      });
    }

    // If still not found and we have refId, try to find by reference_id (for eSewa)
    if (!payment && refId) {
      payment = await this.paymentRepository.findOne({
        where: { reference_id: refId },
        relations: ['organization', 'user'],
        order: { created_at: 'DESC' }, // Get most recent
      });
    }

    if (!payment) {
      throw new NotFoundException(
        `Payment not found. TransactionId: ${transactionId || 'N/A'}, RefId: ${refId || 'N/A'}, SessionId: ${sessionId || 'N/A'}`,
      );
    }

    this.logger.log(`Attempting to verify payment. TransactionId: ${transactionId || 'N/A'}, SessionId: ${sessionId || 'N/A'}, RefId: ${refId || 'N/A'}`);

    if (payment.status === PaymentStatus.COMPLETED) {
      return {
        success: true,
        message: 'Payment already verified',
        payment: {
          id: payment.id,
          transaction_id: payment.transaction_id,
          status: payment.status,
        },
      };
    }

    if (payment.status !== PaymentStatus.PENDING) {
      throw new BadRequestException(`Payment is ${payment.status} and cannot be verified`);
    }

    // Verify based on gateway
    let verificationResult;
    if (payment.gateway === PaymentGateway.ESEWA) {
      // eSewa v2 API can verify with just transaction_uuid and total_amount
      // refId is optional but recommended for better verification
      // Verify with eSewa (v2 API requires total_amount)
      try {
        const amountToVerify = Math.round(parseFloat(payment.amount.toString()) * 100) / 100;
        this.logger.log(`Verifying eSewa payment of ${amountToVerify} for transaction ${transactionId}`);
        verificationResult = await this.esewaService.verifyTransaction(
          transactionId,
          amountToVerify,
        );
      } catch (error: any) {
        this.logger.error(`eSewa verification exception: ${error.message}`, error.stack);
        // If verification throws an exception, return failure response
        verificationResult = {
          status: 'failure',
          message: error.message || 'Payment verification failed',
        };
      }
    } else if (payment.gateway === PaymentGateway.STRIPE) {
      if (!sessionId) {
        throw new BadRequestException('Session ID is required for Stripe payments');
      }
      // Verify with Stripe
      verificationResult = await this.stripeService.verifyPayment(sessionId);
    } else if (payment.gateway === PaymentGateway.KHALTI) {
      if (!refId && !transactionId) {
        throw new BadRequestException('pidx or transactionId is required for Khalti payments');
      }
      verificationResult = await this.khaltiService.verifyPayment(refId || transactionId);
    } else if (payment.gateway === PaymentGateway.PAYPAL) {
      if (!refId && !sessionId) {
        throw new BadRequestException('orderId or sessionId is required for PayPal payments');
      }
      verificationResult = await this.paypalService.captureOrder(refId || sessionId);
    } else if (payment.gateway === PaymentGateway.CONNECT_IPS) {
      verificationResult = { status: 'success', message: 'ConnectIPS payment received' };
    } else if (payment.gateway === PaymentGateway.IME_PAY) {
      if (!refId) {
        throw new BadRequestException('tokenId is required for IME Pay verification');
      }
      const amountToVerify = Math.round(parseFloat(payment.amount.toString()) * 100) / 100;
      verificationResult = await this.imePayService.verifyTransaction(transactionId, refId, amountToVerify);
    } else {
      throw new BadRequestException(`Unsupported payment gateway: ${payment.gateway}`);
    }

    // Handle verification result
    if (verificationResult.status === 'success') {
      // Update payment status
      payment.status = PaymentStatus.COMPLETED;
      if (refId) {
        payment.reference_id = refId;
      }
      if (sessionId) {
        payment.reference_id = sessionId; // Store session ID as reference for Stripe
      }
      payment.completed_at = new Date();
      payment.gateway_response = JSON.stringify(verificationResult);

      await this.paymentRepository.save(payment);

      // Reload payment to ensure we have the latest data including metadata
      const reloadedPayment = await this.paymentRepository.findOne({
        where: { id: payment.id },
      });

      if (!reloadedPayment) {
        this.logger.error(`Payment ${payment.id} not found after save`);
        throw new NotFoundException('Payment not found after save');
      }

      // Trigger post-payment actions based on payment type
      let postPaymentError: string | null = null;
      try {
        this.logger.log(
          `Triggering post-payment actions for payment ${reloadedPayment.id}, type: ${reloadedPayment.payment_type}`,
        );
        this.logger.log(`Payment metadata: ${JSON.stringify(reloadedPayment.metadata)}`);
        await this.handlePostPaymentActions(reloadedPayment);
        this.logger.log(
          `Post-payment actions completed successfully for payment ${reloadedPayment.id}`,
        );
      } catch (error) {
        this.logger.error(
          `Error handling post-payment actions for payment ${reloadedPayment.id}:`,
          error,
        );
        this.logger.error(`Error message: ${error.message}`);
        this.logger.error(`Error stack: ${error.stack}`);
        postPaymentError = error.message || 'Unknown error during post-payment actions';
        // Don't fail the payment verification if post-payment actions fail
        // The payment is already marked as completed
        // But log the error for debugging and include it in the response
      }

      return {
        success: true,
        message: postPaymentError
          ? `Payment verified successfully, but post-payment actions failed: ${postPaymentError}`
          : 'Payment verified successfully',
        payment: {
          id: payment.id,
          transaction_id: payment.transaction_id,
          reference_id: payment.reference_id,
          status: payment.status,
          completed_at: payment.completed_at,
        },
        post_payment_error: postPaymentError || undefined,
      };
    } else {
      // Mark payment as failed
      payment.status = PaymentStatus.FAILED;
      payment.failure_reason = verificationResult.message || 'Payment verification failed';
      payment.gateway_response = JSON.stringify(verificationResult);

      await this.paymentRepository.save(payment);

      return {
        success: false,
        message: verificationResult.message || 'Payment verification failed',
        payment: {
          id: payment.id,
          transaction_id: payment.transaction_id,
          status: payment.status,
        },
      };
    }
  }

  /**
   * Get payment by ID
   */
  async getPayment(paymentId: string, userId: string, organizationId: string) {
    const payment = await this.paymentRepository.findOne({
      where: {
        id: paymentId,
        organization_id: organizationId,
        user_id: userId,
      },
      relations: ['organization', 'user'],
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    return payment;
  }

  /**
   * Get all payments for an organization
   */
  async getPayments(organizationId: string, userId: string) {
    // Verify user is member
    const organization = await this.organizationRepository.findOne({
      where: { id: organizationId },
      relations: ['members'],
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    const isMember = organization.members.some(
      (member) => member.user_id === userId && member.status === 'active',
    );

    if (!isMember) {
      throw new ForbiddenException('You are not a member of this organization');
    }

    return this.paymentRepository.find({
      where: { organization_id: organizationId },
      relations: ['user'],
      order: { created_at: 'DESC' },
    });
  }

  /**
   * Handle post-payment actions (upgrade package, purchase feature, etc.)
   */
  private async handlePostPaymentActions(payment: Payment): Promise<void> {
    this.logger.log(
      `Handling post-payment actions: payment_type=${payment.payment_type}, metadata=${JSON.stringify(payment.metadata)}`,
    );

    if (payment.payment_type === PaymentType.PACKAGE_UPGRADE) {
      // Handle package upgrade
      const packageId = payment.metadata?.package_id;
      this.logger.log(
        `Processing package upgrade for payment ${payment.id}: package_id=${packageId}`,
      );

      if (!packageId) {
        this.logger.warn(`Package ID not found in payment metadata for payment ${payment.id}`);
        throw new BadRequestException('Package ID is missing from payment metadata');
      }

      // Handle both string and number package_id
      const packageIdNum =
        typeof packageId === 'number' ? packageId : parseInt(String(packageId), 10);

      if (isNaN(packageIdNum)) {
        this.logger.error(`Invalid package_id: ${packageId} (cannot parse to number)`);
        throw new BadRequestException(`Invalid package ID: ${packageId}`);
      }

      this.logger.log(
        `Upgrading organization ${payment.organization_id} to package ${packageIdNum}`,
      );

      try {
        // Get period from payment metadata
        const period = payment.metadata?.period;
        const customMonths = payment.metadata?.custom_months;

        const upgradeDto: any = { package_id: packageIdNum };
        if (period) {
          upgradeDto.period = period;
        }
        if (customMonths) {
          upgradeDto.custom_months = customMonths;
        }

        const result = await this.packagesService.upgradePackage(
          payment.user_id,
          payment.organization_id,
          upgradeDto,
        );
        this.logger.log(
          `Package upgraded successfully for organization ${payment.organization_id} to package ${packageIdNum}: ${result.message}`,
        );

        // Send notifications and emails after successful package upgrade
        await this.sendPackagePurchaseNotifications(payment, result.package.name);
      } catch (error) {
        this.logger.error(
          `Failed to upgrade package for organization ${payment.organization_id}:`,
          error,
        );
        throw error; // Re-throw to be caught by caller
      }
    } else if (payment.payment_type === PaymentType.ONE_TIME) {
      // Handle feature purchase
      const featureId = payment.metadata?.feature_id;
      this.logger.log(
        `Feature purchase requested: feature_id=${featureId} (type: ${typeof featureId})`,
      );

      if (!featureId) {
        this.logger.warn(`Feature ID not found in payment metadata for payment ${payment.id}`);
        throw new BadRequestException('Feature ID is missing from payment metadata');
      }

      // Handle both string and number feature_id
      const featureIdNum =
        typeof featureId === 'number' ? featureId : parseInt(String(featureId), 10);

      if (isNaN(featureIdNum)) {
        this.logger.error(`Invalid feature_id: ${featureId} (cannot parse to number)`);
        throw new BadRequestException(`Invalid feature ID: ${featureId}`);
      }

      this.logger.log(
        `Purchasing feature ${featureIdNum} for organization ${payment.organization_id}`,
      );

      try {
        const result = await this.packagesService.purchaseFeature(
          payment.user_id,
          payment.organization_id,
          { package_feature_id: featureIdNum },
        );
        this.logger.log(
          `Feature ${featureIdNum} purchased successfully for organization ${payment.organization_id}: ${result.message}`,
        );

        // Send notifications and emails after successful feature purchase
        await this.sendFeaturePurchaseNotifications(payment, result.feature);
      } catch (error) {
        this.logger.error(
          `Failed to purchase feature ${featureIdNum} for organization ${payment.organization_id}:`,
          error,
        );
        throw error; // Re-throw to be caught by caller
      }
    } else if (payment.payment_type === PaymentType.SUBSCRIPTION) {
      // Handle app subscription activation
      const appId = payment.metadata?.app_id;
      this.logger.log(
        `Processing app subscription activation for payment ${payment.id}: app_id=${appId}`,
      );

      if (!appId) {
        this.logger.warn(`App ID not found in payment metadata for payment ${payment.id}`);
        throw new BadRequestException('App ID is missing from payment metadata');
      }

      // Handle both string and number app_id
      const appIdNum =
        typeof appId === 'number' ? appId : parseInt(String(appId), 10);

      if (isNaN(appIdNum)) {
        this.logger.error(`Invalid app_id: ${appId} (cannot parse to number)`);
        throw new BadRequestException(`Invalid app ID: ${appId}`);
      }

      this.logger.log(
        `Activating app subscription ${appIdNum} for organization ${payment.organization_id}`,
      );

      try {
        // Find the organization app subscription by payment_id
        const orgApp = await this.orgAppRepository.findOne({
          where: {
            organization_id: payment.organization_id,
            app_id: appIdNum,
            payment_id: payment.id,
          },
        });

        if (!orgApp) {
          this.logger.error(
            `Organization app subscription not found for payment ${payment.id}, app_id ${appIdNum}, organization ${payment.organization_id}`,
          );
          throw new NotFoundException(
            `App subscription not found for this payment. Please contact support.`,
          );
        }

        // Activate the subscription
        const now = new Date();
        orgApp.status = OrganizationAppStatus.ACTIVE;
        orgApp.subscription_start = now;

        // Update subscription end date based on billing period
        const billingPeriod = payment.metadata?.billing_period || 'monthly';
        if (billingPeriod === 'monthly') {
          orgApp.subscription_end = new Date(now);
          orgApp.subscription_end.setMonth(orgApp.subscription_end.getMonth() + 1);
        } else {
          orgApp.subscription_end = new Date(now);
          orgApp.subscription_end.setFullYear(orgApp.subscription_end.getFullYear() + 1);
        }
        orgApp.next_billing_date = orgApp.subscription_end;

        await this.orgAppRepository.save(orgApp);
        this.logger.log(
          `App subscription ${appIdNum} activated successfully for organization ${payment.organization_id}`,
        );

        // Increment app subscription count (since we skipped it in purchaseApp for paid apps)
        if (this.appsService) {
          await this.appsService.incrementSubscriptionCount(appIdNum);
        }

        // Grant access to all organization members
        const purchaserId = payment.user_id;
        const orgId = payment.organization_id;

        if (this.appAccessService) {
          try {
            // Fetch all members of the organization
            const members = await this.memberRepository.find({
              where: {
                organization_id: orgId,
                status: OrganizationMemberStatus.ACTIVE,
              },
            });

            this.logger.log(`Granting app ${appIdNum} access to ${members.length} organization members`);

            // Grant access to each member
            for (const member of members) {
              try {
                await this.appAccessService.grantAccess(purchaserId, orgId, {
                  user_id: member.user_id,
                  app_id: appIdNum,
                  // role_id will be handled by grantAccess (defaults to member's role or app default)
                });
              } catch (e) {
                // Ignore if access already exists or other non-critical error
                this.logger.debug(`Could not grant access to user ${member.user_id}: ${e.message}`);
              }
            }
          } catch (error) {
            this.logger.error(`Failed to grant app access to organization members: ${error.message}`);
          }
        }

        // Mark invoice as paid if it exists
        const invoice = await this.invoiceRepository.findOne({
          where: {
            organization_id: payment.organization_id,
            app_id: appIdNum,
            payment_id: payment.id,
          },
        });

        if (invoice && invoice.status === InvoiceStatus.UNPAID) {
          invoice.status = InvoiceStatus.PAID;
          invoice.paid_at = now;
          await this.invoiceRepository.save(invoice);
          this.logger.log(`Invoice ${invoice.id} marked as paid`);
        }

        // Send notifications
        const appName = payment.metadata?.app_name || `App ${appIdNum}`;
        await this.sendAppSubscriptionNotifications(payment, appName, appIdNum);
      } catch (error) {
        this.logger.error(
          `Failed to activate app subscription ${appIdNum} for organization ${payment.organization_id}:`,
          error,
        );
        throw error; // Re-throw to be caught by caller
      }
    } else {
      this.logger.warn(`No post-payment action handler for payment type: ${payment.payment_type}`);
    }
  }

  /**
   * Send notifications and emails to all organization users after package purchase
   */
  private async sendPackagePurchaseNotifications(
    payment: Payment,
    packageName: string,
  ): Promise<void> {
    try {
      // Load payment with relations
      const paymentWithRelations = await this.paymentRepository.findOne({
        where: { id: payment.id },
        relations: ['user', 'organization', 'organization.package'],
      });

      if (
        !paymentWithRelations ||
        !paymentWithRelations.organization ||
        !paymentWithRelations.user
      ) {
        this.logger.warn(
          `Cannot send notifications: missing payment relations for payment ${payment.id}`,
        );
        return;
      }

      const organization = paymentWithRelations.organization;
      const purchaser = paymentWithRelations.user;
      const purchaserName =
        `${purchaser.first_name || ''} ${purchaser.last_name || ''}`.trim() || purchaser.email;

      // Get all active members of the organization
      const members = await this.memberRepository.find({
        where: {
          organization_id: organization.id,
          status: OrganizationMemberStatus.ACTIVE,
        },
        relations: ['user', 'role'],
      });

      // Get organization owner email
      const ownerMember = members.find((m) => m.role?.is_organization_owner);
      const owner = ownerMember
        ? await this.userRepository.findOne({ where: { id: ownerMember.user_id } })
        : null;

      // Send notifications to all organization users
      await this.notificationHelper.notifyPackageUpgraded(
        organization.id,
        packageName,
        payment.user_id,
      );

      // Send emails to:
      // 1. Organization email (if exists)
      // 2. Organization owner email
      // 3. Purchaser email
      // All emails respect user preferences per organization

      const emailRecipients = new Set<string>();

      // Add organization email
      if (organization.email) {
        emailRecipients.add(organization.email);
      }

      // Add owner email
      if (owner && owner.email) {
        emailRecipients.add(owner.email);
      }

      // Add purchaser email
      if (purchaser.email) {
        emailRecipients.add(purchaser.email);
      }

      // Send emails to each recipient, checking preferences per organization
      for (const email of emailRecipients) {
        // Find the user for this email
        const user = await this.userRepository.findOne({ where: { email } });
        if (!user) {
          // If no user found (e.g., organization email), send anyway
          if (email === organization.email) {
            try {
              const emailHtml = this.emailTemplatesService.getPackagePurchaseEmail(
                organization.name,
                organization.name,
                packageName,
                payment.amount,
                payment.currency,
                purchaserName,
                false,
              );
              await this.emailService.sendEmail(
                email,
                `Package Upgraded: ${organization.name} - ${packageName}`,
                emailHtml,
              );
            } catch (error) {
              this.logger.error(`Failed to send email to organization email ${email}:`, error);
            }
          }
          continue;
        }

        // Check if email should be sent for this user in this organization
        const shouldSendEmail = await this.notificationHelper.shouldSendEmail(
          user.id,
          organization.id,
          NotificationType.PACKAGE_UPGRADED,
        );

        if (shouldSendEmail) {
          try {
            const userName =
              `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email;
            const isPurchaser = user.id === payment.user_id;
            const emailHtml = this.emailTemplatesService.getPackagePurchaseEmail(
              userName,
              organization.name,
              packageName,
              payment.amount,
              payment.currency,
              purchaserName,
              isPurchaser,
            );
            await this.emailService.sendEmail(
              email,
              `Package Upgraded: ${organization.name} - ${packageName}`,
              emailHtml,
            );
            this.logger.log(`Package purchase email sent to ${email}`);
          } catch (error) {
            this.logger.error(`Failed to send email to ${email}:`, error);
          }
        } else {
          this.logger.log(`Email not sent to ${email} due to user preferences`);
        }
      }

      this.logger.log(
        `Package purchase notifications and emails sent for organization ${organization.id}`,
      );
    } catch (error) {
      this.logger.error(`Failed to send package purchase notifications:`, error);
      // Don't throw - this is a non-critical operation
    }
  }

  /**
   * Send notifications and emails to all organization users after feature purchase
   */
  private async sendFeaturePurchaseNotifications(payment: Payment, orgFeature: any): Promise<void> {
    try {
      // Load payment with relations
      const paymentWithRelations = await this.paymentRepository.findOne({
        where: { id: payment.id },
        relations: ['user', 'organization'],
      });

      if (
        !paymentWithRelations ||
        !paymentWithRelations.organization ||
        !paymentWithRelations.user
      ) {
        this.logger.warn(
          `Cannot send notifications: missing payment relations for payment ${payment.id}`,
        );
        return;
      }

      const organization = paymentWithRelations.organization;
      const purchaser = paymentWithRelations.user;
      const purchaserName =
        `${purchaser.first_name || ''} ${purchaser.last_name || ''}`.trim() || purchaser.email;

      // Load feature with relation
      const featureWithDetails = await this.orgFeatureRepository.findOne({
        where: { id: orgFeature.id },
        relations: ['feature'],
      });

      // Get feature details
      const featureName = featureWithDetails?.feature?.name || 'Feature';
      const featureType = featureWithDetails?.feature?.type || 'user_upgrade';
      const featureValue = featureWithDetails?.feature?.value || null;

      // Get all active members of the organization
      const members = await this.memberRepository.find({
        where: {
          organization_id: organization.id,
          status: OrganizationMemberStatus.ACTIVE,
        },
        relations: ['user', 'role'],
      });

      // Get organization owner email
      const ownerMember = members.find((m) => m.role?.is_organization_owner);
      const owner = ownerMember
        ? await this.userRepository.findOne({ where: { id: ownerMember.user_id } })
        : null;

      // Send emails to:
      // 1. Organization email (if exists)
      // 2. Organization owner email
      // 3. Purchaser email
      // All emails respect user preferences per organization

      const emailRecipients = new Set<string>();

      // Add organization email
      if (organization.email) {
        emailRecipients.add(organization.email);
      }

      // Add owner email
      if (owner && owner.email) {
        emailRecipients.add(owner.email);
      }

      // Add purchaser email
      if (purchaser.email) {
        emailRecipients.add(purchaser.email);
      }

      // Send emails to each recipient, checking preferences per organization
      for (const email of emailRecipients) {
        // Find the user for this email
        const user = await this.userRepository.findOne({ where: { email } });
        if (!user) {
          // If no user found (e.g., organization email), send anyway
          if (email === organization.email) {
            try {
              const emailHtml = this.emailTemplatesService.getFeaturePurchaseEmail(
                organization.name,
                organization.name,
                featureName,
                featureType,
                featureValue,
                payment.amount,
                payment.currency,
                purchaserName,
                false,
              );
              await this.emailService.sendEmail(
                email,
                `Feature Purchased: ${organization.name} - ${featureName}`,
                emailHtml,
              );
            } catch (error) {
              this.logger.error(`Failed to send email to organization email ${email}:`, error);
            }
          }
          continue;
        }

        // Check if email should be sent for this user in this organization
        // Use PACKAGE_UPGRADED type for feature purchases (or create a new type if needed)
        const shouldSendEmail = await this.notificationHelper.shouldSendEmail(
          user.id,
          organization.id,
          NotificationType.PACKAGE_UPGRADED, // Using same notification type for now
        );

        if (shouldSendEmail) {
          try {
            const userName =
              `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email;
            const isPurchaser = user.id === payment.user_id;
            const emailHtml = this.emailTemplatesService.getFeaturePurchaseEmail(
              userName,
              organization.name,
              featureName,
              featureType,
              featureValue,
              payment.amount,
              payment.currency,
              purchaserName,
              isPurchaser,
            );
            await this.emailService.sendEmail(
              email,
              `Feature Purchased: ${organization.name} - ${featureName}`,
              emailHtml,
            );
            this.logger.log(`Feature purchase email sent to ${email}`);
          } catch (error) {
            this.logger.error(`Failed to send email to ${email}:`, error);
          }
        } else {
          this.logger.log(`Email not sent to ${email} due to user preferences`);
        }
      }

      this.logger.log(
        `Feature purchase notifications and emails sent for organization ${organization.id}`,
      );
    } catch (error) {
      this.logger.error(`Failed to send feature purchase notifications:`, error);
      // Don't throw - this is a non-critical operation
    }
  }

  /**
   * Send notifications and emails after app subscription activation
   */
  private async sendAppSubscriptionNotifications(
    payment: Payment,
    appName: string,
    appId: number,
  ): Promise<void> {
    try {
      // Load payment with relations
      const paymentWithRelations = await this.paymentRepository.findOne({
        where: { id: payment.id },
        relations: ['user', 'organization'],
      });

      if (
        !paymentWithRelations ||
        !paymentWithRelations.organization ||
        !paymentWithRelations.user
      ) {
        this.logger.warn(
          `Cannot send notifications: missing payment relations for payment ${payment.id}`,
        );
        return;
      }

      const organization = paymentWithRelations.organization;
      const purchaser = paymentWithRelations.user;
      const purchaserName =
        `${purchaser.first_name || ''} ${purchaser.last_name || ''}`.trim() || purchaser.email;

      // Get all active members of the organization
      const members = await this.memberRepository.find({
        where: {
          organization_id: organization.id,
          status: OrganizationMemberStatus.ACTIVE,
        },
        relations: ['user', 'role'],
      });

      // Get organization owner email
      const ownerMember = members.find((m) => m.role?.is_organization_owner);
      const owner = ownerMember
        ? await this.userRepository.findOne({ where: { id: ownerMember.user_id } })
        : null;

      // Send in-app notifications to all organization members
      for (const member of members) {
        try {
          await this.notificationHelper.createNotification(
            member.user_id,
            organization.id,
            NotificationType.APP_ACCESS_GRANTED,
            `App Subscription Activated: ${appName}`,
            `${purchaserName} activated subscription for ${appName}`,
            {
              route: `/org/:slug/apps`,
              params: { slug: organization.slug || organization.id },
            },
            {
              app_id: appId,
              app_name: appName,
              purchaser_id: purchaser.id,
              purchaser_name: purchaserName,
            },
          );
        } catch (error) {
          this.logger.error(`Failed to send notification to user ${member.user_id}:`, error);
        }
      }

      // Send emails to organization owner and purchaser
      const emailRecipients = new Set<string>();

      // Add organization email
      if (organization.email) {
        emailRecipients.add(organization.email);
      }

      // Add owner email
      if (owner && owner.email) {
        emailRecipients.add(owner.email);
      }

      // Add purchaser email
      if (purchaser.email) {
        emailRecipients.add(purchaser.email);
      }

      // Send emails to each recipient
      for (const email of emailRecipients) {
        const user = await this.userRepository.findOne({ where: { email } });
        if (!user) {
          continue;
        }

        const shouldSendEmail = await this.notificationHelper.shouldSendEmail(
          user.id,
          organization.id,
          NotificationType.APP_ACCESS_GRANTED,
        );

        if (shouldSendEmail) {
          try {
            const userName =
              `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email;
            const isPurchaser = user.id === payment.user_id;

            // Simple email template for app subscription
            const emailHtml = `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2>App Subscription Activated</h2>
                <p>Hello ${userName},</p>
                <p>The subscription for <strong>${appName}</strong> has been activated for ${organization.name}.</p>
                <p><strong>Purchased by:</strong> ${purchaserName}</p>
                <p><strong>Amount:</strong> ${payment.currency} ${payment.amount}</p>
                <p>You can now access this app from your organization dashboard.</p>
                <p>Thank you!</p>
              </div>
            `;

            await this.emailService.sendEmail(
              email,
              `App Subscription Activated: ${organization.name} - ${appName}`,
              emailHtml,
            );
            this.logger.log(`App subscription email sent to ${email}`);
          } catch (error) {
            this.logger.error(`Failed to send email to ${email}:`, error);
          }
        }
      }

      this.logger.log(
        `App subscription notifications and emails sent for organization ${organization.id}`,
      );
    } catch (error) {
      this.logger.error(`Failed to send app subscription notifications:`, error);
      // Don't throw - this is a non-critical operation
    }
  }
}
