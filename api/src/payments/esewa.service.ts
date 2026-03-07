import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as crypto from 'crypto';

@Injectable()
export class EsewaService {
  private readonly logger = new Logger(EsewaService.name);
  private readonly merchantId: string;
  private readonly secretKey: string;
  private readonly gatewayUrl: string;
  private readonly successUrl: string;
  private readonly failureUrl: string;

  constructor(private readonly configService: ConfigService) {
    const isProd = this.configService.get<string>('NODE_ENV') === 'production';
    const prodMerchantId = this.configService.get<string>('ESEWA_MERCHANT_ID');
    const prodSecretKey = this.configService.get<string>('ESEWA_SECRET_KEY');

    // Default to test credentials if not in production or if production keys are missing
    if (isProd && prodMerchantId && prodSecretKey) {
      this.merchantId = prodMerchantId;
      this.secretKey = prodSecretKey;
      this.gatewayUrl = this.configService.get<string>('ESEWA_API_URL') || 'https://epay.esewa.com.np/api/epay/main/v2/form';
    } else {
      this.merchantId = this.configService.get<string>('ESEWA_TEST_MERCHANT_ID') || 'EPAYTEST';
      this.secretKey = this.configService.get<string>('ESEWA_TEST_SECRET_KEY') || '8gBm/:&EnhH.1/q';
      this.gatewayUrl = this.configService.get<string>('ESEWA_TEST_API_URL') || 'https://rc-epay.esewa.com.np/api/epay/main/v2/form';
    }

    this.successUrl = this.configService.get<string>('ESEWA_SUCCESS_URL') || 'http://localhost:3000/payment/esewa/success';
    this.failureUrl = this.configService.get<string>('ESEWA_FAILURE_URL') || 'http://localhost:3000/payment/esewa/failure';

    this.logger.log(`Initialized eSewa service in ${isProd ? 'production' : 'test'} mode with merchant ID: ${this.merchantId}`);
  }

  generateSignature(message: string): string {
    const hmac = crypto.createHmac('sha256', this.secretKey);
    hmac.update(message);
    return hmac.digest('base64');
  }

  async initiatePayment(
    amount: number,
    transactionId: string,
    productCode?: string,
    successUrl?: string,
    failureUrl?: string
  ) {
    try {
      const code = productCode || this.merchantId || 'EPAYTEST';
      const sUrl = successUrl || this.successUrl;
      const fUrl = failureUrl || this.failureUrl;

      const signatureMessage = `total_amount=${amount},transaction_uuid=${transactionId},product_code=${code}`;
      const signature = this.generateSignature(signatureMessage);

      const formData = {
        amount: amount.toString(),
        failure_url: fUrl,
        product_delivery_charge: '0',
        product_service_charge: '0',
        product_code: code,
        signature: signature,
        signed_field_names: 'total_amount,transaction_uuid,product_code',
        success_url: sUrl,
        tax_amount: '0',
        total_amount: amount.toString(),
        transaction_uuid: transactionId,
      };

      this.logger.log(`Initiating eSewa payment to ${this.gatewayUrl} with signature message: ${signatureMessage}`);
      this.logger.debug(`eSewa Form Data: ${JSON.stringify(formData)}`);

      return {
        gatewayUrl: this.gatewayUrl,
        formData,
      };
    } catch (error) {
      this.logger.error('Error initiating eSewa payment', error);
      throw new BadRequestException('Failed to initiate eSewa payment');
    }
  }

  async verifyPayment(encodedData: string) {
    try {
      // Decode base64 data received from eSewa
      const decodedData = Buffer.from(encodedData, 'base64').toString('utf-8');
      const data = JSON.parse(decodedData);

      this.logger.log(`Verifying eSewa payment: ${JSON.stringify(data)}`);

      // Verify signature/status if necessary, but eSewa v2 usually sends status in success callback with signed components
      // This part depends on how eSewa sends back data in v2. 
      // Typically, for v2, verification is done by checking the signature of the response or querying the status API.

      if (data.status !== 'COMPLETE') {
        throw new BadRequestException('Payment not complete');
      }

      return {
        status: 'SUCCESS',
        transactionId: data.transaction_uuid,
        amount: data.total_amount,
        refId: data.transaction_code,
      };

    } catch (error) {
      this.logger.error('Error verifying eSewa payment', error);
      throw new BadRequestException('eSewa payment verification failed');
    }
  }
  async verifyTransaction(transactionUuid: string, totalAmount: number) {
    try {
      const verifyUrl = this.configService.get<string>('NODE_ENV') === 'production' && this.merchantId !== 'EPAYTEST'
        ? (this.configService.get<string>('ESEWA_VERIFY_URL') || 'https://esewa.com.np/api/epay/transaction/status/')
        : (this.configService.get<string>('ESEWA_TEST_VERIFY_URL') || 'https://rc-epay.esewa.com.np/api/epay/transaction/status/');

      this.logger.log(`Checking eSewa transaction status: ${transactionUuid}, amount: ${totalAmount} at ${verifyUrl}`);

      const statusUrl = verifyUrl;
      // Note: Use prod URL from config in real env

      // For v2 Status Check
      const params = {
        product_code: this.merchantId,
        total_amount: totalAmount,
        transaction_uuid: transactionUuid,
      };

      const response = await axios.get(statusUrl, { params });

      this.logger.log(`eSewa status response: ${JSON.stringify(response.data)}`);

      if (response.data.status === 'COMPLETE') {
        const refId = response.data.refId || response.data.transaction_code;
        this.logger.log(`eSewa payment verified successfully for ${transactionUuid}. RefId: ${refId}`);
        return {
          status: 'success',
          transactionId: transactionUuid,
          refId: refId,
          amount: totalAmount,
        };
      } else {
        this.logger.warn(`eSewa payment verification failed for ${transactionUuid}. Status: ${response.data.status}`);
        return {
          status: 'failure',
          message: response.data.status || 'Payment not complete'
        };
      }
    } catch (error) {
      this.logger.error('Error checking eSewa status', error);
      // Fallback: if status check fails, we presume failure or need manual intervention
      // But to satisfy the loop, return failure
      return {
        status: 'failure',
        message: 'Could not verify payment status'
      };
    }
  }
}
