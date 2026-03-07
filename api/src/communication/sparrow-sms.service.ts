import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

/**
 * Sparrow SMS Service — Nepal-specific SMS provider
 * API docs: https://www.sparrowsms.com/docs
 * Endpoint: POST https://apisms.sparrowsms.com/v2/sms/
 */
@Injectable()
export class SparrowSmsService {
  private readonly logger = new Logger(SparrowSmsService.name);
  private readonly token: string | null;
  private readonly from: string;
  private readonly enabled: boolean;

  constructor(
    private configService: ConfigService,
    private httpService: HttpService,
  ) {
    this.token = this.configService.get<string>('SPARROW_SMS_TOKEN') || null;
    this.from = this.configService.get<string>('SPARROW_SMS_FROM') || 'Demo';
    this.enabled = !!this.token;

    if (!this.enabled) {
      this.logger.warn('Sparrow SMS service is disabled. SPARROW_SMS_TOKEN must be configured.');
    }
  }

  /**
   * Send an SMS via Sparrow SMS (Nepal)
   * @param to Recipient number (Nepali mobile, e.g. 9801234567)
   * @param text Message body
   */
  async sendSms(to: string, text: string): Promise<{ success: boolean; error?: string }> {
    if (!this.enabled) {
      this.logger.warn(`Sparrow SMS disabled. Would send to ${to}: ${text}`);
      return { success: false, error: 'Sparrow SMS not configured' };
    }

    try {
      const formData = new URLSearchParams();
      formData.append('token', this.token!);
      formData.append('from', this.from);
      formData.append('to', to);
      formData.append('text', text);

      const response = await firstValueFrom(
        this.httpService.post('https://apisms.sparrowsms.com/v2/sms/', formData.toString(), {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        }),
      );

      // Sparrow SMS returns { response_code: 200, message: 'success' } on success
      if (response.data?.response_code === 200) {
        this.logger.log(`Sparrow SMS sent successfully to ${to}`);
        return { success: true };
      } else {
        const errMsg = response.data?.message || 'Unknown error from Sparrow SMS';
        this.logger.error(`Sparrow SMS failed to ${to}: ${errMsg}`);
        return { success: false, error: errMsg };
      }
    } catch (error: any) {
      this.logger.error(`Sparrow SMS error for ${to}:`, error.message);
      return { success: false, error: error.message || 'Unknown error' };
    }
  }

  /**
   * Send an OTP via Sparrow SMS
   */
  async sendOtp(to: string, otp: string): Promise<boolean> {
    const text = `Your OTP is: ${otp}. Valid for 10 minutes. Do not share this code.`;
    const result = await this.sendSms(to, text);
    return result.success;
  }

  /**
   * Send a notification via Sparrow SMS
   */
  async sendNotification(to: string, title: string, body: string): Promise<boolean> {
    const text = `${title}\n${body}`;
    const result = await this.sendSms(to, text);
    return result.success;
  }
}
