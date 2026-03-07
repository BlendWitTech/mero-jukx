import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn
} from 'typeorm';

export enum SerialNumberStatus {
    AVAILABLE = 'available',
    SOLD = 'sold',
    IN_USE = 'in_use',
    RETURNED = 'returned',
    DEFECTIVE = 'defective',
}

@Entity('inventory_serial_numbers')
export class SerialNumber {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid' })
    organization_id: string;

    @Column({ type: 'uuid' })
    product_id: string;

    @Column({ type: 'uuid', nullable: true })
    warehouse_id: string | null;

    @Column({ type: 'varchar', length: 100 })
    serial_number: string;

    @Column({ type: 'enum', enum: SerialNumberStatus, default: SerialNumberStatus.AVAILABLE })
    status: SerialNumberStatus;

    @Column({ type: 'uuid', nullable: true })
    stock_movement_in_id: string | null;

    @Column({ type: 'uuid', nullable: true })
    stock_movement_out_id: string | null;

    @Column({ type: 'date', nullable: true })
    warranty_expiry: string | null;

    @Column({ type: 'text', nullable: true })
    notes: string | null;

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;
}
