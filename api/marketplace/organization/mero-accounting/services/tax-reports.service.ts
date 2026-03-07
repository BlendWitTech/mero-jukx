import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SalesInvoice, SalesInvoiceStatus, SalesInvoiceType } from '@src/database/entities/customers_sales_invoices.entity';
import { PurchaseInvoice, PurchaseInvoiceStatus, PurchaseInvoiceType } from '@src/database/entities/vendors_purchase_invoices.entity';
import { BsDateService } from './bs-date.service';

@Injectable()
export class TaxReportsService {
    constructor(
        @InjectRepository(SalesInvoice)
        private readonly salesInvoiceRepository: Repository<SalesInvoice>,
        @InjectRepository(PurchaseInvoice)
        private readonly purchaseInvoiceRepository: Repository<PurchaseInvoice>,
        private readonly bsDateService: BsDateService,
    ) { }

    async getAnnex7(organizationId: string, startDate: string, endDate: string) {
        // Annex 7: Purchase Register
        const query = this.purchaseInvoiceRepository.createQueryBuilder('inv')
            .innerJoinAndSelect('inv.vendor', 'vendor')
            .where('inv.organization_id = :organizationId', { organizationId })
            .andWhere('inv.status IN (:...statuses)', {
                statuses: [PurchaseInvoiceStatus.POSTED, PurchaseInvoiceStatus.PARTIALLY_PAID, PurchaseInvoiceStatus.PAID]
            })
            .andWhere('inv.invoice_date BETWEEN :startDate AND :endDate', { startDate, endDate })
            .orderBy('inv.invoice_date', 'ASC');

        const invoices = await query.getMany();

        const data = invoices.map(inv => {
            const isDebitNote = inv.type === PurchaseInvoiceType.DEBIT_NOTE;
            const multiplier = isDebitNote ? -1 : 1;

            // In a real Nepal context:
            // - Taxable Amount = (VAT / 0.13)
            // - Exempt = Subtotal - Taxable Amount
            // Assuming standard 13% VAT for items that actually have VAT.
            let taxableAmount = 0;
            let exemptAmount = 0;

            if (inv.vatAmount > 0) {
                taxableAmount = Number(inv.vatAmount) / 0.13;
                exemptAmount = Number(inv.subtotal) - taxableAmount;
            } else {
                exemptAmount = Number(inv.subtotal);
            }

            // Clean up rounding errors
            if (exemptAmount < 0.01 && exemptAmount > -0.01) exemptAmount = 0;

            return {
                date: inv.invoiceDate,
                bsDate: this.bsDateService.adToBs(inv.invoiceDate),
                invoiceNumber: inv.invoiceNumber,
                vendorName: inv.vendor.name,
                vendorPan: inv.vendor.panNumber || '',
                taxablePurchases: taxableAmount * multiplier,
                exemptPurchases: exemptAmount * multiplier,
                vatAmount: Number(inv.vatAmount) * multiplier,
                totalAmount: Number(inv.totalAmount) * multiplier,
                isReversal: isDebitNote
            };
        });

        const totals = {
            taxablePurchases: data.reduce((sum, item) => sum + item.taxablePurchases, 0),
            exemptPurchases: data.reduce((sum, item) => sum + item.exemptPurchases, 0),
            vatAmount: data.reduce((sum, item) => sum + item.vatAmount, 0),
            totalAmount: data.reduce((sum, item) => sum + item.totalAmount, 0),
        };

        return { data, totals, period: { startDate, endDate } };
    }

    async getAnnex8(organizationId: string, startDate: string, endDate: string) {
        // Annex 8: Sales Register
        const query = this.salesInvoiceRepository.createQueryBuilder('inv')
            .innerJoinAndSelect('inv.customer', 'customer')
            .where('inv.organization_id = :organizationId', { organizationId })
            .andWhere('inv.status IN (:...statuses)', {
                statuses: [SalesInvoiceStatus.POSTED, SalesInvoiceStatus.PARTIALLY_PAID, SalesInvoiceStatus.PAID]
            })
            .andWhere('inv.invoice_date BETWEEN :startDate AND :endDate', { startDate, endDate })
            .orderBy('inv.invoice_date', 'ASC');

        const invoices = await query.getMany();

        const data = invoices.map(inv => {
            const isCreditNote = inv.type === SalesInvoiceType.CREDIT_NOTE;
            const multiplier = isCreditNote ? -1 : 1;

            let taxableAmount = 0;
            let exemptAmount = 0;
            let exportSales = 0; // Keeping 0 for now unless specifically tracked by export flag

            if (inv.vatAmount > 0) {
                taxableAmount = Number(inv.vatAmount) / 0.13;
                exemptAmount = Number(inv.subtotal) - taxableAmount;
            } else {
                exemptAmount = Number(inv.subtotal);
            }

            if (exemptAmount < 0.01 && exemptAmount > -0.01) exemptAmount = 0;

            return {
                date: inv.invoiceDate,
                bsDate: this.bsDateService.adToBs(inv.invoiceDate),
                invoiceNumber: inv.invoiceNumber,
                customerName: inv.customer.name,
                customerPan: inv.customer.panNumber || '',
                taxableSales: taxableAmount * multiplier,
                exemptSales: exemptAmount * multiplier,
                exportSales: exportSales * multiplier,
                vatAmount: Number(inv.vatAmount) * multiplier,
                totalAmount: Number(inv.totalAmount) * multiplier,
                isReversal: isCreditNote
            };
        });

        const totals = {
            taxableSales: data.reduce((sum, item) => sum + item.taxableSales, 0),
            exemptSales: data.reduce((sum, item) => sum + item.exemptSales, 0),
            exportSales: data.reduce((sum, item) => sum + item.exportSales, 0),
            vatAmount: data.reduce((sum, item) => sum + item.vatAmount, 0),
            totalAmount: data.reduce((sum, item) => sum + item.totalAmount, 0),
        };

        return { data, totals, period: { startDate, endDate } };
    }

    async getAnnex9(organizationId: string, startDate: string, endDate: string) {
        // Annex 9: VAT Ledger (Summary of Annex 7 and 8)
        const annex7 = await this.getAnnex7(organizationId, startDate, endDate);
        const annex8 = await this.getAnnex8(organizationId, startDate, endDate);

        const totalInputVat = annex7.totals.vatAmount;   // VAT paid on purchases
        const totalOutputVat = annex8.totals.vatAmount;  // VAT collected on sales

        // Output VAT - Input VAT
        const netVat = totalOutputVat - totalInputVat;

        return {
            period: { startDate, endDate },
            inputVat: {
                taxablePurchases: annex7.totals.taxablePurchases,
                exemptPurchases: annex7.totals.exemptPurchases,
                totalInputVat
            },
            outputVat: {
                taxableSales: annex8.totals.taxableSales,
                exemptSales: annex8.totals.exemptSales,
                exportSales: annex8.totals.exportSales,
                totalOutputVat
            },
            summary: {
                netVat,
                type: netVat > 0 ? 'PAYABLE' : (netVat < 0 ? 'REFUNDABLE' : 'NIL')
            }
        };
    }

    async getTdsPayableRegister(organizationId: string, startDate: string, endDate: string) {
        // TDS Payable: TDS deducted from Vendors (Purchase Invoices)
        const query = this.purchaseInvoiceRepository.createQueryBuilder('inv')
            .innerJoinAndSelect('inv.vendor', 'vendor')
            .where('inv.organization_id = :organizationId', { organizationId })
            .andWhere('inv.status IN (:...statuses)', {
                statuses: [PurchaseInvoiceStatus.POSTED, PurchaseInvoiceStatus.PARTIALLY_PAID, PurchaseInvoiceStatus.PAID]
            })
            .andWhere('inv.invoice_date BETWEEN :startDate AND :endDate', { startDate, endDate })
            .andWhere('inv.tds_amount > 0')
            .orderBy('inv.invoice_date', 'ASC');

        const invoices = await query.getMany();

        const data = invoices.map(inv => {
            const isDebitNote = inv.type === PurchaseInvoiceType.DEBIT_NOTE;
            const multiplier = isDebitNote ? -1 : 1;

            return {
                date: inv.invoiceDate,
                bsDate: this.bsDateService.adToBs(inv.invoiceDate),
                invoiceNumber: inv.invoiceNumber,
                vendorName: inv.vendor.name,
                vendorPan: inv.vendor.panNumber || '',
                tdsCategoryId: inv.tdsCategoryId,
                baseAmount: Number(inv.subtotal) * multiplier,
                tdsAmount: Number(inv.tdsAmount) * multiplier,
                netPaid: Number(inv.totalAmount) * multiplier,
                isReversal: isDebitNote
            };
        });

        const totals = {
            baseAmount: data.reduce((sum, item) => sum + item.baseAmount, 0),
            tdsAmount: data.reduce((sum, item) => sum + item.tdsAmount, 0),
            netPaid: data.reduce((sum, item) => sum + item.netPaid, 0),
        };

        return { data, totals, period: { startDate, endDate } };
    }

    async getTdsReceivableRegister(organizationId: string, startDate: string, endDate: string) {
        // TDS Receivable: TDS deducted by Customers (Sales Invoices)
        const query = this.salesInvoiceRepository.createQueryBuilder('inv')
            .innerJoinAndSelect('inv.customer', 'customer')
            .where('inv.organization_id = :organizationId', { organizationId })
            .andWhere('inv.status IN (:...statuses)', {
                statuses: [SalesInvoiceStatus.POSTED, SalesInvoiceStatus.PARTIALLY_PAID, SalesInvoiceStatus.PAID]
            })
            .andWhere('inv.invoice_date BETWEEN :startDate AND :endDate', { startDate, endDate })
            .andWhere('inv.tds_amount > 0')
            .orderBy('inv.invoice_date', 'ASC');

        const invoices = await query.getMany();

        const data = invoices.map(inv => {
            const isCreditNote = inv.type === SalesInvoiceType.CREDIT_NOTE;
            const multiplier = isCreditNote ? -1 : 1;

            return {
                date: inv.invoiceDate,
                bsDate: this.bsDateService.adToBs(inv.invoiceDate),
                invoiceNumber: inv.invoiceNumber,
                customerName: inv.customer.name,
                customerPan: inv.customer.panNumber || '',
                tdsCategoryId: inv.tdsCategoryId,
                baseAmount: Number(inv.subtotal) * multiplier,
                tdsAmount: Number(inv.tdsAmount) * multiplier,
                netReceived: Number(inv.totalAmount) * multiplier,
                isReversal: isCreditNote
            };
        });

        const totals = {
            baseAmount: data.reduce((sum, item) => sum + item.baseAmount, 0),
            tdsAmount: data.reduce((sum, item) => sum + item.tdsAmount, 0),
            netReceived: data.reduce((sum, item) => sum + item.netReceived, 0),
        };

        return { data, totals, period: { startDate, endDate } };
    }

    async generateTdsCertificateData(organizationId: string, vendorId: string, startDate: string, endDate: string) {
        const query = this.purchaseInvoiceRepository.createQueryBuilder('inv')
            .innerJoinAndSelect('inv.vendor', 'vendor')
            .where('inv.organization_id = :organizationId', { organizationId })
            .andWhere('inv.vendor_id = :vendorId', { vendorId })
            .andWhere('inv.status IN (:...statuses)', {
                statuses: [PurchaseInvoiceStatus.POSTED, PurchaseInvoiceStatus.PARTIALLY_PAID, PurchaseInvoiceStatus.PAID]
            })
            .andWhere('inv.invoice_date BETWEEN :startDate AND :endDate', { startDate, endDate })
            .andWhere('inv.tds_amount > 0')
            .orderBy('inv.invoice_date', 'ASC');

        const invoices = await query.getMany();

        if (invoices.length === 0) {
            return { message: 'No TDS deducted for this vendor in the given period.' };
        }

        const vendor = invoices[0].vendor;

        const details = invoices.map(inv => {
            const isDebitNote = inv.type === PurchaseInvoiceType.DEBIT_NOTE;
            const multiplier = isDebitNote ? -1 : 1;

            return {
                invoiceNumber: inv.invoiceNumber,
                invoiceDate: inv.invoiceDate,
                invoiceBsDate: this.bsDateService.adToBs(inv.invoiceDate),
                tdsCategory: inv.tdsCategoryId,
                amountPaid: Number(inv.subtotal) * multiplier,
                tdsDeducted: Number(inv.tdsAmount) * multiplier
            };
        });

        const totalAmountPaid = details.reduce((sum, d) => sum + d.amountPaid, 0);
        const totalTdsDeducted = details.reduce((sum, d) => sum + d.tdsDeducted, 0);

        return {
            certificateContext: {
                issueDate: new Date().toISOString().split('T')[0],
                issueBsDate: this.bsDateService.adToBs(new Date()),
                period: {
                    startDate,
                    endDate,
                    startBsDate: this.bsDateService.adToBs(startDate),
                    endBsDate: this.bsDateService.adToBs(endDate)
                },
                vendor: {
                    name: vendor.name,
                    pan: vendor.panNumber || 'N/A',
                    address: vendor.address || 'N/A'
                },
                totals: {
                    totalAmountPaid,
                    totalTdsDeducted
                }
            },
            details
        };
    }
}
