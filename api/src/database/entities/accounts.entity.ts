import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    OneToMany,
    JoinColumn,
    Index,
} from 'typeorm';
import { Organization } from './organizations.entity';

export enum AccountType {
    ASSET = 'ASSET',
    LIABILITY = 'LIABILITY',
    EQUITY = 'EQUITY',
    REVENUE = 'REVENUE',
    EXPENSE = 'EXPENSE',
}

@Entity('accounts')
@Index(['organizationId', 'code'], { unique: true, where: 'organization_id IS NOT NULL' })
@Index(['code'], { unique: true, where: 'organization_id IS NULL' })
export class Account {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'organization_id', type: 'uuid', nullable: true })
    organizationId: string;

    @ManyToOne(() => Organization)
    @JoinColumn({ name: 'organization_id' })
    organization: Organization;

    @Column({ length: 50 })
    code: string;

    @Column({ length: 255 })
    name: string;

    @Column({ name: 'name_nepali', length: 255, nullable: true })
    nameNepali: string;

    @Column({
        name: 'account_type',
        type: 'enum',
        enum: AccountType,
    })
    accountType: AccountType;

    @Column({ length: 100 })
    category: string;

    @Column({ name: 'parent_id', type: 'uuid', nullable: true })
    parentId: string;

    @ManyToOne(() => Account, (account) => account.children)
    @JoinColumn({ name: 'parent_id' })
    parent: Account;

    @OneToMany(() => Account, (account) => account.parent)
    children: Account[];

    @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
    balance: number;

    @Column({ name: 'is_system', type: 'boolean', default: false })
    isSystem: boolean;

    @Column({ name: 'is_active', type: 'boolean', default: true })
    isActive: boolean;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
}
