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

@Entity('vendors')
export class Vendor {
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

    @Column({ name: 'opening_balance', type: 'decimal', precision: 15, scale: 2, default: 0 })
    openingBalance: number;

    @Column({ name: 'current_balance', type: 'decimal', precision: 15, scale: 2, default: 0 })
    currentBalance: number;

    @Column({ name: 'is_active', type: 'boolean', default: true })
    isActive: boolean;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
}

export enum PurchaseInvoiceStatus {
    DRAFT = 'DRAFT',
    REVIEWED = 'REVIEWED',
    APPROVED = 'APPROVED',
    POSTED = 'POSTED',
    PARTIALLY_PAID = 'PARTIALLY_PAID',
    PAID = 'PAID',
    CANCELLED = 'CANCELLED',
}

export enum PurchaseInvoiceType {
    INVOICE = 'INVOICE',
    DEBIT_NOTE = 'DEBIT_NOTE',
}

@Entity('purchase_invoices')
export class PurchaseInvoice {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'organization_id', type: 'uuid' })
    organizationId: string;

    @ManyToOne(() => Organization)
    @JoinColumn({ name: 'organization_id' })
    organization: Organization;

    @Column({ name: 'vendor_id', type: 'uuid' })
    vendorId: string;

    @ManyToOne(() => Vendor)
    @JoinColumn({ name: 'vendor_id' })
    vendor: Vendor;

    @Column({ name: 'invoice_number', length: 100 })
    invoiceNumber: string;

    @Column({
        type: 'enum',
        enum: PurchaseInvoiceType,
        default: PurchaseInvoiceType.INVOICE,
    })
    type: PurchaseInvoiceType;

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
        enum: PurchaseInvoiceStatus,
        default: PurchaseInvoiceStatus.DRAFT,
    })
    status: PurchaseInvoiceStatus;

    @Column({ name: 'journal_entry_id', type: 'uuid', nullable: true })
    journalEntryId: string;

    @ManyToOne(() => JournalEntry)
    @JoinColumn({ name: 'journal_entry_id' })
    journalEntry: JournalEntry;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
}
