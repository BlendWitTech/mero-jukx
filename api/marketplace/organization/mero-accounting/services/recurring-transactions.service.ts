import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
    RecurringTransaction,
    RecurringTransactionStatus,
    RecurringTransactionType,
    RecurringTransactionFrequency
} from '@src/database/entities/recurring_transactions.entity';
import { JournalEntriesService } from './journal-entries.service';
import { PurchaseInvoicesService } from './purchase-invoices.service';
import { AuditService } from './audit.service';
import { SalesInvoicesService } from './sales-invoices.service';

@Injectable()
export class RecurringTransactionsService {
    private readonly logger = new Logger(RecurringTransactionsService.name);

    constructor(
        @InjectRepository(RecurringTransaction)
        private recurringTransactionRepository: Repository<RecurringTransaction>,
        private journalEntriesService: JournalEntriesService,
        private purchaseInvoicesService: PurchaseInvoicesService,
        private salesInvoicesService: SalesInvoicesService,
        private auditService: AuditService,
    ) { }

    async create(organizationId: string, userId: string, data: Partial<RecurringTransaction>) {
        const recurringTransaction = this.recurringTransactionRepository.create({
            ...data,
            organizationId,
            createdBy: userId,
            status: RecurringTransactionStatus.ACTIVE,
        });

        const saved = await this.recurringTransactionRepository.save(recurringTransaction);

        await this.auditService.log(
            organizationId,
            userId,
            'CREATE_RECURRING_TRANSACTION',
            'RecurringTransaction',
            saved.id,
            null,
            { message: `Created recurring transaction ${saved.id}` }
        );

        return saved;
    }

    async findAll(organizationId: string) {
        return this.recurringTransactionRepository.find({
            where: { organizationId },
            order: { createdAt: 'DESC' }
        });
    }

    async findOne(id: string, organizationId: string) {
        const transaction = await this.recurringTransactionRepository.findOne({
            where: { id, organizationId }
        });

        if (!transaction) throw new NotFoundException('Recurring transaction not found');
        return transaction;
    }

    async update(id: string, organizationId: string, userId: string, data: Partial<RecurringTransaction>) {
        const transaction = await this.findOne(id, organizationId);

        Object.assign(transaction, data);
        const saved = await this.recurringTransactionRepository.save(transaction);

        await this.auditService.log(
            organizationId,
            userId,
            'UPDATE_RECURRING_TRANSACTION',
            'RecurringTransaction',
            saved.id,
            null,
            { message: `Updated recurring transaction ${saved.id}` }
        );

        return saved;
    }

    async delete(id: string, organizationId: string, userId: string) {
        const transaction = await this.findOne(id, organizationId);

        await this.recurringTransactionRepository.remove(transaction);

        await this.auditService.log(
            organizationId,
            userId,
            'DELETE_RECURRING_TRANSACTION',
            'RecurringTransaction',
            id,
            null,
            { message: `Deleted recurring transaction ${id}` }
        );

        return { success: true };
    }

    async updateStatus(id: string, organizationId: string, userId: string, status: RecurringTransactionStatus) {
        const transaction = await this.findOne(id, organizationId);

        transaction.status = status;
        const saved = await this.recurringTransactionRepository.save(transaction);

        await this.auditService.log(
            organizationId,
            userId,
            'UPDATE_RECURRING_TRANSACTION_STATUS',
            'RecurringTransaction',
            saved.id,
            null,
            { message: `Updated recurring transaction ${saved.id} status to ${status}` }
        );

        return saved;
    }

    @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
    async processRecurringTransactions() {
        this.logger.log('Starting recurring transactions processing...');

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const transactions = await this.recurringTransactionRepository.find({
            where: {
                status: RecurringTransactionStatus.ACTIVE,
                nextRunDate: LessThanOrEqual(today)
            }
        });

        this.logger.log(`Found ${transactions.length} recurring transactions to process.`);

        for (const transaction of transactions) {
            try {
                await this.processTransaction(transaction);
            } catch (error) {
                this.logger.error(`Failed to process recurring transaction ${transaction.id}: ${error.message}`);
            }
        }

        this.logger.log('Finished recurring transactions processing.');
    }

    private async processTransaction(transaction: RecurringTransaction) {
        const { type, templatePayload, organizationId, createdBy } = transaction;

        // 1. Create the actual transaction
        switch (type) {
            case RecurringTransactionType.JOURNAL_ENTRY:
                await this.journalEntriesService.create(organizationId, createdBy, templatePayload);
                break;
            case RecurringTransactionType.PURCHASE_INVOICE:
                await this.purchaseInvoicesService.create(organizationId, templatePayload);
                break;
            case RecurringTransactionType.SALES_INVOICE:
                await this.salesInvoicesService.create(organizationId, templatePayload);
                break;
            default:
                throw new Error(`Unsupported transaction type: ${type}`);
        }

        // 2. Update the recurring transaction dates
        transaction.lastRunDate = new Date();

        // Calculate next run date
        const nextDate = new Date(transaction.nextRunDate);
        switch (transaction.frequency) {
            case RecurringTransactionFrequency.DAILY:
                nextDate.setDate(nextDate.getDate() + 1);
                break;
            case RecurringTransactionFrequency.WEEKLY:
                nextDate.setDate(nextDate.getDate() + 7);
                break;
            case RecurringTransactionFrequency.MONTHLY:
                nextDate.setMonth(nextDate.getMonth() + 1);
                break;
            case RecurringTransactionFrequency.YEARLY:
                nextDate.setFullYear(nextDate.getFullYear() + 1);
                break;
        }
        transaction.nextRunDate = nextDate;

        // Check if it should be completed
        if (transaction.endDate && nextDate > new Date(transaction.endDate)) {
            transaction.status = RecurringTransactionStatus.COMPLETED;
        }

        await this.recurringTransactionRepository.save(transaction);
        this.logger.log(`Successfully processed recurring transaction ${transaction.id}`);
    }
}
