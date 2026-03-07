import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
} from 'typeorm';
import { Organization } from './organizations.entity';
import { JournalEntry } from './journal_entries.entity';

@Entity('customers')
export class Customer {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'organization_id', type: 'uuid' })
    organizationId: string;

    @ManyToOne(() => Organization)
    @JoinColumn({ name: 'organization_id' })
    organization: Organization;

    @Column({ length: 255 })
    name: string;

    @Column({ name: 'pan_number', length: 20, nullable: true })
    panNumber: string;

    @Column({ length: 255, nullable: true })
    email: string;

    @Column({ length: 20 })
    phone: string;

    @Column({ type: 'text', nullable: true })
    address: string;

    @Column({ name: 'payment_terms', type: 'int', nullable: true })
    paymentTermsInDays: number;

    @Column({ name: 'credit_limit', type: 'decimal', precision: 15, scale: 2, nullable: true })
    creditLimit: number;

    @Column({ name: 'opening_balance', type: 'decimal', precision: 15, scale: 2, default: 0 })
    openingBalance: number;

    @Column({ name: 'current_balance', type: 'decimal', precision: 15, scale: 2, default: 0 })
    currentBalance: number;

    @Column({ name: 'is_active', type: 'boolean', default: true })
    isActive: boolean;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
}

export enum SalesInvoiceStatus {
    DRAFT = 'DRAFT',
    REVIEWED = 'REVIEWED',
    APPROVED = 'APPROVED',
    POSTED = 'POSTED',
    PARTIALLY_PAID = 'PARTIALLY_PAID',
    PAID = 'PAID',
    CANCELLED = 'CANCELLED',
}

export enum SalesInvoiceType {
    INVOICE = 'INVOICE',
    CREDIT_NOTE = 'CREDIT_NOTE',
}

@Entity('sales_invoices')
export class SalesInvoice {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'organization_id', type: 'uuid' })
    organizationId: string;

    @ManyToOne(() => Organization)
    @JoinColumn({ name: 'organization_id' })
    organization: Organization;

    @Column({ name: 'customer_id', type: 'uuid' })
    customerId: string;

    @ManyToOne(() => Customer)
    @JoinColumn({ name: 'customer_id' })
    customer: Customer;

    @Column({ name: 'invoice_number', length: 100 })
    invoiceNumber: string;

    @Column({
        type: 'enum',
        enum: SalesInvoiceType,
        default: SalesInvoiceType.INVOICE,
    })
    type: SalesInvoiceType;

    @Column({ name: 'invoice_date', type: 'date' })
    invoiceDate: Date;

    @Column({ name: 'due_date', type: 'date' })
    dueDate: Date;

    @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
    subtotal: number;

    @Column({ name: 'vat_amount', type: 'decimal', precision: 15, scale: 2, default: 0 })
    vatAmount: number;

    @Column({ name: 'tds_amount', type: 'decimal', precision: 15, scale: 2, default: 0 })
    tdsAmount: number;

    @Column({ name: 'tds_category_id', length: 50, nullable: true })
    tdsCategoryId: string;

    @Column({ name: 'total_amount', type: 'decimal', precision: 15, scale: 2, default: 0 })
    totalAmount: number;

    @Column({ name: 'discount_amount', type: 'decimal', precision: 15, scale: 2, default: 0 })
    discountAmount: number;

    @Column({ type: 'jsonb', nullable: true })
    items: any[];

    @Column({ name: 'paid_amount', type: 'decimal', precision: 15, scale: 2, default: 0 })
    paidAmount: number;

    @Column({
        type: 'enum',
        enum: SalesInvoiceStatus,
        default: SalesInvoiceStatus.DRAFT,
    })
    status: SalesInvoiceStatus;

    @Column({ name: 'journal_entry_id', type: 'uuid', nullable: true })
    journalEntryId: string;

    @ManyToOne(() => JournalEntry)
    @JoinColumn({ name: 'journal_entry_id' })
    journalEntry: JournalEntry;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
}
