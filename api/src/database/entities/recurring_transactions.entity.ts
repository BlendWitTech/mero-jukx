import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn
} from 'typeorm';
import { Organization } from './organizations.entity';
import { User } from './users.entity';

export enum RecurringTransactionType {
    JOURNAL_ENTRY = 'JOURNAL_ENTRY',
    PURCHASE_INVOICE = 'PURCHASE_INVOICE',
    SALES_INVOICE = 'SALES_INVOICE',
}

export enum RecurringTransactionFrequency {
    DAILY = 'DAILY',
    WEEKLY = 'WEEKLY',
    MONTHLY = 'MONTHLY',
    YEARLY = 'YEARLY',
}

export enum RecurringTransactionStatus {
    ACTIVE = 'ACTIVE',
    PAUSED = 'PAUSED',
    COMPLETED = 'COMPLETED',
}

@Entity('recurring_transactions')
export class RecurringTransaction {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'organization_id', type: 'uuid' })
    organizationId: string;

    @ManyToOne(() => Organization)
    @JoinColumn({ name: 'organization_id' })
    organization: Organization;

    @Column({ type: 'enum', enum: RecurringTransactionType })
    type: RecurringTransactionType;

    @Column({ type: 'enum', enum: RecurringTransactionFrequency })
    frequency: RecurringTransactionFrequency;

    @Column({ type: 'enum', enum: RecurringTransactionStatus, default: RecurringTransactionStatus.ACTIVE })
    status: RecurringTransactionStatus;

    @Column({ name: 'start_date', type: 'date' })
    startDate: Date;

    @Column({ name: 'end_date', type: 'date', nullable: true })
    endDate: Date;

    @Column({ name: 'next_run_date', type: 'date' })
    nextRunDate: Date;

    @Column({ name: 'last_run_date', type: 'date', nullable: true })
    lastRunDate: Date;

    @Column({ name: 'template_payload', type: 'jsonb' })
    templatePayload: any;

    @Column({ name: 'created_by', type: 'uuid' })
    createdBy: string;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'created_by' })
    creator: User;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
