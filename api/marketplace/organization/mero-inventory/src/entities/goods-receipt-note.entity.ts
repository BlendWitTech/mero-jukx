import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    OneToMany,
    ManyToOne,
    JoinColumn,
} from 'typeorm';

export enum GRNStatus {
    DRAFT = 'draft',
    RECEIVED = 'received',
    PARTIALLY_RECEIVED = 'partially_received',
    REJECTED = 'rejected',
}

export enum MatchingStatus {
    MATCHED = 'matched',
    PARTIAL = 'partial',
    OVER_RECEIVED = 'over_received',
    UNDER_RECEIVED = 'under_received',
    PENDING = 'pending',
}

@Entity('goods_receipt_notes')
export class GoodsReceiptNote {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid' })
    organization_id: string;

    @Column({ type: 'varchar', length: 50 })
    grn_number: string;

    @Column({ type: 'uuid' })
    purchase_order_id: string;

    @Column({ type: 'uuid', nullable: true })
    warehouse_id: string | null;

    @Column({ type: 'enum', enum: GRNStatus, default: GRNStatus.DRAFT })
    status: GRNStatus;

    @Column({ type: 'enum', enum: MatchingStatus, default: MatchingStatus.PENDING })
    matching_status: MatchingStatus;

    @Column({ type: 'uuid' })
    received_by: string;

    @Column({ type: 'date', nullable: true })
    received_date: string | null;

    @Column({ type: 'text', nullable: true })
    notes: string | null;

    @Column({ type: 'text', nullable: true })
    rejection_reason: string | null;

    @OneToMany('GRNItem', 'grn', { cascade: true })
    items: GRNItem[];

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;
}

@Entity('grn_items')
export class GRNItem {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid' })
    grn_id: string;

    @ManyToOne(() => GoodsReceiptNote, grn => grn.items)
    @JoinColumn({ name: 'grn_id' })
    grn: GoodsReceiptNote;

    @Column({ type: 'uuid' })
    product_id: string;

    @Column({ type: 'varchar', length: 255, nullable: true })
    product_name: string | null;

    @Column({ type: 'decimal', precision: 10, scale: 2 })
    ordered_quantity: number;

    @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
    received_quantity: number;

    @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
    rejected_quantity: number;

    @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
    unit_price: number | null;

    @Column({ type: 'text', nullable: true })
    notes: string | null;
}
