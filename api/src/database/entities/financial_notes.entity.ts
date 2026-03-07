import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum FinancialNoteSection {
    ASSETS = 'ASSETS',
    LIABILITIES = 'LIABILITIES',
    EQUITY = 'EQUITY',
    REVENUE = 'REVENUE',
    EXPENSES = 'EXPENSES',
    OTHER = 'OTHER',
}

@Entity('financial_notes')
export class FinancialNote {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid' })
    organization_id: string;

    @Column({ type: 'varchar', length: 20 })
    fiscal_year: string;

    @Column({
        type: 'enum',
        enum: FinancialNoteSection,
        default: FinancialNoteSection.OTHER,
    })
    section: FinancialNoteSection;

    @Column({ type: 'int', default: 1 })
    note_number: number;

    @Column({ type: 'varchar', length: 255 })
    title: string;

    @Column({ type: 'text', nullable: true })
    content: string;

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;
}
