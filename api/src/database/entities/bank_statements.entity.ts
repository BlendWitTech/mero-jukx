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
import { JournalEntry, JournalEntryLine } from './journal_entries.entity';

export enum BankStatementStatus {
    IMPORTED = 'IMPORTED',
    RECONCILING = 'RECONCILING',
    RECONCILED = 'RECONCILED',
}

@Entity('bank_statements')
@Index(['organizationId', 'bankAccountId'])
export class BankStatement {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'organization_id', type: 'uuid' })
    organizationId: string;

    @ManyToOne(() => Organization)
    @JoinColumn({ name: 'organization_id' })
    organization: Organization;

    @Column({ name: 'bank_account_id', type: 'uuid' })
    bankAccountId: string;

    @ManyToOne(() => BankAccount)
    @JoinColumn({ name: 'bank_account_id' })
    bankAccount: BankAccount;

    @Column({ name: 'statement_date', type: 'date' })
    statementDate: Date;

    @Column({ name: 'opening_balance', type: 'decimal', precision: 15, scale: 2, default: 0 })
    openingBalance: number;

    @Column({ name: 'closing_balance', type: 'decimal', precision: 15, scale: 2, default: 0 })
    closingBalance: number;

    @Column({
        type: 'enum',
        enum: BankStatementStatus,
        default: BankStatementStatus.IMPORTED,
    })
    status: BankStatementStatus;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
}

export enum BankStatementLineStatus {
    UNMATCHED = 'UNMATCHED',
    MATCHED = 'MATCHED',
    IGNORED = 'IGNORED',
}

@Entity('bank_statement_lines')
@Index(['bankStatementId'])
export class BankStatementLine {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'bank_statement_id', type: 'uuid' })
    bankStatementId: string;

    @ManyToOne(() => BankStatement, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'bank_statement_id' })
    bankStatement: BankStatement;

    @Column({ name: 'transaction_date', type: 'date' })
    transactionDate: Date;

    @Column({ type: 'text' })
    description: string;

    @Column({ name: 'reference_number', length: 255, nullable: true })
    referenceNumber: string;

    // From bank perspective, withdrawal = money out (Debit in bank terms, Credit for our bank asset account)
    @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
    withdrawal: number;

    // From bank perspective, deposit = money in (Credit in bank terms, Debit for our bank asset account)
    @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
    deposit: number;

    @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
    balance: number;

    @Column({
        type: 'enum',
        enum: BankStatementLineStatus,
        default: BankStatementLineStatus.UNMATCHED,
    })
    status: BankStatementLineStatus;

    @Column({ name: 'journal_entry_id', type: 'uuid', nullable: true })
    journalEntryId: string;

    @ManyToOne(() => JournalEntry, { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'journal_entry_id' })
    journalEntry: JournalEntry;

    @Column({ name: 'journal_entry_line_id', type: 'uuid', nullable: true })
    journalEntryLineId: string;

    @ManyToOne(() => JournalEntryLine, { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'journal_entry_line_id' })
    journalEntryLine: JournalEntryLine;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
}
