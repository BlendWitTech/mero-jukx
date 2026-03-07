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
import { HrEmployee } from './hr_employees.entity';
import { User } from './users.entity';

@Entity('hr_performance_reviews')
export class HrPerformanceReview {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'organization_id', type: 'uuid' })
    organizationId: string;

    @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'organization_id' })
    organization: Organization;

    @Column({ name: 'employee_id', type: 'uuid' })
    employeeId: string;

    @ManyToOne(() => HrEmployee, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'employee_id' })
    employee: HrEmployee;

    @Column({ name: 'reviewer_id', type: 'uuid', nullable: true })
    reviewerId: string;

    @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
    @JoinColumn({ name: 'reviewer_id' })
    reviewer: User;

    @Column({ length: 50 })
    review_period: string;

    @Column({ length: 20 })
    fiscal_year: string;

    @Column({ type: 'date' })
    review_date: Date;

    @Column({ type: 'decimal', precision: 3, scale: 1, nullable: true })
    self_rating: number;

    @Column({ type: 'decimal', precision: 3, scale: 1, nullable: true })
    manager_rating: number;

    @Column({ type: 'decimal', precision: 3, scale: 1, nullable: true })
    final_rating: number;

    @Column({
        type: 'enum',
        enum: ['EXCELLENT', 'GOOD', 'SATISFACTORY', 'NEEDS_IMPROVEMENT', 'UNSATISFACTORY'],
        nullable: true,
    })
    overall_rating_label: string;

    @Column({ type: 'text', nullable: true })
    strengths: string;

    @Column({ type: 'text', nullable: true })
    areas_for_improvement: string;

    @Column({ type: 'jsonb', nullable: true })
    goals_achieved: Array<{ title: string; status: string; rating?: number }>;

    @Column({ type: 'text', nullable: true })
    training_recommendations: string;

    @Column({ type: 'text', nullable: true })
    comments: string;

    @Column({
        type: 'enum',
        enum: ['DRAFT', 'SUBMITTED', 'REVIEWED', 'APPROVED'],
        default: 'DRAFT',
    })
    status: string;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
