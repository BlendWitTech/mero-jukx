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
import { BankAccount } from './banking_fiscal.entity';
import { JournalEntry } from './journal_entries.entity';

export enum ChequeType {
    ISSUED = 'ISSUED', // AP Payment
    RECEIVED = 'RECEIVED', // AR Receipt
}

export enum ChequeStatus {
    DRAFT = 'DRAFT',
    PRINTED = 'PRINTED',
    CLEARED = 'CLEARED',
    BOUNCED = 'BOUNCED',
    CANCELLED = 'CANCELLED',
}

@Entity('cheques')
@Index(['organizationId', 'bankAccountId'])
@Index(['organizationId', 'status'])
export class Cheque {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'organization_id', type: 'uuid' })
    organizationId: string;

    @ManyToOne(() => Organization)
    @JoinColumn({ name: 'organization_id' })
    organization: Organization;

    @Column({ name: 'bank_account_id', type: 'uuid', nullable: true })
    bankAccountId: string;

    @ManyToOne(() => BankAccount)
    @JoinColumn({ name: 'bank_account_id' })
    bankAccount: BankAccount;

    @Column({ name: 'cheque_number', length: 100 })
    chequeNumber: string;

    @Column({ name: 'payee_name', length: 255 })
    payeeName: string;

    @Column({ type: 'decimal', precision: 15, scale: 2 })
    amount: number;

    @Column({ name: 'cheque_date', type: 'date' })
    chequeDate: Date;

    @Column({ name: 'issue_date', type: 'date' })
    issueDate: Date;

    @Column({
        type: 'enum',
        enum: ChequeType,
    })
    type: ChequeType;

    @Column({
        type: 'enum',
        enum: ChequeStatus,
        default: ChequeStatus.DRAFT,
    })
    status: ChequeStatus;

    @Column({ name: 'journal_entry_id', type: 'uuid', nullable: true })
    journalEntryId: string;

    @ManyToOne(() => JournalEntry, { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'journal_entry_id' })
    journalEntry: JournalEntry;

    @Column({ type: 'text', nullable: true })
    remarks: string;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
}
