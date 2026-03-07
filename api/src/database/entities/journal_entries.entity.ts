import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    OneToMany,
    JoinColumn,
} from 'typeorm';
import { Organization } from './organizations.entity';
import { Account } from './accounts.entity';
import { HrDepartment } from './hr_departments.entity';
import { Project } from './projects.entity';
import { CostCenter } from './cost_centers.entity';

export enum JournalEntryStatus {
    DRAFT = 'DRAFT',
    REVIEWED = 'REVIEWED',
    APPROVED = 'APPROVED',
    POSTED = 'POSTED',
    CANCELLED = 'CANCELLED',
}

@Entity('journal_entries')
export class JournalEntry {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'organization_id', type: 'uuid' })
    organizationId: string;

    @ManyToOne(() => Organization)
    @JoinColumn({ name: 'organization_id' })
    organization: Organization;

    @Column({ name: 'entry_number', length: 100 })
    entryNumber: string;

    @Column({ name: 'entry_date', type: 'date' })
    entryDate: Date;

    @Column({ type: 'text' })
    narration: string;

    @Column({
        type: 'enum',
        enum: JournalEntryStatus,
        default: JournalEntryStatus.DRAFT,
    })
    status: JournalEntryStatus;

    @Column({ name: 'reference_type', length: 50, nullable: true })
    referenceType: string;

    @Column({ name: 'reference_id', type: 'uuid', nullable: true })
    referenceId: string;

    @Column({ name: 'created_by', type: 'uuid' })
    createdBy: string;

    @Column({ name: 'posted_by', type: 'uuid', nullable: true })
    postedBy: string;

    @Column({ name: 'posted_at', type: 'timestamp', nullable: true })
    postedAt: Date;

    @Column({ name: 'inter_company_linked_entry_id', type: 'uuid', nullable: true })
    interCompanyLinkedEntryId: string;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @OneToMany(() => JournalEntryLine, (line) => line.journalEntry, { cascade: true })
    lines: JournalEntryLine[];
}

@Entity('journal_entry_lines')
export class JournalEntryLine {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'journal_entry_id', type: 'uuid' })
    journalEntryId: string;

    @ManyToOne(() => JournalEntry, (je) => je.lines, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'journal_entry_id' })
    journalEntry: JournalEntry;

    @Column({ name: 'account_id', type: 'uuid' })
    accountId: string;

    @ManyToOne(() => Account)
    @JoinColumn({ name: 'account_id' })
    account: Account;

    @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
    debit: number;

    @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
    credit: number;

    @Column({ type: 'text', nullable: true })
    description: string;

    @Column({ name: 'department_id', type: 'uuid', nullable: true })
    departmentId: string;

    @ManyToOne(() => HrDepartment)
    @JoinColumn({ name: 'department_id' })
    department: HrDepartment;

    @Column({ name: 'project_id', type: 'uuid', nullable: true })
    projectId: string;

    @ManyToOne(() => Project)
    @JoinColumn({ name: 'project_id' })
    project: Project;

    @Column({ name: 'cost_center_id', type: 'uuid', nullable: true })
    costCenterId: string;

    @ManyToOne(() => CostCenter)
    @JoinColumn({ name: 'cost_center_id' })
    costCenter: CostCenter;

    @Column({ length: 10, default: 'NPR' })
    currency: string;

    @Column({ name: 'exchange_rate', type: 'decimal', precision: 15, scale: 6, default: 1.0 })
    exchangeRate: number;

    @Column({ name: 'foreign_debit', type: 'decimal', precision: 15, scale: 2, nullable: true })
    foreignDebit: number;

    @Column({ name: 'foreign_credit', type: 'decimal', precision: 15, scale: 2, nullable: true })
    foreignCredit: number;
}
