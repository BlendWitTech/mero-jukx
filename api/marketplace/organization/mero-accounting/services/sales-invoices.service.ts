import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In, ILike } from 'typeorm';
import { SalesInvoice, SalesInvoiceStatus, SalesInvoiceType, Customer } from '@src/database/entities/customers_sales_invoices.entity';
import { JournalEntry, JournalEntryStatus, JournalEntryLine } from '@src/database/entities/journal_entries.entity';
import { Account } from '@src/database/entities/accounts.entity';
import { AuditService } from './audit.service';

@Injectable()
export class SalesInvoicesService {
    constructor(
        @InjectRepository(SalesInvoice)
        private readonly invoiceRepository: Repository<SalesInvoice>,
        @InjectRepository(Customer)
        private readonly customerRepository: Repository<Customer>,
        @InjectRepository(Account)
        private readonly accountRepository: Repository<Account>,
        @InjectRepository(JournalEntry)
        private readonly journalEntryRepository: Repository<JournalEntry>,
        private readonly auditService: AuditService,
        private readonly dataSource: DataSource,
    ) { }

    private async generateInvoiceNumber(organizationId: string, type: SalesInvoiceType): Promise<string> {
        const lastInvoice = await this.invoiceRepository.findOne({
            where: { organizationId, type },
            order: { createdAt: 'DESC' }
        });

        const prefix = type === SalesInvoiceType.CREDIT_NOTE ? 'CN-' : 'SINV-';

        if (!lastInvoice) return `${prefix}0001`;

        const lastNumberMatch = lastInvoice.invoiceNumber.match(new RegExp(`^${prefix}(\\d+)`));
        const lastNumber = lastNumberMatch ? parseInt(lastNumberMatch[1]) : 0;
        const nextNumber = lastNumber + 1;

        return `${prefix}${nextNumber.toString().padStart(4, '0')}`;
    }

    private async generateJournalEntryNumber(organizationId: string, entityManager: any): Promise<string> {
        const lastEntry = await entityManager.findOne(JournalEntry, {
            where: { organizationId },
            order: { createdAt: 'DESC' }
        });

        if (!lastEntry) return 'JE-0001';

        const lastNumberMatch = lastEntry.entryNumber.match(/JE-(\d+)/);
        const lastNumber = lastNumberMatch ? parseInt(lastNumberMatch[1]) : 0;
        const nextNumber = lastNumber + 1;

        return `JE-${nextNumber.toString().padStart(4, '0')}`;
    }

    async findAll(organizationId: string, type?: SalesInvoiceType) {
        return this.invoiceRepository.find({
            where: { organizationId, ...(type && { type }) },
            relations: ['customer'],
            order: { invoiceDate: 'DESC', createdAt: 'DESC' }
        });
    }

    async findById(id: string, organizationId: string) {
        const invoice = await this.invoiceRepository.findOne({
            where: { id, organizationId },
            relations: ['customer', 'journalEntry', 'journalEntry.lines', 'journalEntry.lines.account']
        });
        if (!invoice) throw new NotFoundException('Sales invoice not found');
        return invoice;
    }

    async create(organizationId: string, data: any) {
        const type = data.type || SalesInvoiceType.INVOICE;
        const invoiceNumber = await this.generateInvoiceNumber(organizationId, type);
        const invoice = this.invoiceRepository.create({
            ...data,
            invoiceNumber,
            type,
            organizationId,
            status: SalesInvoiceStatus.DRAFT
        });
        return this.invoiceRepository.save(invoice);
    }

    async update(id: string, organizationId: string, data: {
        customerId?: string;
        invoiceDate?: string;
        dueDate?: string;
        items?: { description: string; quantity: number; rate: number }[];
        subtotal?: number;
        vatAmount?: number;
        tdsAmount?: number;
        totalAmount?: number;
    }) {
        const invoice = await this.invoiceRepository.findOne({ where: { id, organizationId } });
        if (!invoice) throw new NotFoundException('Sales invoice not found');
        if (invoice.status !== SalesInvoiceStatus.DRAFT) {
            throw new BadRequestException('Only DRAFT invoices can be edited');
        }
        Object.assign(invoice, data);
        return this.invoiceRepository.save(invoice);
    }

    async postInvoice(id: string, organizationId: string, userId: string, arAccountId: string, revenueAccountId: string, vatAccountId?: string, tdsReceivableAccountId?: string) {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            const invoice = await queryRunner.manager.findOne(SalesInvoice, {
                where: { id, organizationId },
                relations: ['customer']
            });

            if (!invoice) throw new NotFoundException('Invoice not found');
            if (invoice.status !== SalesInvoiceStatus.DRAFT) {
                throw new BadRequestException('Only DRAFT invoices can be posted');
            }

            const isCreditNote = invoice.type === SalesInvoiceType.CREDIT_NOTE;

            const lines: any[] = [
                {
                    accountId: arAccountId,
                    debit: isCreditNote ? 0 : invoice.totalAmount,
                    credit: isCreditNote ? invoice.totalAmount : 0,
                    description: `Accounts Receivable for ${isCreditNote ? 'credit note' : 'invoice'} ${invoice.invoiceNumber}`
                },
                {
                    accountId: revenueAccountId,
                    debit: isCreditNote ? invoice.subtotal : 0,
                    credit: isCreditNote ? 0 : invoice.subtotal,
                    description: `Revenue from ${isCreditNote ? 'credit note' : 'invoice'} ${invoice.invoiceNumber}`
                }
            ];

            // Add Discount line if applicable
            if (Number(invoice.discountAmount) > 0) {
                // Try to find a Discount Allowed account, or fallback to Revenue account as a Debit (contra-revenue)
                const discountAccount = await queryRunner.manager.findOne(Account, {
                    where: {
                        organizationId,
                        name: ILike('%Discount%')
                    }
                });

                lines.push({
                    accountId: discountAccount ? discountAccount.id : revenueAccountId,
                    debit: isCreditNote ? 0 : invoice.discountAmount,
                    credit: isCreditNote ? invoice.discountAmount : 0,
                    description: `Discount allowed on ${isCreditNote ? 'credit note' : 'invoice'} ${invoice.invoiceNumber}`
                });
            }

            // Add VAT line if applicable
            if (Number(invoice.vatAmount) > 0) {
                if (!vatAccountId) throw new BadRequestException(`VAT Account is required for ${isCreditNote ? 'credit notes' : 'invoices'} with VAT`);
                lines.push({
                    accountId: vatAccountId,
                    debit: isCreditNote ? invoice.vatAmount : 0,
                    credit: isCreditNote ? 0 : invoice.vatAmount,
                    description: `VAT Payable for ${isCreditNote ? 'credit note' : 'invoice'} ${invoice.invoiceNumber}`
                });
            }

            // Add TDS Receivable line if applicable
            // When a customer deducts TDS: DR TDS Receivable (government owes us)
            if (Number(invoice.tdsAmount) > 0) {
                if (!tdsReceivableAccountId) throw new BadRequestException(`TDS Receivable Account is required for ${isCreditNote ? 'credit notes' : 'invoices'} with TDS`);
                lines.push({
                    accountId: tdsReceivableAccountId,
                    debit: isCreditNote ? 0 : invoice.tdsAmount,
                    credit: isCreditNote ? invoice.tdsAmount : 0,
                    description: `TDS Receivable for ${isCreditNote ? 'credit note' : 'invoice'} ${invoice.invoiceNumber}`
                });
            }

            // 1. Create Journal Entry
            const entryNumber = await this.generateJournalEntryNumber(organizationId, queryRunner.manager);
            const journalEntry = queryRunner.manager.create(JournalEntry, {
                organizationId,
                entryNumber,
                entryDate: invoice.invoiceDate,
                narration: `Sales ${isCreditNote ? 'Credit Note' : 'Invoice'} ${invoice.invoiceNumber} to ${invoice.customer.name}`,
                createdBy: userId,
                status: JournalEntryStatus.DRAFT,
                referenceType: 'SALES_INVOICE',
                referenceId: invoice.id,
                lines
            } as any);

            const savedEntry = await queryRunner.manager.save(JournalEntry, journalEntry);

            // 2. Link Journal Entry to Invoice and update status
            invoice.status = SalesInvoiceStatus.POSTED;
            invoice.journalEntryId = savedEntry.id;
            await queryRunner.manager.save(SalesInvoice, invoice);

            // 3. Update Customer Balance
            const customer = invoice.customer;
            if (isCreditNote) {
                customer.currentBalance = Number(customer.currentBalance) - Number(invoice.totalAmount);
            } else {
                customer.currentBalance = Number(customer.currentBalance) + Number(invoice.totalAmount);
            }
            await queryRunner.manager.save(Customer, customer);

            // 4. Update Account Balances
            for (const line of savedEntry.lines) {
                const account = await queryRunner.manager.findOne(Account, { where: { id: line.accountId } });
                if (!account) throw new NotFoundException(`Account ${line.accountId} not found`);

                const isDebitNormal = ['ASSET', 'EXPENSE'].includes(account.accountType);
                const amount = isDebitNormal
                    ? Number(line.debit) - Number(line.credit)
                    : Number(line.credit) - Number(line.debit);

                account.balance = Number(account.balance) + amount;
                await queryRunner.manager.save(Account, account);
            }

            // Mark journal entry as POSTED
            savedEntry.status = JournalEntryStatus.POSTED;
            savedEntry.postedBy = userId;
            savedEntry.postedAt = new Date();
            await queryRunner.manager.save(JournalEntry, savedEntry);

            // Log the creation
            await this.auditService.log(
                organizationId,
                userId,
                'POST_SALES_INVOICE',
                'SalesInvoice',
                invoice.id,
                null,
                {
                    message: `Posted Sales ${isCreditNote ? 'Credit Note' : 'Invoice'} ${invoice.invoiceNumber} for ${invoice.customer.name} - Total: ${Number(invoice.totalAmount).toFixed(2)}`,
                    invoiceNumber: invoice.invoiceNumber,
                    customerName: invoice.customer.name,
                    totalAmount: invoice.totalAmount
                }
            );

            await queryRunner.commitTransaction();
            return invoice;
        } catch (err) {
            await queryRunner.rollbackTransaction();
            throw err;
        } finally {
            await queryRunner.release();
        }
    }

    async unpostInvoice(id: string, organizationId: string, userId: string) {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            console.log(`[SalesInvoicesService] Unposting invoice: ${id}`);
            const invoice = await queryRunner.manager.findOne(SalesInvoice, {
                where: { id, organizationId },
                relations: ['customer', 'journalEntry', 'journalEntry.lines']
            });

            if (!invoice) throw new NotFoundException('Invoice not found');
            if (invoice.status === SalesInvoiceStatus.DRAFT) {
                throw new BadRequestException('Invoice is already in DRAFT status');
            }

            // If there are payments, unpost them (set to DRAFT) instead of blocking
            const payments = await queryRunner.manager.find(JournalEntry, {
                where: {
                    organizationId,
                    referenceType: 'SALES_INVOICE_PAYMENT',
                    referenceId: invoice.id,
                    status: JournalEntryStatus.POSTED
                },
                relations: ['lines']
            });

            for (const payment of payments) {
                // Find amount to reverse
                const arLine = payment.lines.find(l => Number(l.credit) > 0);
                const amount = arLine ? Number(arLine.credit) : 0;

                // Reverse Account Balances
                for (const line of payment.lines) {
                    const account = await queryRunner.manager.findOne(Account, { where: { id: line.accountId } });
                    if (account) {
                        const isDebitNormal = ['ASSET', 'EXPENSE'].includes(account.accountType);
                        const delta = isDebitNormal
                            ? Number(line.debit) - Number(line.credit)
                            : Number(line.credit) - Number(line.debit);
                        account.balance = Number(account.balance) - delta;
                        await queryRunner.manager.save(Account, account);
                    }
                }

                // Update Invoice paidAmount (though it will be draft anyway)
                invoice.paidAmount = Number(invoice.paidAmount) - amount;

                // Update Customer Balance
                if (invoice.customer) {
                    invoice.customer.currentBalance = Number(invoice.customer.currentBalance) + amount;
                    await queryRunner.manager.save(Customer, invoice.customer);
                }

                // Set Payment to DRAFT
                payment.status = JournalEntryStatus.DRAFT;
                await queryRunner.manager.save(JournalEntry, payment);
            }

            const journalEntry = invoice.journalEntry;

            // 1. Clear status and JE reference on invoice FIRST to avoid FK violations
            invoice.status = SalesInvoiceStatus.DRAFT;
            invoice.journalEntryId = null;
            await queryRunner.manager.save(SalesInvoice, invoice);

            if (journalEntry) {
                // 2. Reverse Account Balances
                for (const line of journalEntry.lines) {
                    const account = await queryRunner.manager.findOne(Account, { where: { id: line.accountId } });
                    if (account) {
                        const isDebitNormal = ['ASSET', 'EXPENSE'].includes(account.accountType);
                        const amountToReverse = isDebitNormal
                            ? Number(line.debit) - Number(line.credit)
                            : Number(line.credit) - Number(line.debit);
                        account.balance = Number(account.balance) - amountToReverse;
                        await queryRunner.manager.save(Account, account);
                    }
                }

                // 3. Update Customer Balance
                const customer = invoice.customer;
                if (customer) {
                    if (invoice.type === SalesInvoiceType.CREDIT_NOTE) {
                        customer.currentBalance = Number(customer.currentBalance) + Number(invoice.totalAmount);
                    } else {
                        customer.currentBalance = Number(customer.currentBalance) - Number(invoice.totalAmount);
                    }
                    await queryRunner.manager.save(Customer, customer);
                }

                // 4. Remove Journal Entry
                await queryRunner.manager.remove(JournalEntry, journalEntry);
            }

            await queryRunner.commitTransaction();
            return invoice;
        } catch (err) {
            console.error(`[SalesInvoicesService] Unpost failed:`, err);
            await queryRunner.rollbackTransaction();
            throw err;
        } finally {
            await queryRunner.release();
        }
    }

    async recordPayment(id: string, organizationId: string, userId: string, data: {
        amount: number;
        paymentDate: string;
        bankAccountId: string;
        arAccountId: string;
        narration?: string;
    }) {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            const invoice = await queryRunner.manager.findOne(SalesInvoice, {
                where: { id, organizationId },
                relations: ['customer']
            });

            if (!invoice) throw new NotFoundException('Invoice not found');
            if (![SalesInvoiceStatus.POSTED, SalesInvoiceStatus.PARTIALLY_PAID].includes(invoice.status)) {
                throw new BadRequestException('Payment can only be recorded against a Posted or Partially Paid invoice');
            }

            const paidSoFar = Number(invoice.paidAmount || 0);
            const totalAmount = Number(invoice.totalAmount);
            const remaining = totalAmount - paidSoFar;

            if (Number(data.amount) <= 0) throw new BadRequestException('Payment amount must be greater than zero');
            if (Number(data.amount) > remaining) {
                throw new BadRequestException(`Payment amount (${data.amount}) exceeds balance due (${remaining.toFixed(2)})`);
            }

            // Create receipt JE: DR Bank/Cash, CR Accounts Receivable
            const entryNumber = await this.generateJournalEntryNumber(organizationId, queryRunner.manager);
            const narration = data.narration || `Receipt for ${invoice.invoiceNumber} - ${invoice.customer?.name}`;

            const journalEntry = queryRunner.manager.create(JournalEntry, {
                organizationId,
                entryNumber,
                entryDate: new Date(data.paymentDate),
                narration,
                createdBy: userId,
                status: JournalEntryStatus.DRAFT,
                referenceType: 'SALES_INVOICE_PAYMENT',
                referenceId: invoice.id,
                lines: [
                    {
                        accountId: data.bankAccountId,
                        debit: data.amount,
                        credit: 0,
                        description: `Cash/Bank receipt for ${invoice.invoiceNumber}`
                    },
                    {
                        accountId: data.arAccountId,
                        debit: 0,
                        credit: data.amount,
                        description: `Clearing AR for ${invoice.invoiceNumber}`
                    }
                ]
            } as any) as JournalEntry;

            const savedEntry = await queryRunner.manager.save(JournalEntry, journalEntry);

            // Update account balances
            for (const line of savedEntry.lines) {
                const account = await queryRunner.manager.findOne(Account, { where: { id: line.accountId } });
                if (!account) continue;
                const isDebitNormal = ['ASSET', 'EXPENSE'].includes(account.accountType);
                const delta = isDebitNormal
                    ? Number(line.debit) - Number(line.credit)
                    : Number(line.credit) - Number(line.debit);
                account.balance = Number(account.balance) + delta;
                await queryRunner.manager.save(Account, account);
            }

            // Post the journal entry
            savedEntry.status = JournalEntryStatus.POSTED;
            savedEntry.postedBy = userId;
            savedEntry.postedAt = new Date();
            await queryRunner.manager.save(JournalEntry, savedEntry);

            // Update invoice paid amount and status
            const newPaidAmount = paidSoFar + Number(data.amount);
            invoice.paidAmount = newPaidAmount;
            invoice.status = newPaidAmount >= totalAmount
                ? SalesInvoiceStatus.PAID
                : SalesInvoiceStatus.PARTIALLY_PAID;
            await queryRunner.manager.save(SalesInvoice, invoice);

            // Reduce customer outstanding balance
            if (invoice.customer) {
                invoice.customer.currentBalance = Number(invoice.customer.currentBalance) - Number(data.amount);
                await queryRunner.manager.save(Customer, invoice.customer);
            }

            await queryRunner.commitTransaction();
            return invoice;
        } catch (err) {
            await queryRunner.rollbackTransaction();
            throw err;
        } finally {
            await queryRunner.release();
        }
    }

    async updatePayment(paymentId: string, organizationId: string, data: { amount?: number; narration?: string }, userId: string) {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            const journalEntry = await queryRunner.manager.findOne(JournalEntry, {
                where: { id: paymentId, organizationId, referenceType: 'SALES_INVOICE_PAYMENT' },
                relations: ['lines']
            });

            if (!journalEntry) throw new NotFoundException('Payment record not found');
            if (journalEntry.status !== JournalEntryStatus.DRAFT) {
                throw new BadRequestException('Can only update payments in DRAFT status');
            }

            if (data.narration !== undefined) {
                journalEntry.narration = data.narration;
            }

            if (data.amount !== undefined) {
                const newAmount = Number(data.amount);
                // Update JE lines
                for (const line of journalEntry.lines) {
                    if (Number(line.debit) > 0) {
                        line.debit = newAmount;
                    } else if (Number(line.credit) > 0) {
                        line.credit = newAmount;
                    }
                    await queryRunner.manager.save(JournalEntryLine, line);
                }
            }

            await queryRunner.manager.save(JournalEntry, journalEntry);

            await queryRunner.commitTransaction();
            return { success: true };
        } catch (err) {
            await queryRunner.rollbackTransaction();
            throw err;
        } finally {
            await queryRunner.release();
        }
    }

    async unpostPayment(paymentId: string, organizationId: string, userId: string) {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            const journalEntry = await queryRunner.manager.findOne(JournalEntry, {
                where: { id: paymentId, organizationId, referenceType: 'SALES_INVOICE_PAYMENT' },
                relations: ['lines']
            });

            if (!journalEntry) throw new NotFoundException('Payment record not found');
            if (journalEntry.status !== JournalEntryStatus.POSTED) {
                throw new BadRequestException('Payment is already in DRAFT status');
            }

            const invoice = await queryRunner.manager.findOne(SalesInvoice, {
                where: { id: journalEntry.referenceId, organizationId },
                relations: ['customer']
            });

            if (!invoice) throw new NotFoundException('Associated invoice not found');

            const arLine = journalEntry.lines.find(l => Number(l.credit) > 0);
            const amount = arLine ? Number(arLine.credit) : 0;

            // Reverse Account Balances
            for (const line of journalEntry.lines) {
                const account = await queryRunner.manager.findOne(Account, { where: { id: line.accountId } });
                if (account) {
                    const isDebitNormal = ['ASSET', 'EXPENSE'].includes(account.accountType);
                    const delta = isDebitNormal
                        ? Number(line.debit) - Number(line.credit)
                        : Number(line.credit) - Number(line.debit);
                    account.balance = Number(account.balance) - delta;
                    await queryRunner.manager.save(Account, account);
                }
            }

            // Update Invoice
            invoice.paidAmount = Number(invoice.paidAmount) - amount;
            if (Number(invoice.paidAmount) <= 0) {
                invoice.status = SalesInvoiceStatus.POSTED;
            } else {
                invoice.status = SalesInvoiceStatus.PARTIALLY_PAID;
            }
            await queryRunner.manager.save(SalesInvoice, invoice);

            // Update Customer Balance
            if (invoice.customer) {
                invoice.customer.currentBalance = Number(invoice.customer.currentBalance) + amount;
                await queryRunner.manager.save(Customer, invoice.customer);
            }

            // Set JE to DRAFT
            journalEntry.status = JournalEntryStatus.DRAFT;
            await queryRunner.manager.save(JournalEntry, journalEntry);

            await queryRunner.commitTransaction();
            return { success: true };
        } catch (err) {
            await queryRunner.rollbackTransaction();
            throw err;
        } finally {
            await queryRunner.release();
        }
    }

    async postPayment(paymentId: string, organizationId: string, userId: string) {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            const journalEntry = await queryRunner.manager.findOne(JournalEntry, {
                where: { id: paymentId, organizationId, referenceType: 'SALES_INVOICE_PAYMENT' },
                relations: ['lines']
            });

            if (!journalEntry) throw new NotFoundException('Payment record not found');
            if (journalEntry.status === JournalEntryStatus.POSTED) {
                throw new BadRequestException('Payment is already posted');
            }

            const invoice = await queryRunner.manager.findOne(SalesInvoice, {
                where: { id: journalEntry.referenceId, organizationId },
                relations: ['customer']
            });

            if (!invoice) throw new NotFoundException('Associated invoice not found');

            const arLine = journalEntry.lines.find(l => Number(l.credit) > 0);
            const amount = arLine ? Number(arLine.credit) : 0;

            // Check if invoice total would be exceeded? (Maybe allow for now)

            // Apply Account Balances
            for (const line of journalEntry.lines) {
                const account = await queryRunner.manager.findOne(Account, { where: { id: line.accountId } });
                if (account) {
                    const isDebitNormal = ['ASSET', 'EXPENSE'].includes(account.accountType);
                    const delta = isDebitNormal
                        ? Number(line.debit) - Number(line.credit)
                        : Number(line.credit) - Number(line.debit);
                    account.balance = Number(account.balance) + delta;
                    await queryRunner.manager.save(Account, account);
                }
            }

            // Update Invoice
            invoice.paidAmount = Number(invoice.paidAmount) + amount;
            if (Number(invoice.paidAmount) >= Number(invoice.totalAmount)) {
                invoice.status = SalesInvoiceStatus.PAID;
            } else {
                invoice.status = SalesInvoiceStatus.PARTIALLY_PAID;
            }
            await queryRunner.manager.save(SalesInvoice, invoice);

            // Update Customer Balance
            if (invoice.customer) {
                invoice.customer.currentBalance = Number(invoice.customer.currentBalance) - amount;
                await queryRunner.manager.save(Customer, invoice.customer);
            }

            // Set JE to POSTED
            journalEntry.status = JournalEntryStatus.POSTED;
            journalEntry.postedBy = userId;
            journalEntry.postedAt = new Date();
            await queryRunner.manager.save(JournalEntry, journalEntry);

            await queryRunner.commitTransaction();
            return { success: true };
        } catch (err) {
            await queryRunner.rollbackTransaction();
            throw err;
        } finally {
            await queryRunner.release();
        }
    }

    async deletePayment(paymentId: string, organizationId: string, userId: string) {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            const journalEntry = await queryRunner.manager.findOne(JournalEntry, {
                where: { id: paymentId, organizationId, referenceType: 'SALES_INVOICE_PAYMENT' },
                relations: ['lines']
            });

            if (!journalEntry) throw new NotFoundException('Payment record not found');

            const invoice = await queryRunner.manager.findOne(SalesInvoice, {
                where: { id: journalEntry.referenceId, organizationId },
                relations: ['customer']
            });

            if (!invoice) throw new NotFoundException('Associated invoice not found');

            const arLine = journalEntry.lines.find(l => Number(l.credit) > 0);
            const amount = arLine ? Number(arLine.credit) : 0;

            // Reverse Account Balances ONLY IF it was POSTED
            if (journalEntry.status === JournalEntryStatus.POSTED) {
                for (const line of journalEntry.lines) {
                    const account = await queryRunner.manager.findOne(Account, { where: { id: line.accountId } });
                    if (account) {
                        const isDebitNormal = ['ASSET', 'EXPENSE'].includes(account.accountType);
                        const delta = isDebitNormal
                            ? Number(line.debit) - Number(line.credit)
                            : Number(line.credit) - Number(line.debit);
                        account.balance = Number(account.balance) - delta;
                        await queryRunner.manager.save(Account, account);
                    }
                }

                // Update Invoice
                invoice.paidAmount = Number(invoice.paidAmount) - amount;
                if (Number(invoice.paidAmount) <= 0) {
                    invoice.status = SalesInvoiceStatus.POSTED;
                } else {
                    invoice.status = SalesInvoiceStatus.PARTIALLY_PAID;
                }
                await queryRunner.manager.save(SalesInvoice, invoice);

                // Update Customer Balance
                if (invoice.customer) {
                    invoice.customer.currentBalance = Number(invoice.customer.currentBalance) + amount;
                    await queryRunner.manager.save(Customer, invoice.customer);
                }
            }

            // Remove Journal Entry
            await queryRunner.manager.remove(JournalEntry, journalEntry);

            await queryRunner.commitTransaction();
            return { success: true };
        } catch (err) {
            await queryRunner.rollbackTransaction();
            throw err;
        } finally {
            await queryRunner.release();
        }
    }

    async getCustomerStatement(customerId: string, organizationId: string) {
        const customer = await this.customerRepository.findOne({ where: { id: customerId, organizationId } });
        if (!customer) throw new NotFoundException('Customer not found');

        const invoices = await this.invoiceRepository.find({
            where: { customerId, organizationId },
            order: { invoiceDate: 'ASC', createdAt: 'ASC' }
        });

        // Fetch all payments for these invoices
        const invoiceIds = invoices.map(i => i.id);
        const payments = invoiceIds.length > 0 ? await this.dataSource.manager.find(JournalEntry, {
            where: {
                organizationId,
                referenceType: 'SALES_INVOICE_PAYMENT',
                referenceId: In(invoiceIds)
            },
            relations: ['lines'],
            order: { entryDate: 'DESC' }
        }) : [];

        const rows = invoices.map(inv => {
            const totalAmount = Number(inv.totalAmount);
            const paidAmount = Number(inv.paidAmount || 0);
            const balanceDue = totalAmount - paidAmount;
            return {
                id: inv.id,
                invoiceNumber: inv.invoiceNumber,
                invoiceDate: inv.invoiceDate,
                dueDate: inv.dueDate,
                totalAmount,
                paidAmount,
                balanceDue,
                status: inv.status,
                isOverdue: inv.status !== SalesInvoiceStatus.PAID && new Date(inv.dueDate) < new Date(),
                payments: payments
                    .filter(p => p.referenceId === inv.id)
                    .map(p => {
                        const amountLine = p.lines.find(l => Number(l.credit) > 0);
                        return {
                            id: p.id,
                            date: p.entryDate,
                            number: p.entryNumber,
                            amount: amountLine ? Number(amountLine.credit) : 0,
                            narration: p.narration,
                            status: p.status
                        };
                    })
            };
        });

        return {
            customer: { id: customer.id, name: customer.name, phone: customer.phone, email: customer.email },
            rows,
            totalBilled: rows.reduce((s, r) => s + r.totalAmount, 0),
            totalPaid: rows.reduce((s, r) => s + r.paidAmount, 0),
            totalDue: rows.reduce((s, r) => s + r.balanceDue, 0),
        };
    }

    async getPayments(id: string, organizationId: string) {
        const payments = await this.journalEntryRepository.find({
            where: { referenceId: id, organizationId, referenceType: 'SALES_INVOICE_PAYMENT' },
            relations: ['lines', 'lines.account'],
            order: { createdAt: 'DESC' }
        });

        return payments.map(p => {
            const amountLine = p.lines?.find(l => Number(l.credit) > 0);
            return {
                id: p.id,
                entryNumber: p.entryNumber,
                entryDate: p.entryDate,
                status: p.status,
                narration: p.narration,
                amount: amountLine ? Number(amountLine.credit) : 0,
                createdAt: p.createdAt
            };
        });
    }
}
