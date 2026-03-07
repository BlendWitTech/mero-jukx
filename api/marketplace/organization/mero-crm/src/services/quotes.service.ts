import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CrmQuote, CrmQuoteItem } from '@src/database/entities/crm_quotes.entity';
import { CreateQuoteDto, UpdateQuoteDto } from '../dto/quote.dto';
import { InvoicesService } from './invoices.service';
import { CreateInvoiceDto } from '../dto/invoice.dto';
import { EmailService } from '@src/common/services/email.service';

@Injectable()
export class QuotesService {
    constructor(
        @InjectRepository(CrmQuote)
        private quotesRepository: Repository<CrmQuote>,
        @InjectRepository(CrmQuoteItem)
        private quoteItemsRepository: Repository<CrmQuoteItem>,
        private invoicesService: InvoicesService,
        private readonly emailService: EmailService,
    ) { }

    async create(
        userId: string,
        organizationId: string,
        createQuoteDto: CreateQuoteDto,
    ): Promise<CrmQuote> {
        // Get last quote number for this year
        const currentYear = new Date().getFullYear();
        const lastQuote = await this.quotesRepository.findOne({
            where: { organizationId, year: currentYear },
            order: { number: 'DESC' },
        });

        const nextNumber = lastQuote ? lastQuote.number + 1 : 1;

        const { items, ...quoteData } = createQuoteDto;

        const subTotal = items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
        const taxRate = quoteData.taxRate || 0;
        const taxTotal = (subTotal * taxRate) / 100;
        const discount = quoteData.discount || 0;
        const total = subTotal + taxTotal - discount;

        const quote = this.quotesRepository.create({
            ...quoteData,
            number: nextNumber,
            year: currentYear,
            organizationId,
            createdById: userId,
            subTotal,
            taxTotal,
            total,
            items: items.map(item => this.quoteItemsRepository.create({
                ...item,
                total: item.price * item.quantity,
            })),
        });

        return this.quotesRepository.save(quote);
    }

    async findAll(
        organizationId: string,
        page: number = 1,
        limit: number = 10,
    ): Promise<{ data: CrmQuote[]; total: number; page: number; limit: number }> {
        const skip = (page - 1) * limit;

        const [data, total] = await this.quotesRepository.findAndCount({
            where: { organizationId, removed: false },
            relations: ['client', 'createdBy'],
            order: { createdAt: 'DESC' },
            skip,
            take: limit,
        });

        return { data, total, page, limit };
    }

    async findOne(id: string, organizationId: string): Promise<CrmQuote> {
        const quote = await this.quotesRepository.findOne({
            where: { id, organizationId, removed: false },
            relations: ['client', 'createdBy', 'items'],
        });

        if (!quote) {
            throw new NotFoundException(`Quote with ID ${id} not found`);
        }

        return quote;
    }

    async update(
        id: string,
        organizationId: string,
        updateQuoteDto: UpdateQuoteDto,
    ): Promise<CrmQuote> {
        const quote = await this.findOne(id, organizationId);

        const { items, ...quoteData } = updateQuoteDto;

        if (items) {
            // Simple approach: delete old items and create new ones
            await this.quoteItemsRepository.delete({ quoteId: id });

            const subTotal = items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
            const taxRate = quoteData.taxRate !== undefined ? quoteData.taxRate : quote.taxRate;
            const taxTotal = (subTotal * taxRate) / 100;
            const discount = quoteData.discount !== undefined ? quoteData.discount : quote.discount;
            const total = subTotal + taxTotal - discount;

            quote.subTotal = subTotal;
            quote.taxRate = taxRate;
            quote.taxTotal = taxTotal;
            quote.discount = discount;
            quote.total = total;
            quote.items = items.map(item => this.quoteItemsRepository.create({
                ...item,
                total: item.price * item.quantity,
            }));
        } else if (quoteData.taxRate !== undefined || quoteData.discount !== undefined) {
            const taxRate = quoteData.taxRate !== undefined ? quoteData.taxRate : quote.taxRate;
            const discount = quoteData.discount !== undefined ? quoteData.discount : quote.discount;
            const taxTotal = (quote.subTotal * taxRate) / 100;
            const total = quote.subTotal + taxTotal - discount;

            quote.taxRate = taxRate;
            quote.taxTotal = taxTotal;
            quote.discount = discount;
            quote.total = total;
        }

        Object.assign(quote, quoteData);

        return this.quotesRepository.save(quote);
    }

    async remove(id: string, organizationId: string): Promise<void> {
        const quote = await this.findOne(id, organizationId);
        quote.removed = true;
        await this.quotesRepository.save(quote);
    }

    async convertToInvoice(id: string, userId: string, organizationId: string): Promise<{ invoiceId: string }> {
        const quote = await this.findOne(id, organizationId);

        const createInvoiceDto: CreateInvoiceDto = {
            clientId: quote.clientId,
            number: 0, // Will be handled if we use a different service or we can just pass it
            year: new Date().getFullYear(),
            date: new Date(),
            expiredDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            items: quote.items.map(item => ({
                itemName: item.itemName,
                description: item.description,
                quantity: item.quantity,
                price: item.price,
                total: item.total,
            })),
            taxRate: quote.taxRate,
            discount: quote.discount,
            notes: quote.notes,
            currency: quote.currency || 'USD',
            status: 'draft' as any,
        };

        // Note: InvoicesService might need a number and year which are mandatory in CreateInvoiceDto
        // Let's check how InvoicesService.create handles it.
        // If InvoicesService doesn't auto-generate the number, we might need to do it here.

        const invoice = await this.invoicesService.create(userId, organizationId, createInvoiceDto);

        // Optional: mark quote as accepted/converted
        quote.status = 'accepted' as any;
        await this.quotesRepository.save(quote);

        return { invoiceId: invoice.id };
    }

    async sendEmail(id: string, organizationId: string, to?: string, subject?: string, message?: string): Promise<void> {
        const quote = await this.findOne(id, organizationId);
        const recipient = to || quote.client?.email;

        if (!recipient) {
            throw new Error('No recipient email specified and client has no email on file');
        }

        const emailSubject = subject || `Quote #${quote.number} from Mero CRM`;

        const html = `
            <h2>Quote #${quote.number}</h2>
            <p>Dear ${quote.client?.name || 'Customer'},</p>
            <p>${message || 'Please find your quote details below.'}</p>
            <table style="width: 100%; border-collapse: collapse;">
                <thead>
                    <tr style="border-bottom: 2px solid #eee;">
                        <th style="text-align: left; padding: 8px;">Item</th>
                        <th style="text-align: right; padding: 8px;">Qty</th>
                        <th style="text-align: right; padding: 8px;">Price</th>
                        <th style="text-align: right; padding: 8px;">Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${quote.items.map(item => `
                        <tr style="border-bottom: 1px solid #eee;">
                            <td style="padding: 8px;">${item.itemName}</td>
                            <td style="text-align: right; padding: 8px;">${item.quantity}</td>
                            <td style="text-align: right; padding: 8px;">${quote.currency || 'USD'} ${item.price}</td>
                            <td style="text-align: right; padding: 8px;">${quote.currency || 'USD'} ${item.total}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            <div style="text-align: right; margin-top: 20px;">
                <p><strong>Subtotal: ${quote.currency || 'USD'} ${quote.subTotal}</strong></p>
                <p>Tax (${quote.taxRate}%): ${quote.currency || 'USD'} ${quote.taxTotal}</p>
                <p>Discount: ${quote.currency || 'USD'} ${quote.discount}</p>
                <p style="font-size: 1.2em;"><strong>Total: ${quote.currency || 'USD'} ${quote.total}</strong></p>
            </div>
            <p>We look forward to working with you!</p>
        `;

        await this.emailService.sendEmail(recipient, emailSubject, html);
    }
}
