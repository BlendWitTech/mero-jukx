import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
} from 'typeorm';

export enum BatchLotStatus {
    ACTIVE = 'active',
    EXPIRED = 'expired',
    RECALLED = 'recalled',
    CONSUMED = 'consumed',
}

@Entity('inventory_batch_lots')
export class BatchLot {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid' })
    organization_id: string;

    @Column({ type: 'uuid' })
    product_id: string;

    @Column({ type: 'uuid', nullable: true })
    warehouse_id: string | null;

    @Column({ type: 'varchar', length: 100 })
    batch_number: string;

    @Column({ type: 'varchar', length: 100, nullable: true })
    lot_number: string | null;

    @Column({ type: 'varchar', length: 100, nullable: true })
    manufacturer: string | null;

    @Column({ type: 'date', nullable: true })
    manufacture_date: string | null;

    @Column({ type: 'date', nullable: true })
    expiry_date: string | null;

    @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
    initial_quantity: number;

    @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
    remaining_quantity: number;

    @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
    cost_price: number | null;

    @Column({ type: 'enum', enum: BatchLotStatus, default: BatchLotStatus.ACTIVE })
    status: BatchLotStatus;

    @Column({ type: 'text', nullable: true })
    notes: string | null;

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;
}
