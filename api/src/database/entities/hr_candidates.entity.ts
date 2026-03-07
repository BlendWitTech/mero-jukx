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
import { HrJobOpening } from './hr_job_openings.entity';

@Entity('hr_candidates')
export class HrCandidate {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'organization_id', type: 'uuid' })
    organizationId: string;

    @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'organization_id' })
    organization: Organization;

    @Column({ name: 'job_id', type: 'uuid', nullable: true })
    jobId: string;

    @ManyToOne(() => HrJobOpening, { onDelete: 'SET NULL', nullable: true })
    @JoinColumn({ name: 'job_id' })
    job: HrJobOpening;

    @Column({ length: 255 })
    first_name: string;

    @Column({ length: 255, nullable: true })
    last_name: string;

    @Column({ length: 255 })
    email: string;

    @Column({ length: 50, nullable: true })
    phone: string;

    @Column({ type: 'text', nullable: true })
    resume_url: string;

    @Column({ type: 'text', nullable: true })
    cover_letter: string;

    @Column({
        type: 'enum',
        enum: ['REFERRAL', 'JOB_PORTAL', 'WEBSITE', 'WALK_IN', 'OTHER'],
        default: 'OTHER',
    })
    source: string;

    @Column({
        type: 'enum',
        enum: ['APPLIED', 'SCREENING', 'INTERVIEW', 'TECHNICAL', 'OFFER', 'HIRED', 'REJECTED'],
        default: 'APPLIED',
    })
    stage: string;

    @Column({ type: 'decimal', precision: 3, scale: 1, nullable: true })
    rating: number;

    @Column({ type: 'text', nullable: true })
    notes: string;

    @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
    expected_salary: number;

    @Column({ type: 'timestamp', nullable: true })
    interview_date: Date;

    @Column({ type: 'timestamp', nullable: true })
    hired_at: Date;

    @Column({ type: 'timestamp', nullable: true })
    rejected_at: Date;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
