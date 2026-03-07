import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
} from 'typeorm';

export enum CommissionType {
    PERCENTAGE = 'percentage',
    FIXED = 'fixed',
}

export enum CommissionAppliesTo {
    ALL_PRODUCTS = 'all_products',
    CATEGORY = 'category',
    SPECIFIC_PRODUCT = 'specific_product',
}

@Entity('commission_rules')
export class CommissionRule {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid' })
    organization_id: string;

    @Column({ type: 'varchar', length: 255 })
    name: string;

    @Column({ type: 'enum', enum: CommissionType, default: CommissionType.PERCENTAGE })
    commission_type: CommissionType;

    @Column({ type: 'decimal', precision: 10, scale: 4 })
    rate: number;

    @Column({ type: 'enum', enum: CommissionAppliesTo, default: CommissionAppliesTo.ALL_PRODUCTS })
    applies_to: CommissionAppliesTo;

    @Column({ type: 'varchar', length: 100, nullable: true })
    category: string | null;

    @Column({ type: 'uuid', nullable: true })
    product_id: string | null;

    @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
    min_sale_amount: number | null;

    @Column({ type: 'boolean', default: true })
    is_active: boolean;

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;
}

@Entity('commission_records')
export class CommissionRecord {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid' })
    organization_id: string;

    @Column({ type: 'uuid' })
    rule_id: string;

    @Column({ type: 'uuid' })
    sales_order_id: string;

    @Column({ type: 'varchar', length: 100, nullable: true })
    sales_person: string | null;

    @Column({ type: 'decimal', precision: 12, scale: 2 })
    sale_amount: number;

    @Column({ type: 'decimal', precision: 10, scale: 4 })
    commission_rate: number;

    @Column({ type: 'decimal', precision: 12, scale: 2 })
    commission_amount: number;

    @Column({ type: 'varchar', length: 20, default: 'pending' })
    status: string;

    @CreateDateColumn()
    created_at: Date;
}
