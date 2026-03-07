import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as crypto from 'crypto';

@Injectable()
export class ImePayService {
  private readonly logger = new Logger(ImePayService.name);
  private readonly merchantCode: string | null;
  private readonly merchantKey: string | null;
  private readonly gatewayUrl: string;
  private readonly verifyUrl: string;
  private readonly successUrl: string;
  private readonly failureUrl: string;
  private readonly enabled: boolean;

  constructor(private readonly configService: ConfigService) {
    const isProd = this.configService.get<string>('NODE_ENV') === 'production';
    this.merchantCode = this.configService.get<string>('IME_PAY_MERCHANT_CODE') || null;
    this.merchantKey = this.configService.get<string>('IME_PAY_MERCHANT_KEY') || null;
    this.enabled = !!(this.merchantCode && this.merchantKey);

    if (isProd && this.enabled) {
      this.gatewayUrl = 'https://payment.imepay.com.np:7979/api/MerchantPayment/';
      this.verifyUrl = 'https://payment.imepay.com.np:7979/api/MerchantPayment/TransactionStatus/';
    } else {
      // Test/staging environment
      this.gatewayUrl = 'https://stg.imepay.com.np:7979/api/MerchantPayment/';
      this.verifyUrl = 'https://stg.imepay.com.np:7979/api/MerchantPayment/TransactionStatus/';
    }

    this.successUrl =
      this.configService.get<string>('IME_PAY_SUCCESS_URL') ||
      this.configService.get<string>('PAYMENT_SUCCESS_URL') ||
      'http://localhost:3000/payment/success';
    this.failureUrl =
      this.configService.get<string>('IME_PAY_FAILURE_URL') ||
      this.configService.get<string>('PAYMENT_FAILURE_URL') ||
      'http://localhost:3000/payment/failure';

    if (!this.enabled) {
      this.logger.warn(
        'IME Pay service is disabled. Set IME_PAY_MERCHANT_CODE and IME_PAY_MERCHANT_KEY to enable.',
      );
    } else {
      this.logger.log(
        `Initialized IME Pay service in ${isProd ? 'production' : 'test'} mode with merchant code: ${this.merchantCode}`,
      );
    }
  }

  /**
   * Generate HMAC-SHA256 signature for IME Pay request
   */
  generateSignature(data: string): string {
    if (!this.merchantKey) throw new BadRequestException('IME Pay not configured');
    const hmac = crypto.createHmac('sha256', this.merchantKey);
    hmac.update(data);
    return hmac.digest('base64');
  }

  /**
   * Initiate an IME Pay payment
   * @returns form URL and form data for redirect
   */
  async initiatePayment(
    amount: number,
    transactionId: string,
    description?: string,
  ): Promise<{ gatewayUrl: string; formData: Record<string, string> }> {
    if (!this.enabled) {
      throw new BadRequestException('IME Pay is not configured. Please contact your administrator.');
    }

    try {
      // IME Pay expects amount in paisa (NPR × 100) but some integrations use NPR directly
      // We'll send in NPR as that's standard for most implementations
      const amountStr = Math.round(amount).toString();
      const signatureMessage = `${this.merchantCode}|${transactionId}|${amountStr}`;
      const signature = this.generateSignature(signatureMessage);

      const formData: Record<string, string> = {
        MerchantCode: this.merchantCode!,
        TranAmount: amountStr,
        RefId: transactionId,
        ResponseUrl: this.successUrl,
        CancelUrl: this.failureUrl,
        Signature: signature,
        Description: description || 'Mero Jugx Payment',
        TokenId: '', // Will be filled by IME Pay on redirect
      };

      this.logger.log(
        `Initiating IME Pay payment for transaction ${transactionId}, amount: NPR ${amountStr}`,
      );

      return {
        gatewayUrl: this.gatewayUrl,
        formData,
      };
    } catch (error: any) {
      this.logger.error('Error initiating IME Pay payment', error);
      throw new BadRequestException('Failed to initiate IME Pay payment');
    }
  }

  /**
   * Verify an IME Pay transaction status
   */
  async verifyTransaction(
    transactionId: string,
    tokenId: string,
    amount: number,
  ): Promise<{ status: 'success' | 'failure'; transactionId: string; refId?: string; message?: string }> {
    if (!this.enabled) {
      return { status: 'failure', transactionId, message: 'IME Pay not configured' };
    }

    try {
      const amountStr = Math.round(amount).toString();
      const signatureMessage = `${this.merchantCode}|${transactionId}|${amountStr}`;
      const signature = this.generateSignature(signatureMessage);

      const response = await axios.post(
        this.verifyUrl,
        {
          MerchantCode: this.merchantCode,
          RefId: transactionId,
          TokenId: tokenId,
          TranAmount: amountStr,
          Signature: signature,
        },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 10000,
        },
      );

      this.logger.log(`IME Pay verify response for ${transactionId}: ${JSON.stringify(response.data)}`);

      // IME Pay returns ResponseCode "0" for success
      if (response.data?.ResponseCode === '0' || response.data?.Status === 'Success') {
        return {
          status: 'success',
          transactionId,
          refId: response.data?.TransactionId || response.data?.RefId,
        };
      }

      return {
        status: 'failure',
        transactionId,
        message: response.data?.ResponseMessage || 'Payment not completed',
      };
    } catch (error: any) {
      this.logger.error(`Error verifying IME Pay transaction ${transactionId}:`, error.message);
      return { status: 'failure', transactionId, message: 'Could not verify payment status' };
    }
  }
}
