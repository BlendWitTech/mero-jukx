import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn,
} from 'typeorm';
import { Organization } from './organizations.entity';

@Entity('hr_shifts')
export class HrShift {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'organization_id', type: 'uuid' })
    organizationId: string;

    @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'organization_id' })
    organization: Organization;

    @Column({ type: 'varchar', length: 100 })
    name: string; // e.g. "Morning Shift", "Night Shift"

    @Column({ type: 'time' })
    start_time: string; // e.g. "09:00"

    @Column({ type: 'time' })
    end_time: string; // e.g. "18:00"

    @Column({ type: 'int', default: 8 })
    work_hours: number;

    /** Comma-separated day numbers: 0=Sun,1=Mon,...,6=Sat */
    @Column({ type: 'varchar', length: 20, default: '1,2,3,4,5' })
    work_days: string;

    @Column({ type: 'boolean', default: true })
    is_active: boolean;

    @Column({ type: 'text', nullable: true })
    description: string;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
