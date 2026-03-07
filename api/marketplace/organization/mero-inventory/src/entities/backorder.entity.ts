import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
} from 'typeorm';

export enum BackorderStatus {
    OPEN = 'open',
    PARTIALLY_FULFILLED = 'partially_fulfilled',
    FULFILLED = 'fulfilled',
    CANCELLED = 'cancelled',
}

@Entity('inventory_backorders')
export class Backorder {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid' })
    organization_id: string;

    @Column({ type: 'varchar', length: 50 })
    backorder_number: string;

    @Column({ type: 'uuid' })
    sales_order_id: string;

    @Column({ type: 'uuid' })
    product_id: string;

    @Column({ type: 'varchar', length: 255, nullable: true })
    product_name: string | null;

    @Column({ type: 'decimal', precision: 10, scale: 2 })
    original_quantity: number;

    @Column({ type: 'decimal', precision: 10, scale: 2 })
    backordered_quantity: number;

    @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
    fulfilled_quantity: number;

    @Column({ type: 'enum', enum: BackorderStatus, default: BackorderStatus.OPEN })
    status: BackorderStatus;

    @Column({ type: 'date', nullable: true })
    expected_fulfillment_date: string | null;

    @Column({ type: 'text', nullable: true })
    notes: string | null;

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;
}
