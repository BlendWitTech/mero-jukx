import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

export enum ExciseDutyStatus {
    ACTIVE = 'ACTIVE',
    INACTIVE = 'INACTIVE',
}

@Entity('excise_duty_rates')
export class ExciseDutyRate {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid' })
    organization_id: string;

    @Column({ type: 'varchar', length: 100 })
    category: string;

    @Column({ type: 'varchar', length: 255, nullable: true })
    description: string;

    @Column({ type: 'decimal', precision: 10, scale: 4 })
    rate: number;

    @Column({ type: 'date', nullable: true })
    effective_date: Date;

    @Column({
        type: 'enum',
        enum: ExciseDutyStatus,
        default: ExciseDutyStatus.ACTIVE,
    })
    status: ExciseDutyStatus;

    @CreateDateColumn()
    created_at: Date;
}
