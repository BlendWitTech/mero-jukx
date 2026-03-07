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

@Entity('hr_training_programs')
export class HrTrainingProgram {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'organization_id', type: 'uuid' })
    organizationId: string;

    @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'organization_id' })
    organization: Organization;

    @Column({ length: 255 })
    title: string;

    @Column({ length: 100 })
    category: string;

    @Column({ type: 'text', nullable: true })
    description: string;

    @Column({ length: 255 })
    trainer: string;

    @Column({ type: 'date' })
    start_date: Date;

    @Column({ type: 'date' })
    end_date: Date;

    @Column({ length: 100 })
    duration: string;

    @Column({ type: 'int', default: 20 })
    capacity: number;

    @Column({ type: 'int', default: 0 })
    enrolled: number;

    @Column({ length: 255, nullable: true })
    location: string;

    @Column({
        type: 'enum',
        enum: ['IN_PERSON', 'ONLINE', 'HYBRID'],
        default: 'IN_PERSON',
    })
    mode: string;

    @Column({
        type: 'enum',
        enum: ['UPCOMING', 'ONGOING', 'COMPLETED', 'CANCELLED'],
        default: 'UPCOMING',
    })
    status: string;

    @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
    budget: number;

    @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
    completion_rate: number;

    @Column({ type: 'text', nullable: true })
    notes: string;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
