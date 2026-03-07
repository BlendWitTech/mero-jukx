import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

export interface StripePaymentInitParams {
  amount: number; // Amount in smallest currency unit (paise for NPR, cents for USD)
  currency: string; // 'npr' or 'usd'
  transactionId: string;
  description: string;
  successUrl: string;
  cancelUrl: string;
  metadata?: Record<string, any>;
}

export interface StripePaymentSession {
  id: string;
  url: string;
}

@Injectable()
export class StripeService {
  private readonly logger = new Logger(StripeService.name);
  private stripe: Stripe;
  private readonly isDevelopment: boolean;

  constructor(private configService: ConfigService) {
    this.isDevelopment = process.env.NODE_ENV !== 'production';

    const stripeConfig = this.configService.get('stripe');
    const secretKey = this.isDevelopment
      ? stripeConfig?.testSecretKey || ''
      : stripeConfig?.secretKey || '';

    if (!secretKey) {
      this.logger.warn('⚠️  Stripe secret key is not configured. Stripe payments will fail.');
      this.logger.warn(
        '   Set STRIPE_TEST_SECRET_KEY for development or STRIPE_SECRET_KEY for production',
      );
      this.logger.warn(
        `   Current config: ${JSON.stringify({
          hasTestKey: !!stripeConfig?.testSecretKey,
          hasProdKey: !!stripeConfig?.secretKey,
          isDevelopment: this.isDevelopment,
        })}`,
      );
    } else {
      try {
        this.stripe = new Stripe(secretKey.trim(), {
          apiVersion: '2025-11-17.clover',
        });
        this.logger.log(
          `💳 Stripe initialized (${this.isDevelopment ? 'Test' : 'Production'} mode)`,
        );
      } catch (error) {
        this.logger.error('❌ Failed to initialize Stripe:', error);
        this.stripe = null;
      }
    }
  }

  /**
   * Create a Stripe Checkout Session
   * Returns a session URL that the user should be redirected to
   */
  async createCheckoutSession(params: StripePaymentInitParams): Promise<StripePaymentSession> {
    if (!this.stripe) {
      throw new BadRequestException(
        'Stripe is not configured. Please set STRIPE_TEST_SECRET_KEY or STRIPE_SECRET_KEY',
      );
    }

    try {
      // Validate inputs
      if (!params.amount || params.amount <= 0) {
        throw new BadRequestException('Invalid amount. Amount must be greater than 0');
      }

      if (!params.currency) {
        throw new BadRequestException('Currency is required');
      }

      // Convert amount to smallest currency unit
      // For NPR: amount is in rupees, convert to paise (multiply by 100)
      // For USD: amount is in dollars, convert to cents (multiply by 100)
      const amountInSmallestUnit = Math.round(params.amount * 100);

      if (amountInSmallestUnit < 50) {
        // Stripe minimum is $0.50 or equivalent
        throw new BadRequestException(
          `Amount too small. Minimum amount is 0.50 ${params.currency.toUpperCase()}`,
        );
      }

      // Stripe expects currency in lowercase
      const currency = params.currency.toLowerCase();

      // Validate currency is supported by Stripe
      const supportedCurrencies = ['usd', 'npr', 'eur', 'gbp', 'cad', 'aud'];
      if (!supportedCurrencies.includes(currency)) {
        this.logger.warn(`Currency ${currency} may not be supported by Stripe. Using anyway.`);
      }

      this.logger.debug(
        `Creating Stripe checkout session: ${amountInSmallestUnit} ${currency} (${params.amount} ${currency.toUpperCase()})`,
      );
      this.logger.debug(
        `Transaction ID: ${params.transactionId}, Description: ${params.description}`,
      );

      const session = await this.stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: currency,
              product_data: {
                name: params.description || 'Payment',
              },
              unit_amount: amountInSmallestUnit,
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: params.successUrl,
        cancel_url: params.cancelUrl,
        client_reference_id: params.transactionId,
        metadata: {
          transaction_id: params.transactionId,
          ...params.metadata,
        },
      });

      this.logger.debug(`Stripe checkout session created: ${session.id}, URL: ${session.url}`);

      if (!session.url) {
        throw new BadRequestException('Stripe session created but no URL returned');
      }

      return {
        id: session.id,
        url: session.url,
      };
    } catch (error: any) {
      this.logger.error(`Stripe checkout session creation failed:`, error);

      // Provide more specific error messages based on error type
      if (error instanceof BadRequestException) {
        throw error;
      }

      // Handle Stripe-specific errors
      if (error.type) {
        switch (error.type) {
          case 'StripeInvalidRequestError':
            this.logger.error(`Stripe invalid request: ${error.message}`);
            throw new BadRequestException(
              `Stripe error: ${error.message || 'Invalid request to Stripe API'}. Please check your payment details.`,
            );
          case 'StripeAuthenticationError':
            this.logger.error(`Stripe authentication failed: ${error.message}`);
            throw new BadRequestException(
              'Stripe authentication failed. Please check your Stripe API keys in the .env file.',
            );
          case 'StripeAPIError':
            this.logger.error(`Stripe API error: ${error.message}`);
            throw new BadRequestException(
              `Stripe API error: ${error.message || 'An error occurred while communicating with Stripe'}`,
            );
          case 'StripeConnectionError':
            this.logger.error(`Stripe connection error: ${error.message}`);
            throw new BadRequestException(
              'Failed to connect to Stripe. Please check your internet connection and try again.',
            );
          default:
            this.logger.error(
              `Unknown Stripe error type: ${error.type}, message: ${error.message}`,
            );
            throw new BadRequestException(
              `Stripe error: ${error.message || 'An unexpected error occurred'}`,
            );
        }
      }

      // Generic error handling
      const errorMessage = error.message || 'Unknown error occurred';
      this.logger.error(`Unexpected error creating Stripe session: ${errorMessage}`, error.stack);
      throw new BadRequestException(`Failed to create Stripe payment session: ${errorMessage}`);
    }
  }

  /**
   * Verify a Stripe payment using the session ID
   */
  async verifyPayment(sessionId: string): Promise<{
    status: 'success' | 'failure';
    paymentIntentId?: string;
    amount?: number;
    currency?: string;
    transactionId?: string; // Transaction ID from our system
    message?: string;
  }> {
    if (!this.stripe) {
      throw new BadRequestException('Stripe is not configured');
    }

    try {
      const session = await this.stripe.checkout.sessions.retrieve(sessionId);

      if (session.payment_status === 'paid') {
        return {
          status: 'success',
          paymentIntentId: session.payment_intent as string,
          amount: session.amount_total ? session.amount_total / 100 : undefined, // Convert from smallest unit
          currency: session.currency?.toUpperCase(),
          transactionId: session.client_reference_id || session.metadata?.transaction_id,
        };
      } else {
        return {
          status: 'failure',
          message: `Payment status: ${session.payment_status}`,
        };
      }
    } catch (error: any) {
      this.logger.error(`Stripe payment verification failed: ${error.message}`, error.stack);
      return {
        status: 'failure',
        message: error.message,
      };
    }
  }

  /**
   * Handle Stripe webhook event
   */
  async handleWebhookEvent(event: Stripe.Event): Promise<{
    transactionId?: string;
    status: 'success' | 'failure';
    paymentIntentId?: string;
  }> {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;

      if (session.payment_status === 'paid') {
        return {
          transactionId: session.client_reference_id || undefined,
          status: 'success',
          paymentIntentId: session.payment_intent as string,
        };
      }
    }

    return {
      status: 'failure',
    };
  }
}
