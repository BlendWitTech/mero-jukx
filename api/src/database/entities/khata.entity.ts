import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    OneToMany,
    JoinColumn,
} from 'typeorm';
import { Organization } from './organizations.entity';

@Entity('khata_customers')
export class KhataCustomer {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'organization_id', type: 'uuid' })
    organizationId: string;

    @ManyToOne(() => Organization)
    @JoinColumn({ name: 'organization_id' })
    organization: Organization;

    @Column({ length: 255 })
    name: string;

    @Column({ name: 'name_nepali', length: 255, nullable: true })
    nameNepali: string;

    @Column({ length: 20 })
    phone: string;

    @Column({ type: 'text', nullable: true })
    address: string;

    @Column({ name: 'opening_balance', type: 'decimal', precision: 10, scale: 2, default: 0 })
    openingBalance: number;

    @Column({ name: 'current_balance', type: 'decimal', precision: 10, scale: 2, default: 0 })
    currentBalance: number;

    @Column({ name: 'credit_limit', type: 'decimal', precision: 10, scale: 2, nullable: true })
    creditLimit: number;

    @Column({ name: 'is_active', type: 'boolean', default: true })
    isActive: boolean;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;

    @OneToMany(() => KhataTransaction, (tx) => tx.customer)
    transactions: KhataTransaction[];
}

export enum KhataTransactionType {
    GIVE = 'GIVE', // Udhar/Credit
    GET = 'GET',   // Payment received
}

@Entity('khata_transactions')
export class KhataTransaction {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'organization_id', type: 'uuid' })
    organizationId: string;

    @Column({ name: 'customer_id', type: 'uuid' })
    customerId: string;

    @ManyToOne(() => KhataCustomer, (customer) => customer.transactions)
    @JoinColumn({ name: 'customer_id' })
    customer: KhataCustomer;

    @Column({ type: 'decimal', precision: 10, scale: 2 })
    amount: number;

    @Column({
        type: 'enum',
        enum: KhataTransactionType,
    })
    type: KhataTransactionType;

    @Column({ type: 'text', nullable: true })
    details: string;

    @Column({ name: 'transaction_date', type: 'date' })
    transactionDate: Date;

    @Column({ name: 'is_sms_sent', type: 'boolean', default: false })
    isSmsSent: boolean;

    @Column({ name: 'is_reconciled', type: 'boolean', default: false })
    isReconciled: boolean;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
}

export enum KhataBankEntryType {
    CREDIT = 'CREDIT',
    DEBIT = 'DEBIT',
}

@Entity('khata_bank_entries')
export class KhataBankEntry {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'organization_id', type: 'uuid' })
    organizationId: string;

    @Column({ name: 'entry_date', type: 'date' })
    entryDate: Date;

    @Column({ type: 'text', nullable: true })
    description: string;

    @Column({ type: 'decimal', precision: 12, scale: 2 })
    amount: number;

    @Column({ type: 'varchar', length: 10, default: 'CREDIT' })
    type: KhataBankEntryType;

    @Column({ length: 100, nullable: true })
    reference: string;

    @Column({ name: 'matched_transaction_id', type: 'uuid', nullable: true })
    matchedTransactionId: string;

    @Column({ name: 'is_matched', type: 'boolean', default: false })
    isMatched: boolean;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
}

// ─── Extended Module ──────────────────────────────────────────────────────────

export enum KhataEntryType {
    INCOME = 'INCOME',
    EXPENSE = 'EXPENSE',
}

@Entity('khata_categories')
export class KhataCategory {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'organization_id', type: 'uuid' })
    organizationId: string;

    @Column({ length: 100 })
    name: string;

    @Column({ type: 'enum', enum: KhataEntryType })
    type: KhataEntryType;

    @Column({ length: 50, nullable: true })
    color: string;

    @Column({ length: 50, nullable: true })
    icon: string;

    @Column({ name: 'is_default', type: 'boolean', default: false })
    isDefault: boolean;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
}

@Entity('khata_entries')
export class KhataEntry {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'organization_id', type: 'uuid' })
    organizationId: string;

    @Column({ name: 'category_id', type: 'uuid', nullable: true })
    categoryId: string;

    @ManyToOne(() => KhataCategory, { nullable: true, eager: false })
    @JoinColumn({ name: 'category_id' })
    category: KhataCategory;

    @Column({ type: 'enum', enum: KhataEntryType })
    type: KhataEntryType;

    @Column({ type: 'decimal', precision: 12, scale: 2 })
    amount: number;

    @Column({ name: 'payment_method', length: 30, nullable: true })
    paymentMethod: string;

    @Column({ type: 'date' })
    date: Date;

    @Column({ type: 'text', nullable: true })
    notes: string;

    @Column({ length: 100, nullable: true })
    reference: string;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
}

export enum KhataInvoiceStatus {
    DRAFT = 'DRAFT',
    SENT = 'SENT',
    PAID = 'PAID',
    OVERDUE = 'OVERDUE',
}

@Entity('khata_invoices')
export class KhataInvoice {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'organization_id', type: 'uuid' })
    organizationId: string;

    @Column({ name: 'invoice_number', length: 50 })
    invoiceNumber: string;

    @Column({ name: 'customer_name', length: 200 })
    customerName: string;

    @Column({ name: 'customer_phone', length: 20, nullable: true })
    customerPhone: string;

    @Column({ name: 'customer_address', type: 'text', nullable: true })
    customerAddress: string;

    @Column({ type: 'jsonb', default: [] })
    items: { description: string; quantity: number; rate: number; amount: number }[];

    @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
    subtotal: number;

    @Column({ name: 'vat_rate', type: 'decimal', precision: 5, scale: 2, default: 13 })
    vatRate: number;

    @Column({ name: 'vat_amount', type: 'decimal', precision: 12, scale: 2, default: 0 })
    vatAmount: number;

    @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
    total: number;

    @Column({ type: 'enum', enum: KhataInvoiceStatus, default: KhataInvoiceStatus.DRAFT })
    status: KhataInvoiceStatus;

    @Column({ name: 'due_date', type: 'date', nullable: true })
    dueDate: Date;

    @Column({ type: 'text', nullable: true })
    notes: string;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}

export enum KhataBillStatus {
    PENDING = 'PENDING',
    PAID = 'PAID',
    OVERDUE = 'OVERDUE',
}

@Entity('khata_bills')
export class KhataBill {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'organization_id', type: 'uuid' })
    organizationId: string;

    @Column({ name: 'bill_number', length: 50 })
    billNumber: string;

    @Column({ name: 'supplier_name', length: 200 })
    supplierName: string;

    @Column({ name: 'supplier_phone', length: 20, nullable: true })
    supplierPhone: string;

    @Column({ type: 'jsonb', default: [] })
    items: { description: string; quantity: number; rate: number; amount: number }[];

    @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
    subtotal: number;

    @Column({ name: 'vat_amount', type: 'decimal', precision: 12, scale: 2, default: 0 })
    vatAmount: number;

    @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
    total: number;

    @Column({ type: 'enum', enum: KhataBillStatus, default: KhataBillStatus.PENDING })
    status: KhataBillStatus;

    @Column({ name: 'due_date', type: 'date', nullable: true })
    dueDate: Date;

    @Column({ type: 'text', nullable: true })
    notes: string;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
