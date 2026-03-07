import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
} from 'typeorm';
import { Organization } from './organizations.entity';
import { Account } from './accounts.entity';

@Entity('bank_accounts')
export class BankAccount {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'organization_id', type: 'uuid' })
    organizationId: string;

    @ManyToOne(() => Organization)
    @JoinColumn({ name: 'organization_id' })
    organization: Organization;

    @Column({ name: 'account_id', type: 'uuid' })
    accountId: string;

    @ManyToOne(() => Account)
    @JoinColumn({ name: 'account_id' })
    account: Account;

    @Column({ name: 'bank_name', length: 255 })
    bankName: string;

    @Column({ name: 'account_number', length: 100 })
    accountNumber: string;

    @Column({ length: 255, nullable: true })
    branch: string;

    @Column({ name: 'account_holder', length: 255 })
    accountHolder: string;

    @Column({ name: 'opening_balance', type: 'decimal', precision: 15, scale: 2 })
    openingBalance: number;

    @Column({ name: 'current_balance', type: 'decimal', precision: 15, scale: 2 })
    currentBalance: number;

    @Column({ length: 10, default: 'NPR' })
    currency: string;

    @Column({ name: 'is_active', type: 'boolean', default: true })
    isActive: boolean;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
}

@Entity('fiscal_years')
export class FiscalYear {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'organization_id', type: 'uuid' })
    organizationId: string;

    @ManyToOne(() => Organization)
    @JoinColumn({ name: 'organization_id' })
    organization: Organization;

    @Column({ length: 20 })
    year: string;

    @Column({ name: 'start_date', type: 'date' })
    startDate: Date;

    @Column({ name: 'end_date', type: 'date' })
    endDate: Date;

    @Column({ name: 'is_closed', type: 'boolean', default: false })
    isClosed: boolean;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
}
