import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class ConnectIpsService {
    private readonly logger = new Logger(ConnectIpsService.name);
    private readonly merchantId: string;
    private readonly appId: string;
    private readonly appName: string;
    private readonly password: string;
    private readonly baseUrl: string;

    constructor(private readonly configService: ConfigService) {
        this.merchantId = this.configService.get<string>('CONNECT_IPS_MERCHANT_ID', 'MERCHANT_ID');
        this.appId = this.configService.get<string>('CONNECT_IPS_APP_ID', 'APP_ID');
        this.appName = this.configService.get<string>('CONNECT_IPS_APP_NAME', 'APP_NAME');
        this.password = this.configService.get<string>('CONNECT_IPS_PASSWORD', 'PASSWORD');
        this.baseUrl = this.configService.get<string>(
            'CONNECT_IPS_BASE_URL',
            'https://uat.connectips.com:7443/connectipswebgw/loginpage',
        );
    }

    /**
     * Generate signature for ConnectIPS
     * MERCHANID={MERCHANTID},APPID={APPID},APPNAME={APPNAME},TXNID={TXNID},TXNDATE={TXNDATE},TXNCRNCY={TXNCRNCY},TXNAMT={TXNAMT},REFERENCEID={REFERENCEID},REMARKS={REMARKS},PARTICULARS={PARTICULARS},TOKEN=TOKEN
     */
    generateSignature(data: string): string {
        const signature = crypto
            .createHmac('sha256', this.password)
            .update(data)
            .digest('base64');
        return signature;
    }

    async initiatePayment(amount: number, transactionId: string, remarks: string) {
        const txnDate = new Date().toLocaleDateString('en-GB').split('/').join('-'); // DD-MM-YYYY
        const currency = 'NPR';
        const amountInPaisa = Math.round(amount * 100);

        const message = `MERCHANTID=${this.merchantId},APPID=${this.appId},APPNAME=${this.appName},TXNID=${transactionId},TXNDATE=${txnDate},TXNCRNCY=${currency},TXNAMT=${amountInPaisa},REFERENCEID=${transactionId},REMARKS=${remarks},PARTICULARS=${remarks},TOKEN=TOKEN`;

        const token = this.generateSignature(message);

        return {
            gatewayUrl: this.baseUrl,
            formData: {
                MERCHANTID: this.merchantId,
                APPID: this.appId,
                APPNAME: this.appName,
                TXNID: transactionId,
                TXNDATE: txnDate,
                TXNCRNCY: currency,
                TXNAMT: amountInPaisa,
                REFERENCEID: transactionId,
                REMARKS: remarks,
                PARTICULARS: remarks,
                TOKEN: token,
            },
        };
    }
}
