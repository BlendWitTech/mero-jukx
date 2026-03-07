import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class PaypalService {
    private readonly logger = new Logger(PaypalService.name);
    private readonly clientId: string;
    private readonly clientSecret: string;
    private readonly baseUrl: string;

    constructor(private readonly configService: ConfigService) {
        this.clientId = this.configService.get<string>('PAYPAL_CLIENT_ID', '');
        this.clientSecret = this.configService.get<string>('PAYPAL_CLIENT_SECRET', '');
        const isProd = this.configService.get<string>('NODE_ENV') === 'production';
        this.baseUrl = isProd
            ? 'https://api-m.paypal.com'
            : 'https://api-m.sandbox.paypal.com';
    }

    private async getAccessToken() {
        const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
        try {
            const response = await axios.post(
                `${this.baseUrl}/v1/oauth2/token`,
                'grant_type=client_credentials',
                {
                    headers: {
                        Authorization: `Basic ${auth}`,
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                },
            );
            return response.data.access_token;
        } catch (error) {
            this.logger.error('Failed to get PayPal access token', error.response?.data || error.message);
            throw new BadRequestException('PayPal authentication failed');
        }
    }

    async createOrder(amount: number, currency: string, transactionId: string, description: string) {
        const accessToken = await this.getAccessToken();
        try {
            const response = await axios.post(
                `${this.baseUrl}/v2/checkout/orders`,
                {
                    intent: 'CAPTURE',
                    purchase_units: [
                        {
                            reference_id: transactionId,
                            description: description,
                            amount: {
                                currency_code: currency,
                                value: amount.toString(),
                            },
                        },
                    ],
                    application_context: {
                        return_url: `${this.configService.get('FRONTEND_URL')}/payment/success?gateway=paypal`,
                        cancel_url: `${this.configService.get('FRONTEND_URL')}/payment/failure`,
                    },
                },
                {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        'Content-Type': 'application/json',
                    },
                },
            );

            const approvalUrl = response.data.links.find((link: any) => link.rel === 'approve')?.href;
            return {
                orderId: response.data.id,
                approvalUrl: approvalUrl,
            };
        } catch (error) {
            this.logger.error('Failed to create PayPal order', error.response?.data || error.message);
            throw new BadRequestException('PayPal order creation failed');
        }
    }

    async captureOrder(orderId: string) {
        const accessToken = await this.getAccessToken();
        try {
            const response = await axios.post(
                `${this.baseUrl}/v2/checkout/orders/${orderId}/capture`,
                {},
                {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        'Content-Type': 'application/json',
                    },
                },
            );

            return {
                status: response.data.status === 'COMPLETED' ? 'success' : 'failure',
                transactionId: response.data.purchase_units[0]?.payments?.captures[0]?.id,
                rawResponse: response.data,
            };
        } catch (error) {
            this.logger.error('Failed to capture PayPal order', error.response?.data || error.message);
            throw new BadRequestException('PayPal payment capture failed');
        }
    }
}
