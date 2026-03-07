import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
    Index,
} from 'typeorm';
import { Organization } from './organizations.entity';
import { JournalEntry } from './journal_entries.entity';

export enum AllocationInvoiceType {
    SALES = 'SALES',
    PURCHASE = 'PURCHASE',
}

@Entity('payment_allocations')
@Index(['organizationId', 'journalEntryId'])
@Index(['organizationId', 'invoiceId'])
export class PaymentAllocation {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'organization_id', type: 'uuid' })
    organizationId: string;

    @ManyToOne(() => Organization)
    @JoinColumn({ name: 'organization_id' })
    organization: Organization;

    @Column({ name: 'journal_entry_id', type: 'uuid' })
    journalEntryId: string;

    @ManyToOne(() => JournalEntry, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'journal_entry_id' })
    journalEntry: JournalEntry;

    @Column({
        name: 'invoice_type',
        type: 'enum',
        enum: AllocationInvoiceType,
    })
    invoiceType: AllocationInvoiceType;

    @Column({ name: 'invoice_id', type: 'uuid' })
    invoiceId: string;

    @Column({ type: 'decimal', precision: 15, scale: 2 })
    amount: number;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
}
