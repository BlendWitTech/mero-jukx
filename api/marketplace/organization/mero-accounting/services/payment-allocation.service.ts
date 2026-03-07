import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, IsNull } from 'typeorm';
import { PaymentAllocation, AllocationInvoiceType } from '@src/database/entities/payment_allocations.entity';
import { SalesInvoice, SalesInvoiceStatus, Customer } from '@src/database/entities/customers_sales_invoices.entity';
import { PurchaseInvoice, PurchaseInvoiceStatus, Vendor } from '@src/database/entities/vendors_purchase_invoices.entity';
import { JournalEntry, JournalEntryStatus, JournalEntryLine } from '@src/database/entities/journal_entries.entity';
import { Account } from '@src/database/entities/accounts.entity';
import { AuditService } from './audit.service';

@Injectable()
export class PaymentAllocationService {
    constructor(
        @InjectRepository(PaymentAllocation)
        private readonly allocationRepo: Repository<PaymentAllocation>,
        private readonly auditService: AuditService,
        private readonly dataSource: DataSource,
    ) { }

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

    async allocateCustomerPayment(organizationId: string, userId: string, data: {
        customerId: string;
        amount: number;
        bankAccountId: string;
        arAccountId: string;
        paymentDate: string;
        narration?: string;
        allocationMethod: 'FIFO' | 'MANUAL';
        manualAllocations?: { invoiceId: string; amount: number }[];
    }) {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            if (data.amount <= 0) throw new BadRequestException('Payment amount must be greater than zero');

            const customer = await queryRunner.manager.findOne(Customer, {
                where: { id: data.customerId, organizationId }
            });
            if (!customer) throw new NotFoundException('Customer not found');

            // 1. Determine which invoices to pay and how much
            let allocationsToMake: { invoiceId: string, amount: number }[] = [];

            if (data.allocationMethod === 'MANUAL') {
                if (!data.manualAllocations || data.manualAllocations.length === 0) {
                    throw new BadRequestException('Manual allocations require invoiceId and amount array');
                }
                const totalManual = data.manualAllocations.reduce((sum, item) => sum + Number(item.amount), 0);
                if (Math.abs(totalManual - data.amount) > 0.01) {
                    throw new BadRequestException('Manual allocation total does not match payment amount');
                }
                allocationsToMake = data.manualAllocations;
            } else {
                // FIFO
                const invoices = await queryRunner.manager.find(SalesInvoice, {
                    where: [
                        { organizationId, customerId: data.customerId, status: SalesInvoiceStatus.POSTED },
                        { organizationId, customerId: data.customerId, status: SalesInvoiceStatus.PARTIALLY_PAID }
                    ],
                    order: { dueDate: 'ASC', invoiceDate: 'ASC' }
                });

                let remainingPayment = data.amount;
                for (const inv of invoices) {
                    if (remainingPayment <= 0) break;

                    const due = Number(inv.totalAmount) - Number(inv.paidAmount);
                    if (due <= 0) continue;

                    const payAmount = Math.min(due, remainingPayment);
                    allocationsToMake.push({ invoiceId: inv.id, amount: payAmount });
                    remainingPayment -= payAmount;
                }

                if (remainingPayment > 0.01) {
                    // Optional: Create an unallocated advance payment or throw. 
                    // Let's just create an overpayment/advance by throwing for now:
                    throw new BadRequestException(`Payment amount is larger than customer outstanding balance. Overpayment mapping not yet supported.`);
                }
            }

            // 2. Validate all invoices actually belong to customer and have enough due balance
            for (const alloc of allocationsToMake) {
                const inv = await queryRunner.manager.findOne(SalesInvoice, {
                    where: { id: alloc.invoiceId, organizationId }
                });
                if (!inv) throw new NotFoundException(`Invoice ${alloc.invoiceId} not found`);
                if (inv.customerId !== data.customerId) throw new BadRequestException(`Invoice ${inv.invoiceNumber} belongs to a different customer`);
                const due = Number(inv.totalAmount) - Number(inv.paidAmount);
                if (alloc.amount > due + 0.01) {
                    throw new BadRequestException(`Allocation amount ${alloc.amount} exceeds due balance ${due} for invoice ${inv.invoiceNumber}`);
                }
            }

            // 3. Create single Journal Entry (Bulk Receipt)
            const entryNumber = await this.generateJournalEntryNumber(organizationId, queryRunner.manager);
            const narration = data.narration || `Bulk payment received from ${customer.name}`;

            const journalEntry = queryRunner.manager.create(JournalEntry, {
                organizationId,
                entryNumber,
                entryDate: new Date(data.paymentDate),
                narration,
                createdBy: userId,
                status: JournalEntryStatus.POSTED,
                postedBy: userId,
                postedAt: new Date(),
                referenceType: 'CUSTOMER_BULK_PAYMENT',
                lines: [
                    {
                        accountId: data.bankAccountId,
                        debit: data.amount,
                        credit: 0,
                        description: `Deposit from ${customer.name}`
                    },
                    {
                        accountId: data.arAccountId,
                        debit: 0,
                        credit: data.amount,
                        description: `AR clearance for ${customer.name}`
                    }
                ]
            } as any);

            const savedEntry = await queryRunner.manager.save(JournalEntry, journalEntry);

            // Update Account Balances
            for (const line of savedEntry.lines) {
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

            // 4. Update Invoices, Customer Balance and create Allocations
            for (const alloc of allocationsToMake) {
                const inv = await queryRunner.manager.findOne(SalesInvoice, {
                    where: { id: alloc.invoiceId, organizationId }
                }) as SalesInvoice;

                inv.paidAmount = Number(inv.paidAmount) + alloc.amount;
                if (inv.paidAmount >= Number(inv.totalAmount)) {
                    inv.status = SalesInvoiceStatus.PAID;
                } else {
                    inv.status = SalesInvoiceStatus.PARTIALLY_PAID;
                }
                await queryRunner.manager.save(SalesInvoice, inv);

                const paymentAllocation = queryRunner.manager.create(PaymentAllocation, {
                    organizationId,
                    journalEntryId: savedEntry.id,
                    invoiceType: AllocationInvoiceType.SALES,
                    invoiceId: inv.id,
                    amount: alloc.amount
                });
                await queryRunner.manager.save(PaymentAllocation, paymentAllocation);
            }

            customer.currentBalance = Number(customer.currentBalance) - data.amount;
            await queryRunner.manager.save(Customer, customer);

            await this.auditService.log(
                organizationId,
                userId,
                'ALLOCATE_CUSTOMER_PAYMENT',
                'Customer',
                customer.id,
                null,
                { message: `Allocated ${data.amount} to Invoices for ${customer.name} via ${data.allocationMethod}` }
            );

            await queryRunner.commitTransaction();
            return { journalEntryId: savedEntry.id, allocatedInvoices: allocationsToMake.length };
        } catch (err) {
            await queryRunner.rollbackTransaction();
            throw err;
        } finally {
            await queryRunner.release();
        }
    }

    async allocateVendorPayment(organizationId: string, userId: string, data: {
        vendorId: string;
        amount: number;
        bankAccountId: string;
        apAccountId: string;
        paymentDate: string;
        narration?: string;
        allocationMethod: 'FIFO' | 'MANUAL';
        manualAllocations?: { invoiceId: string; amount: number }[];
    }) {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            if (data.amount <= 0) throw new BadRequestException('Payment amount must be greater than zero');

            const vendor = await queryRunner.manager.findOne(Vendor, {
                where: { id: data.vendorId, organizationId }
            });
            if (!vendor) throw new NotFoundException('Vendor not found');

            // 1. Determine which invoices to pay and how much
            let allocationsToMake: { invoiceId: string, amount: number }[] = [];

            if (data.allocationMethod === 'MANUAL') {
                if (!data.manualAllocations || data.manualAllocations.length === 0) {
                    throw new BadRequestException('Manual allocations require invoiceId and amount array');
                }
                const totalManual = data.manualAllocations.reduce((sum, item) => sum + Number(item.amount), 0);
                if (Math.abs(totalManual - data.amount) > 0.01) {
                    throw new BadRequestException('Manual allocation total does not match payment amount');
                }
                allocationsToMake = data.manualAllocations;
            } else {
                // FIFO
                const invoices = await queryRunner.manager.find(PurchaseInvoice, {
                    where: [
                        { organizationId, vendorId: data.vendorId, status: PurchaseInvoiceStatus.POSTED },
                        { organizationId, vendorId: data.vendorId, status: PurchaseInvoiceStatus.PARTIALLY_PAID }
                    ],
                    order: { dueDate: 'ASC', invoiceDate: 'ASC' }
                });

                let remainingPayment = data.amount;
                for (const inv of invoices) {
                    if (remainingPayment <= 0) break;

                    const due = Number(inv.totalAmount) - Number(inv.paidAmount);
                    if (due <= 0) continue;

                    const payAmount = Math.min(due, remainingPayment);
                    allocationsToMake.push({ invoiceId: inv.id, amount: payAmount });
                    remainingPayment -= payAmount;
                }

                if (remainingPayment > 0.01) {
                    throw new BadRequestException(`Payment amount is larger than vendor outstanding balance. Overpayment mapping not yet supported.`);
                }
            }

            // 2. Validate all invoices actually belong to vendor and have enough due balance
            for (const alloc of allocationsToMake) {
                const inv = await queryRunner.manager.findOne(PurchaseInvoice, {
                    where: { id: alloc.invoiceId, organizationId }
                });
                if (!inv) throw new NotFoundException(`Purchase Invoice ${alloc.invoiceId} not found`);
                if (inv.vendorId !== data.vendorId) throw new BadRequestException(`Invoice ${inv.invoiceNumber} belongs to a different vendor`);
                const due = Number(inv.totalAmount) - Number(inv.paidAmount);
                if (alloc.amount > due + 0.01) {
                    throw new BadRequestException(`Allocation amount ${alloc.amount} exceeds due balance ${due} for invoice ${inv.invoiceNumber}`);
                }
            }

            // 3. Create single Journal Entry (Bulk Payment)
            const entryNumber = await this.generateJournalEntryNumber(organizationId, queryRunner.manager);
            const narration = data.narration || `Bulk payment to ${vendor.name}`;

            const journalEntry = queryRunner.manager.create(JournalEntry, {
                organizationId,
                entryNumber,
                entryDate: new Date(data.paymentDate),
                narration,
                createdBy: userId,
                status: JournalEntryStatus.POSTED,
                postedBy: userId,
                postedAt: new Date(),
                referenceType: 'VENDOR_BULK_PAYMENT',
                lines: [
                    {
                        accountId: data.apAccountId,
                        debit: data.amount,
                        credit: 0,
                        description: `AP clearance for ${vendor.name}`
                    },
                    {
                        accountId: data.bankAccountId,
                        debit: 0,
                        credit: data.amount,
                        description: `Payment to ${vendor.name}`
                    }
                ]
            } as any);

            const savedEntry = await queryRunner.manager.save(JournalEntry, journalEntry);

            // Update Account Balances
            for (const line of savedEntry.lines) {
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

            // 4. Update Invoices, Vendor Balance and create Allocations
            for (const alloc of allocationsToMake) {
                const inv = await queryRunner.manager.findOne(PurchaseInvoice, {
                    where: { id: alloc.invoiceId, organizationId }
                }) as PurchaseInvoice;

                inv.paidAmount = Number(inv.paidAmount) + alloc.amount;
                if (inv.paidAmount >= Number(inv.totalAmount)) {
                    inv.status = PurchaseInvoiceStatus.PAID;
                } else {
                    inv.status = PurchaseInvoiceStatus.PARTIALLY_PAID;
                }
                await queryRunner.manager.save(PurchaseInvoice, inv);

                const paymentAllocation = queryRunner.manager.create(PaymentAllocation, {
                    organizationId,
                    journalEntryId: savedEntry.id,
                    invoiceType: AllocationInvoiceType.PURCHASE,
                    invoiceId: inv.id,
                    amount: alloc.amount
                });
                await queryRunner.manager.save(PaymentAllocation, paymentAllocation);
            }

            vendor.currentBalance = Number(vendor.currentBalance) - data.amount;
            await queryRunner.manager.save(Vendor, vendor);

            await this.auditService.log(
                organizationId,
                userId,
                'ALLOCATE_VENDOR_PAYMENT',
                'Vendor',
                vendor.id,
                null,
                { message: `Allocated ${data.amount} to Invoices for ${vendor.name} via ${data.allocationMethod}` }
            );

            await queryRunner.commitTransaction();
            return { journalEntryId: savedEntry.id, allocatedInvoices: allocationsToMake.length };
        } catch (err) {
            await queryRunner.rollbackTransaction();
            throw err;
        } finally {
            await queryRunner.release();
        }
    }

    async unpostAllocationGroup(journalEntryId: string, organizationId: string, userId: string) {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            const journalEntry = await queryRunner.manager.findOne(JournalEntry, {
                where: { id: journalEntryId, organizationId },
                relations: ['lines']
            });

            if (!journalEntry) throw new NotFoundException('Journal entry not found');
            if (journalEntry.status !== JournalEntryStatus.POSTED) throw new BadRequestException('Journal entry is already unposted/draft');
            if (!['CUSTOMER_BULK_PAYMENT', 'VENDOR_BULK_PAYMENT'].includes(journalEntry.referenceType || '')) {
                throw new BadRequestException('Journal entry is not a bulk payment allocation');
            }

            const allocations = await queryRunner.manager.find(PaymentAllocation, {
                where: { journalEntryId, organizationId }
            });

            if (allocations.length === 0) {
                throw new Error('No allocations mapped to this journal entry');
            }

            // 1. Reverse Account Balances for the JE
            for (const line of journalEntry.lines) {
                const account = await queryRunner.manager.findOne(Account, { where: { id: line.accountId } });
                if (account) {
                    const isDebitNormal = ['ASSET', 'EXPENSE'].includes(account.accountType);
                    const delta = isDebitNormal
                        ? Number(line.debit) - Number(line.credit)
                        : Number(line.credit) - Number(line.debit);
                    account.balance = Number(account.balance) - delta; // Reverse
                    await queryRunner.manager.save(Account, account);
                }
            }

            journalEntry.status = JournalEntryStatus.DRAFT;
            await queryRunner.manager.save(JournalEntry, journalEntry);

            // 2. Reverse allocations for underlying invoices and customer/vendor
            let totalReversedAmount = 0;
            let currentCustomerOrVendorId = null;

            for (const alloc of allocations) {
                if (alloc.invoiceType === AllocationInvoiceType.SALES) {
                    const inv = await queryRunner.manager.findOne(SalesInvoice, {
                        where: { id: alloc.invoiceId, organizationId }
                    });
                    if (inv) {
                        inv.paidAmount = Number(inv.paidAmount) - Number(alloc.amount);
                        inv.status = inv.paidAmount <= 0 ? SalesInvoiceStatus.POSTED : SalesInvoiceStatus.PARTIALLY_PAID;
                        await queryRunner.manager.save(SalesInvoice, inv);
                        currentCustomerOrVendorId = inv.customerId;
                        totalReversedAmount += Number(alloc.amount);
                    }
                } else if (alloc.invoiceType === AllocationInvoiceType.PURCHASE) {
                    const inv = await queryRunner.manager.findOne(PurchaseInvoice, {
                        where: { id: alloc.invoiceId, organizationId }
                    });
                    if (inv) {
                        inv.paidAmount = Number(inv.paidAmount) - Number(alloc.amount);
                        inv.status = inv.paidAmount <= 0 ? PurchaseInvoiceStatus.POSTED : PurchaseInvoiceStatus.PARTIALLY_PAID;
                        await queryRunner.manager.save(PurchaseInvoice, inv);
                        currentCustomerOrVendorId = inv.vendorId;
                        totalReversedAmount += Number(alloc.amount);
                    }
                }

                // Remove the mapping record
                await queryRunner.manager.remove(PaymentAllocation, alloc);
            }

            // 3. Fix Customer/Vendor Balance
            if (currentCustomerOrVendorId) {
                if (journalEntry.referenceType === 'CUSTOMER_BULK_PAYMENT') {
                    const customer = await queryRunner.manager.findOne(Customer, { where: { id: currentCustomerOrVendorId } });
                    if (customer) {
                        customer.currentBalance = Number(customer.currentBalance) + totalReversedAmount;
                        await queryRunner.manager.save(Customer, customer);
                    }
                } else {
                    const vendor = await queryRunner.manager.findOne(Vendor, { where: { id: currentCustomerOrVendorId } });
                    if (vendor) {
                        vendor.currentBalance = Number(vendor.currentBalance) + totalReversedAmount;
                        await queryRunner.manager.save(Vendor, vendor);
                    }
                }
            }

            await this.auditService.log(
                organizationId,
                userId,
                'UNPOST_BULK_PAYMENT_ALLOCATION',
                'JournalEntry',
                journalEntry.id,
                null,
                { message: `Unposted bulk payment allocation JE ${journalEntry.entryNumber} and unlinked invoices.` }
            );

            await queryRunner.commitTransaction();
            return { success: true };
        } catch (err) {
            await queryRunner.rollbackTransaction();
            throw err;
        } finally {
            await queryRunner.release();
        }
    }
}
