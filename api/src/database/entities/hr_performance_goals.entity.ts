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

@Entity('hr_performance_goals')
export class HrPerformanceGoal {
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

    @Column({ length: 255 })
    title: string;

    @Column({ type: 'text', nullable: true })
    description: string;

    @Column({
        type: 'enum',
        enum: ['INDIVIDUAL', 'TEAM', 'DEPARTMENT', 'COMPANY'],
        default: 'INDIVIDUAL',
    })
    category: string;

    @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
    target_value: number;

    @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
    current_value: number;

    @Column({ length: 50, nullable: true })
    unit: string;

    @Column({
        type: 'enum',
        enum: ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
        default: 'NOT_STARTED',
    })
    status: string;

    @Column({ type: 'date', nullable: true })
    due_date: Date;

    @Column({ length: 20 })
    fiscal_year: string;

    @Column({ type: 'int', default: 1 })
    weight: number;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
