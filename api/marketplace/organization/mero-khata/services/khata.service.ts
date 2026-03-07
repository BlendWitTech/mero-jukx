import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, Between } from 'typeorm';
import {
    KhataCustomer,
    KhataTransaction,
    KhataTransactionType,
    KhataBankEntry,
    KhataBankEntryType,
    KhataCategory,
    KhataEntry,
    KhataEntryType,
    KhataInvoice,
    KhataInvoiceStatus,
    KhataBill,
    KhataBillStatus,
} from '@src/database/entities/khata.entity';

@Injectable()
export class KhataService {
    constructor(
        @InjectRepository(KhataCustomer)
        private readonly customerRepository: Repository<KhataCustomer>,
        @InjectRepository(KhataTransaction)
        private readonly transactionRepository: Repository<KhataTransaction>,
        @InjectRepository(KhataBankEntry)
        private readonly bankEntryRepository: Repository<KhataBankEntry>,
        @InjectRepository(KhataCategory)
        private readonly categoryRepository: Repository<KhataCategory>,
        @InjectRepository(KhataEntry)
        private readonly entryRepository: Repository<KhataEntry>,
        @InjectRepository(KhataInvoice)
        private readonly invoiceRepository: Repository<KhataInvoice>,
        @InjectRepository(KhataBill)
        private readonly billRepository: Repository<KhataBill>,
        private readonly dataSource: DataSource,
    ) { }

    async findAllCustomers(organizationId: string) {
        return this.customerRepository.find({
            where: { organizationId },
            order: { name: 'ASC' }
        });
    }

    async getCustomerDetails(id: string, organizationId: string) {
        const customer = await this.customerRepository.findOne({
            where: { id, organizationId },
            relations: ['transactions']
        });
        if (!customer) throw new NotFoundException('Customer not found');
        return customer;
    }

    async createCustomer(organizationId: string, data: any) {
        const customer = this.customerRepository.create({
            ...data,
            organizationId,
            currentBalance: data.openingBalance || 0
        });
        return this.customerRepository.save(customer);
    }

    async addTransaction(organizationId: string, data: any) {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            const customer = await queryRunner.manager.findOne(KhataCustomer, {
                where: { id: data.customerId, organizationId }
            });

            if (!customer) throw new NotFoundException('Customer not found');

            const transaction = this.transactionRepository.create({
                ...data,
                organizationId
            });

            const savedTx = await queryRunner.manager.save(transaction);

            // Update balance: GIVE (Udhar) increases balance, GET (Payment) decreases balance
            const amount = Number(data.amount);
            if (data.type === KhataTransactionType.GIVE) {
                customer.currentBalance = Number(customer.currentBalance) + amount;
            } else {
                customer.currentBalance = Number(customer.currentBalance) - amount;
            }

            await queryRunner.manager.save(customer);
            await queryRunner.commitTransaction();
            return savedTx;
        } catch (err) {
            await queryRunner.rollbackTransaction();
            throw err;
        } finally {
            await queryRunner.release();
        }
    }

    async getStats(organizationId: string) {
        const customers = await this.customerRepository.find({ where: { organizationId } });

        let totalYouGive = 0; // Positive balances (Customers owe you)
        let totalYouGet = 0;  // Negative balances (You owe customers)

        customers.forEach(c => {
            const bal = Number(c.currentBalance);
            if (bal > 0) totalYouGive += bal;
            else totalYouGet += Math.abs(bal);
        });

        return {
            totalYouGive,
            totalYouGet,
            customerCount: customers.length
        };
    }

    // ── Bank Reconciliation ──────────────────────────────────────────────────

    async getBankEntries(organizationId: string) {
        return this.bankEntryRepository.find({
            where: { organizationId },
            order: { entryDate: 'DESC' }
        });
    }

    async addBankEntry(organizationId: string, data: any) {
        const entry = this.bankEntryRepository.create({ ...data, organizationId });
        return this.bankEntryRepository.save(entry);
    }

    async matchBankEntry(entryId: string, transactionId: string, organizationId: string) {
        const entry = await this.bankEntryRepository.findOne({
            where: { id: entryId, organizationId }
        });
        if (!entry) throw new NotFoundException('Bank entry not found');

        const transaction = await this.transactionRepository.findOne({
            where: { id: transactionId, organizationId }
        });
        if (!transaction) throw new NotFoundException('Transaction not found');

        entry.matchedTransactionId = transactionId;
        entry.isMatched = true;
        transaction.isReconciled = true;

        await this.bankEntryRepository.save(entry);
        await this.transactionRepository.save(transaction);

        return { entry, transaction };
    }

    async unmatchBankEntry(entryId: string, organizationId: string) {
        const entry = await this.bankEntryRepository.findOne({
            where: { id: entryId, organizationId }
        });
        if (!entry) throw new NotFoundException('Bank entry not found');

        if (entry.matchedTransactionId) {
            const transaction = await this.transactionRepository.findOne({
                where: { id: entry.matchedTransactionId, organizationId }
            });
            if (transaction) {
                transaction.isReconciled = false;
                await this.transactionRepository.save(transaction);
            }
        }

        entry.matchedTransactionId = null;
        entry.isMatched = false;
        return this.bankEntryRepository.save(entry);
    }

    async getReconciliationSummary(organizationId: string) {
        const [allEntries, allTransactions] = await Promise.all([
            this.bankEntryRepository.find({ where: { organizationId } }),
            this.transactionRepository.find({ where: { organizationId } }),
        ]);

        const unmatchedEntries = allEntries.filter(e => !e.isMatched);
        const unreconciledTx = allTransactions.filter(t => !t.isReconciled);

        const bankBalance = allEntries.reduce((sum, e) => {
            return e.type === KhataBankEntryType.CREDIT
                ? sum + Number(e.amount)
                : sum - Number(e.amount);
        }, 0);

        return {
            totalBankEntries: allEntries.length,
            matchedEntries: allEntries.length - unmatchedEntries.length,
            unmatchedEntries: unmatchedEntries.length,
            totalTransactions: allTransactions.length,
            reconciledTransactions: allTransactions.length - unreconciledTx.length,
            unreconciledTransactions: unreconciledTx.length,
            bankBalance,
        };
    }

    async getUnreconciledTransactions(organizationId: string) {
        return this.transactionRepository.find({
            where: { organizationId, isReconciled: false },
            relations: ['customer'],
            order: { transactionDate: 'DESC' },
        });
    }

    // ── Categories ────────────────────────────────────────────────────────────

    async getCategories(organizationId: string, type?: KhataEntryType) {
        const where: any = { organizationId };
        if (type) where.type = type;
        return this.categoryRepository.find({ where, order: { name: 'ASC' } });
    }

    async createCategory(organizationId: string, data: any) {
        const cat = this.categoryRepository.create({ ...data, organizationId });
        return this.categoryRepository.save(cat);
    }

    async deleteCategory(id: string, organizationId: string) {
        const cat = await this.categoryRepository.findOne({ where: { id, organizationId } });
        if (!cat) throw new NotFoundException('Category not found');
        await this.categoryRepository.remove(cat);
        return { success: true };
    }

    async seedDefaultCategories(organizationId: string) {
        const existing = await this.categoryRepository.count({ where: { organizationId } });
        if (existing > 0) return;
        const defaults = [
            { name: 'Sales Revenue', type: KhataEntryType.INCOME, color: '#22c55e', icon: 'TrendingUp', isDefault: true },
            { name: 'Service Income', type: KhataEntryType.INCOME, color: '#3b82f6', icon: 'Wrench', isDefault: true },
            { name: 'Other Income', type: KhataEntryType.INCOME, color: '#8b5cf6', icon: 'PlusCircle', isDefault: true },
            { name: 'Rent', type: KhataEntryType.EXPENSE, color: '#f59e0b', icon: 'Home', isDefault: true },
            { name: 'Salary', type: KhataEntryType.EXPENSE, color: '#ef4444', icon: 'Users', isDefault: true },
            { name: 'Utilities', type: KhataEntryType.EXPENSE, color: '#6b7280', icon: 'Zap', isDefault: true },
            { name: 'Marketing', type: KhataEntryType.EXPENSE, color: '#ec4899', icon: 'Megaphone', isDefault: true },
            { name: 'Raw Materials', type: KhataEntryType.EXPENSE, color: '#14b8a6', icon: 'Package', isDefault: true },
        ];
        for (const d of defaults) {
            await this.categoryRepository.save(this.categoryRepository.create({ ...d, organizationId }));
        }
    }

    // ── Entries (Income / Expense) ────────────────────────────────────────────

    async getEntries(organizationId: string, type?: KhataEntryType, startDate?: string, endDate?: string) {
        const where: any = { organizationId };
        if (type) where.type = type;
        if (startDate && endDate) where.date = Between(new Date(startDate), new Date(endDate));
        return this.entryRepository.find({ where, relations: ['category'], order: { date: 'DESC', createdAt: 'DESC' } });
    }

    async createEntry(organizationId: string, data: any) {
        const entry = this.entryRepository.create({ ...data, organizationId });
        return this.entryRepository.save(entry);
    }

    async updateEntry(id: string, organizationId: string, data: any) {
        const entry = await this.entryRepository.findOne({ where: { id, organizationId } });
        if (!entry) throw new NotFoundException('Entry not found');
        Object.assign(entry, data);
        return this.entryRepository.save(entry);
    }

    async deleteEntry(id: string, organizationId: string) {
        const entry = await this.entryRepository.findOne({ where: { id, organizationId } });
        if (!entry) throw new NotFoundException('Entry not found');
        await this.entryRepository.remove(entry);
        return { success: true };
    }

    async getEntrySummary(organizationId: string, startDate?: string, endDate?: string) {
        const entries = await this.getEntries(organizationId, undefined, startDate, endDate);
        const totalIncome = entries.filter(e => e.type === KhataEntryType.INCOME).reduce((s, e) => s + Number(e.amount), 0);
        const totalExpense = entries.filter(e => e.type === KhataEntryType.EXPENSE).reduce((s, e) => s + Number(e.amount), 0);
        return { totalIncome, totalExpense, netProfit: totalIncome - totalExpense, entryCount: entries.length };
    }

    // ── Invoices ──────────────────────────────────────────────────────────────

    async getInvoices(organizationId: string, status?: string) {
        const where: any = { organizationId };
        if (status) where.status = status;
        return this.invoiceRepository.find({ where, order: { createdAt: 'DESC' } });
    }

    async getInvoice(id: string, organizationId: string) {
        const inv = await this.invoiceRepository.findOne({ where: { id, organizationId } });
        if (!inv) throw new NotFoundException('Invoice not found');
        return inv;
    }

    async createInvoice(organizationId: string, data: any) {
        const count = await this.invoiceRepository.count({ where: { organizationId } });
        const invoiceNumber = data.invoiceNumber || `INV-${String(count + 1).padStart(4, '0')}`;
        const inv = this.invoiceRepository.create({ ...data, invoiceNumber, organizationId });
        return this.invoiceRepository.save(inv);
    }

    async updateInvoice(id: string, organizationId: string, data: any) {
        const inv = await this.invoiceRepository.findOne({ where: { id, organizationId } });
        if (!inv) throw new NotFoundException('Invoice not found');
        Object.assign(inv, data);
        return this.invoiceRepository.save(inv);
    }

    async deleteInvoice(id: string, organizationId: string) {
        const inv = await this.invoiceRepository.findOne({ where: { id, organizationId } });
        if (!inv) throw new NotFoundException('Invoice not found');
        await this.invoiceRepository.remove(inv);
        return { success: true };
    }

    // ── Bills ─────────────────────────────────────────────────────────────────

    async getBills(organizationId: string, status?: string) {
        const where: any = { organizationId };
        if (status) where.status = status;
        return this.billRepository.find({ where, order: { createdAt: 'DESC' } });
    }

    async createBill(organizationId: string, data: any) {
        const count = await this.billRepository.count({ where: { organizationId } });
        const billNumber = data.billNumber || `BILL-${String(count + 1).padStart(4, '0')}`;
        const bill = this.billRepository.create({ ...data, billNumber, organizationId });
        return this.billRepository.save(bill);
    }

    async updateBill(id: string, organizationId: string, data: any) {
        const bill = await this.billRepository.findOne({ where: { id, organizationId } });
        if (!bill) throw new NotFoundException('Bill not found');
        Object.assign(bill, data);
        return this.billRepository.save(bill);
    }

    async deleteBill(id: string, organizationId: string) {
        const bill = await this.billRepository.findOne({ where: { id, organizationId } });
        if (!bill) throw new NotFoundException('Bill not found');
        await this.billRepository.remove(bill);
        return { success: true };
    }

    // ── VAT Summary ───────────────────────────────────────────────────────────

    async getVatSummary(organizationId: string, startDate?: string, endDate?: string) {
        const invWhere: any = { organizationId };
        const billWhere: any = { organizationId };
        if (startDate && endDate) {
            const range = Between(new Date(startDate), new Date(endDate));
            invWhere.createdAt = range;
            billWhere.createdAt = range;
        }
        const [invoices, bills] = await Promise.all([
            this.invoiceRepository.find({ where: invWhere }),
            this.billRepository.find({ where: billWhere }),
        ]);
        const outputVat = invoices.filter(i => i.status !== KhataInvoiceStatus.DRAFT)
            .reduce((s, i) => s + Number(i.vatAmount), 0);
        const inputVat = bills.reduce((s, b) => s + Number(b.vatAmount), 0);
        return {
            outputVat, inputVat,
            vatPayable: outputVat - inputVat,
            invoiceCount: invoices.length,
            billCount: bills.length,
            totalSales: invoices.reduce((s, i) => s + Number(i.total), 0),
            totalPurchases: bills.reduce((s, b) => s + Number(b.total), 0),
        };
    }

    // ── P&L Report ────────────────────────────────────────────────────────────

    async getPnlReport(organizationId: string, startDate: string, endDate: string) {
        const entries = await this.getEntries(organizationId, undefined, startDate, endDate);
        const incomeEntries = entries.filter(e => e.type === KhataEntryType.INCOME);
        const expenseEntries = entries.filter(e => e.type === KhataEntryType.EXPENSE);

        const groupByCategory = (list: KhataEntry[]) => {
            const map: Record<string, number> = {};
            for (const e of list) {
                const key = e.category?.name ?? 'Uncategorized';
                map[key] = (map[key] || 0) + Number(e.amount);
            }
            return Object.entries(map).map(([category, amount]) => ({ category, amount }));
        };

        const totalIncome = incomeEntries.reduce((s, e) => s + Number(e.amount), 0);
        const totalExpense = expenseEntries.reduce((s, e) => s + Number(e.amount), 0);

        return {
            period: { startDate, endDate },
            income: groupByCategory(incomeEntries),
            expenses: groupByCategory(expenseEntries),
            totalIncome,
            totalExpense,
            grossProfit: totalIncome - totalExpense,
        };
    }
}
