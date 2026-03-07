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

export enum PRStatus {
    DRAFT = 'draft',
    PENDING = 'pending',
    APPROVED = 'approved',
    REJECTED = 'rejected',
    CONVERTED = 'converted',
}

@Entity('purchase_requisitions')
export class PurchaseRequisition {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid' })
    organization_id: string;

    @Column({ type: 'varchar', length: 50 })
    pr_number: string;

    @Column({ type: 'varchar', length: 255, nullable: true })
    title: string | null;

    @Column({ type: 'text', nullable: true })
    reason: string | null;

    @Column({ type: 'date', nullable: true })
    required_by_date: string | null;

    @Column({ type: 'enum', enum: PRStatus, default: PRStatus.DRAFT })
    status: PRStatus;

    @Column({ type: 'uuid' })
    requested_by: string;

    @Column({ type: 'uuid', nullable: true })
    approved_by: string | null;

    @Column({ type: 'timestamp', nullable: true })
    approved_at: Date | null;

    @Column({ type: 'text', nullable: true })
    rejection_reason: string | null;

    @Column({ type: 'uuid', nullable: true })
    converted_to_po_id: string | null;

    @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
    total_amount: number;

    @OneToMany('PurchaseRequisitionItem', 'requisition', { cascade: true })
    items: PurchaseRequisitionItem[];

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;
}

@Entity('purchase_requisition_items')
export class PurchaseRequisitionItem {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid' })
    requisition_id: string;

    @ManyToOne(() => PurchaseRequisition, pr => pr.items)
    @JoinColumn({ name: 'requisition_id' })
    requisition: PurchaseRequisition;

    @Column({ type: 'uuid' })
    product_id: string;

    @Column({ type: 'varchar', length: 255, nullable: true })
    product_name: string | null;

    @Column({ type: 'decimal', precision: 10, scale: 2 })
    quantity: number;

    @Column({ type: 'varchar', length: 50, nullable: true })
    unit: string | null;

    @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
    estimated_unit_price: number;

    @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
    estimated_total: number;

    @Column({ type: 'text', nullable: true })
    notes: string | null;
}
