import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);
  private readonly twilioAccountSid: string | null;
  private readonly twilioAuthToken: string | null;
  private readonly twilioWhatsAppNumber: string | null;
  private readonly enabled: boolean;

  constructor(
    private configService: ConfigService,
    private httpService: HttpService,
  ) {
    this.twilioAccountSid = this.configService.get<string>('TWILIO_ACCOUNT_SID') || null;
    this.twilioAuthToken = this.configService.get<string>('TWILIO_AUTH_TOKEN') || null;
    this.twilioWhatsAppNumber = this.configService.get<string>('TWILIO_WHATSAPP_NUMBER') || null;
    this.enabled = !!(this.twilioAccountSid && this.twilioAuthToken && this.twilioWhatsAppNumber);

    if (!this.enabled) {
      this.logger.warn('WhatsApp service is disabled. TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_WHATSAPP_NUMBER must be configured.');
    }
  }

  /**
   * Send a WhatsApp message via Twilio WhatsApp API
   * @param to Recipient phone number (E.164 format, without whatsapp: prefix)
   * @param message Message body
   */
  async sendMessage(to: string, message: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.enabled) {
      this.logger.warn(`WhatsApp sending disabled. Would send to ${to}: ${message}`);
      return { success: false, error: 'WhatsApp service not configured' };
    }

    try {
      const url = `https://api.twilio.com/2010-04-01/Accounts/${this.twilioAccountSid}/Messages.json`;

      // Normalize numbers to E.164 with whatsapp: prefix
      const fromNumber = this.twilioWhatsAppNumber!.startsWith('whatsapp:')
        ? this.twilioWhatsAppNumber!
        : `whatsapp:${this.twilioWhatsAppNumber!}`;
      const toNumber = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;

      const formData = new URLSearchParams();
      formData.append('To', toNumber);
      formData.append('From', fromNumber);
      formData.append('Body', message);

      const response = await firstValueFrom(
        this.httpService.post(url, formData.toString(), {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${Buffer.from(`${this.twilioAccountSid}:${this.twilioAuthToken}`).toString('base64')}`,
          },
        }),
      );

      this.logger.log(`WhatsApp message sent to ${to}. SID: ${response.data.sid}`);
      return { success: true, messageId: response.data.sid };
    } catch (error: any) {
      this.logger.error(`Failed to send WhatsApp message to ${to}:`, error.message);
      return { success: false, error: error.message || 'Unknown error' };
    }
  }

  /**
   * Send an invoice summary via WhatsApp
   */
  async sendInvoiceSummary(to: string, invoiceNumber: number, total: number, currency: string, dueDate: Date): Promise<boolean> {
    const due = new Date(dueDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    const message =
      `Hello! Here is a summary of your invoice:\n\n` +
      `Invoice #: ${invoiceNumber}\n` +
      `Amount: ${currency} ${Number(total).toLocaleString(undefined, { minimumFractionDigits: 2 })}\n` +
      `Due Date: ${due}\n\n` +
      `Please contact us if you have any questions.`;

    const result = await this.sendMessage(to, message);
    return result.success;
  }
}
