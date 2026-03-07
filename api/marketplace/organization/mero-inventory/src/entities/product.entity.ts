import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    DeleteDateColumn,
    ManyToOne,
    JoinColumn,
    OneToMany
} from 'typeorm';
import { Organization } from '../../../../../src/database/entities/organizations.entity';
import { Stock } from './stock.entity';

@Entity('products')
export class Product {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid', nullable: true })
    parent_id: string | null;

    @ManyToOne(() => Product, product => product.variants)
    @JoinColumn({ name: 'parent_id' })
    parent: Product | null;

    @OneToMany(() => Product, product => product.parent)
    variants: Product[];

    @Column({ type: 'varchar', length: 50, nullable: true })
    attribute_type: string | null; // e.g., 'Color', 'Size'

    @Column({ type: 'varchar', length: 100, nullable: true })
    attribute_value: string | null; // e.g., 'Blue', 'XL'

    @OneToMany(() => Stock, stock => stock.product)
    stocks: Stock[];

    @Column({ type: 'uuid' })
    organization_id: string;

    @ManyToOne(() => Organization)
    @JoinColumn({ name: 'organization_id' })
    organization: Organization;

    @Column({ type: 'varchar', length: 100 })
    sku: string;

    @Column({ type: 'varchar', length: 255 })
    name: string;

    @Column({ type: 'varchar', length: 255, nullable: true })
    name_nepali: string | null;

    @Column({ type: 'text', nullable: true })
    description: string | null;

    @Column({ type: 'varchar', length: 100, nullable: true })
    category: string | null;

    @Column({ type: 'varchar', length: 50, default: 'pcs' })
    unit: string;

    @Column({ type: 'decimal', precision: 10, scale: 2 })
    cost_price: number;

    @Column({ type: 'decimal', precision: 10, scale: 2 })
    selling_price: number;

    @Column({ type: 'varchar', length: 100, nullable: true })
    barcode: string | null;

    @Column({ type: 'varchar', length: 500, nullable: true })
    image_url: string | null;

    @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
    min_stock_level: number;

    @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
    reorder_level: number;

    @Column({ type: 'boolean', default: false })
    track_expiry: boolean;

    @Column({ type: 'date', nullable: true })
    expiry_date: string | null;

    @Column({ type: 'int', default: 30 })
    expiry_alert_days: number;

    @Column({ type: 'boolean', default: true })
    is_active: boolean;

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;

    @DeleteDateColumn()
    deleted_at: Date | null;
}
