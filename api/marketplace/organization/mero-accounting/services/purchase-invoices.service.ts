import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In, IsNull, ILike } from 'typeorm';
import { PurchaseInvoice, PurchaseInvoiceStatus, PurchaseInvoiceType, Vendor } from '@src/database/entities/vendors_purchase_invoices.entity';
import { JournalEntry, JournalEntryStatus, JournalEntryLine } from '@src/database/entities/journal_entries.entity';
import { Account } from '@src/database/entities/accounts.entity';
import { AuditService } from './audit.service';
import { FixedAsset, AssetStatus, DepreciationMethod } from '@src/database/entities/fixed_assets.entity';

@Injectable()
export class PurchaseInvoicesService {
    constructor(
        @InjectRepository(PurchaseInvoice)
        private readonly invoiceRepository: Repository<PurchaseInvoice>,
        @InjectRepository(Vendor)
        private readonly vendorRepository: Repository<Vendor>,
        @InjectRepository(Account)
        private readonly accountRepository: Repository<Account>,
        @InjectRepository(JournalEntry)
        private readonly journalEntryRepository: Repository<JournalEntry>,
        @InjectRepository(FixedAsset)
        private readonly fixedAssetRepository: Repository<FixedAsset>,
        private readonly auditService: AuditService,
        private readonly dataSource: DataSource,
    ) { }

    private async generateInvoiceNumber(organizationId: string, type: PurchaseInvoiceType): Promise<string> {
        const lastInvoice = await this.invoiceRepository.findOne({
            where: { organizationId, type },
            order: { createdAt: 'DESC' }
        });

        const prefix = type === PurchaseInvoiceType.DEBIT_NOTE ? 'DN-' : 'PINV-';

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

    async findAll(organizationId: string, type?: PurchaseInvoiceType) {
        return this.invoiceRepository.find({
            where: { organizationId, ...(type && { type }) },
            relations: ['vendor'],
            order: { invoiceDate: 'DESC', createdAt: 'DESC' }
        });
    }

    async findById(id: string, organizationId: string) {
        const invoice = await this.invoiceRepository.findOne({
            where: { id, organizationId },
            relations: ['vendor', 'journalEntry', 'journalEntry.lines', 'journalEntry.lines.account']
        });
        if (!invoice) throw new NotFoundException('Purchase invoice not found');
        return invoice;
    }

    async create(organizationId: string, data: any) {
        const type = data.type || PurchaseInvoiceType.INVOICE;
        const invoiceNumber = await this.generateInvoiceNumber(organizationId, type);
        const invoice = this.invoiceRepository.create({
            ...data,
            invoiceNumber,
            type,
            organizationId,
            status: PurchaseInvoiceStatus.DRAFT
        });
        return this.invoiceRepository.save(invoice);
    }

    async update(id: string, organizationId: string, data: {
        vendorId?: string;
        invoiceNumber?: string;
        invoiceDate?: string;
        dueDate?: string;
        items?: { description: string; quantity: number; rate: number }[];
        subtotal?: number;
        vatAmount?: number;
        tdsAmount?: number;
        totalAmount?: number;
    }) {
        const invoice = await this.invoiceRepository.findOne({ where: { id, organizationId } });
        if (!invoice) throw new NotFoundException('Purchase invoice not found');
        if (invoice.status !== PurchaseInvoiceStatus.DRAFT) {
            throw new BadRequestException('Only DRAFT invoices can be edited');
        }
        Object.assign(invoice, data);
        return this.invoiceRepository.save(invoice);
    }

    async markAsReviewed(id: string, organizationId: string, userId: string) {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            const invoice = await queryRunner.manager.findOne(PurchaseInvoice, {
                where: { id, organizationId }
            });

            if (!invoice) throw new NotFoundException('Invoice not found');

            if (invoice.status !== PurchaseInvoiceStatus.DRAFT) {
                throw new BadRequestException('Only DRAFT invoices can be marked as REVIEWED');
            }

            invoice.status = PurchaseInvoiceStatus.REVIEWED;
            await queryRunner.manager.save(PurchaseInvoice, invoice);

            await this.auditService.log(
                organizationId,
                userId,
                'REVIEW_PURCHASE_INVOICE',
                'PurchaseInvoice',
                invoice.id,
                null,
                { message: `Marked Purchase Invoice ${invoice.invoiceNumber} as REVIEWED` }
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

    async approveInvoice(id: string, organizationId: string, userId: string) {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            const invoice = await queryRunner.manager.findOne(PurchaseInvoice, {
                where: { id, organizationId }
            });

            if (!invoice) throw new NotFoundException('Invoice not found');

            if (invoice.status !== PurchaseInvoiceStatus.REVIEWED) {
                throw new BadRequestException('Only REVIEWED invoices can be APPROVED');
            }

            invoice.status = PurchaseInvoiceStatus.APPROVED;
            await queryRunner.manager.save(PurchaseInvoice, invoice);

            await this.auditService.log(
                organizationId,
                userId,
                'APPROVE_PURCHASE_INVOICE',
                'PurchaseInvoice',
                invoice.id,
                null,
                { message: `Approved Purchase Invoice ${invoice.invoiceNumber}` }
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

    async postInvoice(id: string, organizationId: string, userId: string, apAccountId: string, expenseAccountId: string, vatAccountId?: string, tdsAccountId?: string) {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            const invoice = await queryRunner.manager.findOne(PurchaseInvoice, {
                where: { id, organizationId },
                relations: ['vendor']
            });

            if (!invoice) throw new NotFoundException('Invoice not found');
            if (invoice.status !== PurchaseInvoiceStatus.APPROVED) {
                throw new BadRequestException('Only APPROVED invoices can be posted');
            }

            const tdsAmount = Number(invoice.tdsAmount || 0);
            const netPayable = Number(invoice.totalAmount);

            const isDebitNote = invoice.type === PurchaseInvoiceType.DEBIT_NOTE;

            const lines: any[] = [
                {
                    accountId: expenseAccountId,
                    debit: isDebitNote ? 0 : invoice.subtotal,
                    credit: isDebitNote ? invoice.subtotal : 0,
                    description: `Expense for ${isDebitNote ? 'debit note' : 'invoice'} ${invoice.invoiceNumber}`
                },
                {
                    accountId: apAccountId,
                    debit: isDebitNote ? netPayable : 0,
                    credit: isDebitNote ? 0 : netPayable,
                    description: `Accounts Payable (Net) for ${isDebitNote ? 'debit note' : 'invoice'} ${invoice.invoiceNumber}`
                }
            ];

            // Add Discount line if applicable
            if (Number(invoice.discountAmount) > 0) {
                // Try to find a Discount Received account, or fallback to Expense account as a Credit (contra-expense)
                const discountAccount = await queryRunner.manager.findOne(Account, {
                    where: {
                        organizationId,
                        name: ILike('%Discount%')
                    }
                });

                lines.push({
                    accountId: discountAccount ? discountAccount.id : expenseAccountId,
                    debit: isDebitNote ? invoice.discountAmount : 0,
                    credit: isDebitNote ? 0 : invoice.discountAmount,
                    description: `Discount received on ${isDebitNote ? 'debit note' : 'invoice'} ${invoice.invoiceNumber}`
                });
            }

            // Add VAT line if applicable
            if (Number(invoice.vatAmount) > 0) {
                if (!vatAccountId) throw new BadRequestException(`VAT Account is required for ${isDebitNote ? 'debit notes' : 'invoices'} with VAT`);
                lines.push({
                    accountId: vatAccountId,
                    debit: isDebitNote ? 0 : invoice.vatAmount,
                    credit: isDebitNote ? invoice.vatAmount : 0,
                    description: `Input VAT for ${isDebitNote ? 'debit note' : 'invoice'} ${invoice.invoiceNumber}`
                });
            }

            // Add TDS line if applicable
            if (tdsAmount > 0) {
                if (!tdsAccountId) throw new BadRequestException(`TDS Account is required for ${isDebitNote ? 'debit notes' : 'invoices'} with TDS`);
                lines.push({
                    accountId: tdsAccountId,
                    debit: isDebitNote ? tdsAmount : 0,
                    credit: isDebitNote ? 0 : tdsAmount,
                    description: `TDS Payable from ${isDebitNote ? 'debit note' : 'invoice'} ${invoice.invoiceNumber}`
                });
            }

            // 1. Create Journal Entry
            const entryNumber = await this.generateJournalEntryNumber(organizationId, queryRunner.manager);
            const journalEntry = queryRunner.manager.create(JournalEntry, {
                organizationId,
                entryNumber,
                entryDate: invoice.invoiceDate,
                narration: `Purchase ${isDebitNote ? 'Debit Note' : 'Invoice'} ${invoice.invoiceNumber} from ${invoice.vendor.name}`,
                createdBy: userId,
                status: JournalEntryStatus.DRAFT,
                referenceType: 'PURCHASE_INVOICE',
                referenceId: invoice.id,
                lines
            } as any) as unknown as JournalEntry;

            const savedEntry = await queryRunner.manager.save(JournalEntry, journalEntry);

            // 2. Link Journal Entry to Invoice and update status
            invoice.status = PurchaseInvoiceStatus.POSTED;
            invoice.journalEntryId = savedEntry.id;
            await queryRunner.manager.save(PurchaseInvoice, invoice);

            // 3. Update Vendor Balance
            const vendor = invoice.vendor;
            if (isDebitNote) {
                vendor.currentBalance = Number(vendor.currentBalance) - Number(invoice.totalAmount);
            } else {
                vendor.currentBalance = Number(vendor.currentBalance) + Number(invoice.totalAmount);
            }
            await queryRunner.manager.save(Vendor, vendor);

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

            // 5. Auto-create Fixed Asset records for any line items marked as fixed assets
            const items: any[] = Array.isArray(invoice.items) ? invoice.items : [];
            const fixedAssetItems = items.filter((item: any) => item.isFixedAsset === true);

            for (const item of fixedAssetItems) {
                // Find the Fixed Assets parent account (1300 or first ASSET account with 'Fixed' in name)
                const assetAccount = await queryRunner.manager.findOne(Account, {
                    where: [
                        { organizationId, code: '1300' },
                        { organizationId: IsNull(), isSystem: true, code: '1300' }
                    ]
                }) ?? await queryRunner.manager.findOne(Account, {
                    where: [{ organizationId, accountType: 'ASSET' as any }],
                    order: { code: 'ASC' }
                });

                const depExpenseAccount = await queryRunner.manager.findOne(Account, {
                    where: [
                        { organizationId, code: '5200' },
                        { organizationId: IsNull(), isSystem: true, code: '5200' }
                    ]
                });

                const accumDepAccount = await queryRunner.manager.findOne(Account, {
                    where: [
                        { organizationId, code: '1390' },
                        { organizationId: IsNull(), isSystem: true, code: '1390' }
                    ]
                });

                if (assetAccount && depExpenseAccount && accumDepAccount) {
                    const fixedAsset = queryRunner.manager.create(FixedAsset, {
                        organizationId,
                        name: item.assetName || item.description,
                        category: item.assetCategory || null,
                        purchaseDate: invoice.invoiceDate,
                        purchaseCost: Number(item.quantity) * Number(item.rate),
                        salvageValue: 0,
                        usefulLifeYears: item.usefulLifeYears || 5,
                        depreciationMethod: (item.depreciationMethod as DepreciationMethod) || DepreciationMethod.STRAIGHT_LINE,
                        depreciationRate: item.depreciationRate || null,
                        accumulatedDepreciation: 0,
                        bookValue: Number(item.quantity) * Number(item.rate),
                        status: AssetStatus.ACTIVE,
                        assetAccountId: assetAccount.id,
                        depreciationExpenseAccountId: depExpenseAccount.id,
                        accumulatedDepreciationAccountId: accumDepAccount.id,
                        sourceInvoiceId: invoice.id,
                    });
                    await queryRunner.manager.save(FixedAsset, fixedAsset);
                }
            }

            // Log the creation
            await this.auditService.log(
                organizationId,
                userId,
                'POST_PURCHASE_INVOICE',
                'PurchaseInvoice',
                invoice.id,
                null,
                {
                    message: `Recorded Purchase ${isDebitNote ? 'Debit Note' : 'Invoice'} ${invoice.invoiceNumber} from ${invoice.vendor.name} - Total: ${Number(invoice.totalAmount).toFixed(2)}`,
                    invoiceNumber: invoice.invoiceNumber,
                    vendorName: invoice.vendor.name,
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
            console.log(`[PurchaseInvoicesService] Unposting bill: ${id}`);
            const invoice = await queryRunner.manager.findOne(PurchaseInvoice, {
                where: { id, organizationId },
                relations: ['vendor', 'journalEntry', 'journalEntry.lines']
            });

            if (!invoice) throw new NotFoundException('Invoice not found');
            if (invoice.status === PurchaseInvoiceStatus.DRAFT) {
                throw new BadRequestException('Invoice is already in DRAFT status');
            }

            // If there are payments, unpost them (set to DRAFT) instead of blocking
            const payments = await queryRunner.manager.find(JournalEntry, {
                where: {
                    organizationId,
                    referenceType: 'PURCHASE_INVOICE_PAYMENT',
                    referenceId: invoice.id,
                    status: JournalEntryStatus.POSTED
                },
                relations: ['lines']
            });

            for (const payment of payments) {
                // Find amount to reverse
                const apLine = payment.lines.find(l => Number(l.debit) > 0);
                const amount = apLine ? Number(apLine.debit) : 0;

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

                // Update Invoice paidAmount
                invoice.paidAmount = Number(invoice.paidAmount) - amount;

                // Update Vendor Balance
                if (invoice.vendor) {
                    invoice.vendor.currentBalance = Number(invoice.vendor.currentBalance) + amount;
                    await queryRunner.manager.save(Vendor, invoice.vendor);
                }

                // Set Payment to DRAFT
                payment.status = JournalEntryStatus.DRAFT;
                await queryRunner.manager.save(JournalEntry, payment);
            }

            const journalEntry = invoice.journalEntry;

            // 1. Clear status and JE reference on invoice FIRST
            invoice.status = PurchaseInvoiceStatus.DRAFT;
            invoice.journalEntryId = null;
            await queryRunner.manager.save(PurchaseInvoice, invoice);

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

                // 3. Update Vendor Balance
                const vendor = invoice.vendor;
                if (vendor) {
                    if (invoice.type === PurchaseInvoiceType.DEBIT_NOTE) {
                        vendor.currentBalance = Number(vendor.currentBalance) + Number(invoice.totalAmount);
                    } else {
                        vendor.currentBalance = Number(vendor.currentBalance) - Number(invoice.totalAmount);
                    }
                    await queryRunner.manager.save(Vendor, vendor);
                }

                // 4. Remove Journal Entry
                await queryRunner.manager.remove(JournalEntry, journalEntry);
            }

            await queryRunner.commitTransaction();
            return invoice;
        } catch (err) {
            console.error(`[PurchaseInvoicesService] Unpost failed:`, err);
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
        apAccountId: string;
        narration?: string;
    }) {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            const invoice = await queryRunner.manager.findOne(PurchaseInvoice, {
                where: { id, organizationId },
                relations: ['vendor']
            });

            if (!invoice) throw new NotFoundException('Invoice not found');
            if (![PurchaseInvoiceStatus.POSTED, PurchaseInvoiceStatus.PARTIALLY_PAID].includes(invoice.status)) {
                throw new BadRequestException('Payment can only be recorded against a Posted or Partially Paid invoice');
            }

            const paidSoFar = Number(invoice.paidAmount || 0);
            const totalAmount = Number(invoice.totalAmount);
            const remaining = totalAmount - paidSoFar;

            if (Number(data.amount) <= 0) throw new BadRequestException('Payment amount must be greater than zero');
            if (Number(data.amount) > remaining) {
                throw new BadRequestException(`Payment amount (${data.amount}) exceeds balance due (${remaining.toFixed(2)})`);
            }

            // Create payment JE: DR Accounts Payable, CR Bank/Cash
            const entryNumber = await this.generateJournalEntryNumber(organizationId, queryRunner.manager);
            const narration = data.narration || `Payment for ${invoice.invoiceNumber} - ${invoice.vendor?.name}`;

            const journalEntry = queryRunner.manager.create(JournalEntry, {
                organizationId,
                entryNumber,
                entryDate: new Date(data.paymentDate),
                narration,
                createdBy: userId,
                status: JournalEntryStatus.DRAFT,
                referenceType: 'PURCHASE_INVOICE_PAYMENT',
                referenceId: invoice.id,
                lines: [
                    {
                        accountId: data.apAccountId,
                        debit: data.amount,
                        credit: 0,
                        description: `Clearing AP for ${invoice.invoiceNumber}`
                    },
                    {
                        accountId: data.bankAccountId,
                        debit: 0,
                        credit: data.amount,
                        description: `Cash/Bank payment for ${invoice.invoiceNumber}`
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
                ? PurchaseInvoiceStatus.PAID
                : PurchaseInvoiceStatus.PARTIALLY_PAID;
            await queryRunner.manager.save(PurchaseInvoice, invoice);

            // Reduce vendor outstanding balance
            if (invoice.vendor) {
                invoice.vendor.currentBalance = Number(invoice.vendor.currentBalance) - Number(data.amount);
                await queryRunner.manager.save(Vendor, invoice.vendor);
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
                where: { id: paymentId, organizationId, referenceType: 'PURCHASE_INVOICE_PAYMENT' },
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
                where: { id: paymentId, organizationId, referenceType: 'PURCHASE_INVOICE_PAYMENT' },
                relations: ['lines']
            });

            if (!journalEntry) throw new NotFoundException('Payment record not found');
            if (journalEntry.status !== JournalEntryStatus.POSTED) {
                throw new BadRequestException('Payment is already in DRAFT status');
            }

            const invoice = await queryRunner.manager.findOne(PurchaseInvoice, {
                where: { id: journalEntry.referenceId, organizationId },
                relations: ['vendor']
            });

            if (!invoice) throw new NotFoundException('Associated invoice not found');

            const apLine = journalEntry.lines.find(l => Number(l.debit) > 0);
            const amount = apLine ? Number(apLine.debit) : 0;

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
                invoice.status = PurchaseInvoiceStatus.POSTED;
            } else {
                invoice.status = PurchaseInvoiceStatus.PARTIALLY_PAID;
            }
            await queryRunner.manager.save(PurchaseInvoice, invoice);

            // Update Vendor Balance
            if (invoice.vendor) {
                invoice.vendor.currentBalance = Number(invoice.vendor.currentBalance) + amount;
                await queryRunner.manager.save(Vendor, invoice.vendor);
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
                where: { id: paymentId, organizationId, referenceType: 'PURCHASE_INVOICE_PAYMENT' },
                relations: ['lines']
            });

            if (!journalEntry) throw new NotFoundException('Payment record not found');
            if (journalEntry.status === JournalEntryStatus.POSTED) {
                throw new BadRequestException('Payment is already posted');
            }

            const invoice = await queryRunner.manager.findOne(PurchaseInvoice, {
                where: { id: journalEntry.referenceId, organizationId },
                relations: ['vendor']
            });

            if (!invoice) throw new NotFoundException('Associated invoice not found');

            const apLine = journalEntry.lines.find(l => Number(l.debit) > 0);
            const amount = apLine ? Number(apLine.debit) : 0;

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
                invoice.status = PurchaseInvoiceStatus.PAID;
            } else {
                invoice.status = PurchaseInvoiceStatus.PARTIALLY_PAID;
            }
            await queryRunner.manager.save(PurchaseInvoice, invoice);

            // Update Vendor Balance
            if (invoice.vendor) {
                invoice.vendor.currentBalance = Number(invoice.vendor.currentBalance) - amount;
                await queryRunner.manager.save(Vendor, invoice.vendor);
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
                where: { id: paymentId, organizationId, referenceType: 'PURCHASE_INVOICE_PAYMENT' },
                relations: ['lines']
            });

            if (!journalEntry) throw new NotFoundException('Payment record not found');

            const invoice = await queryRunner.manager.findOne(PurchaseInvoice, {
                where: { id: journalEntry.referenceId, organizationId },
                relations: ['vendor']
            });

            if (!invoice) throw new NotFoundException('Associated invoice not found');

            const apLine = journalEntry.lines.find(l => Number(l.debit) > 0);
            const amount = apLine ? Number(apLine.debit) : 0;

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
                    invoice.status = PurchaseInvoiceStatus.POSTED;
                } else {
                    invoice.status = PurchaseInvoiceStatus.PARTIALLY_PAID;
                }
                await queryRunner.manager.save(PurchaseInvoice, invoice);

                // Update Vendor Balance
                if (invoice.vendor) {
                    invoice.vendor.currentBalance = Number(invoice.vendor.currentBalance) + amount;
                    await queryRunner.manager.save(Vendor, invoice.vendor);
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

    async getVendorStatement(vendorId: string, organizationId: string) {
        const vendor = await this.vendorRepository.findOne({ where: { id: vendorId, organizationId } });
        if (!vendor) throw new NotFoundException('Vendor not found');

        const invoices = await this.invoiceRepository.find({
            where: { vendorId, organizationId },
            order: { invoiceDate: 'ASC', createdAt: 'ASC' }
        });

        // Fetch all payments for these invoices
        const invoiceIds = invoices.map(i => i.id);
        const payments = invoiceIds.length > 0 ? await this.dataSource.manager.find(JournalEntry, {
            where: {
                organizationId,
                referenceType: 'PURCHASE_INVOICE_PAYMENT',
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
                isOverdue: inv.status !== PurchaseInvoiceStatus.PAID && new Date(inv.dueDate) < new Date(),
                payments: payments
                    .filter(p => p.referenceId === inv.id)
                    .map(p => {
                        const amountLine = p.lines.find(l => Number(l.debit) > 0);
                        return {
                            id: p.id,
                            date: p.entryDate,
                            number: p.entryNumber,
                            amount: amountLine ? Number(amountLine.debit) : 0,
                            narration: p.narration,
                            status: p.status
                        };
                    })
            };
        });

        return {
            vendor: { id: vendor.id, name: vendor.name, phone: vendor.phone, email: vendor.email },
            rows,
            totalBilled: rows.reduce((s, r) => s + r.totalAmount, 0),
            totalPaid: rows.reduce((s, r) => s + r.paidAmount, 0),
            totalDue: rows.reduce((s, r) => s + r.balanceDue, 0),
        };
    }

    async getPayments(id: string, organizationId: string) {
        const payments = await this.journalEntryRepository.find({
            where: { referenceId: id, organizationId, referenceType: 'PURCHASE_INVOICE_PAYMENT' },
            relations: ['lines', 'lines.account'],
            order: { createdAt: 'DESC' }
        });

        return payments.map(p => {
            const amountLine = p.lines?.find(l => Number(l.debit) > 0);
            return {
                id: p.id,
                entryNumber: p.entryNumber,
                entryDate: p.entryDate,
                status: p.status,
                narration: p.narration,
                amount: amountLine ? Number(amountLine.debit) : 0,
                createdAt: p.createdAt
            };
        });
    }
}
