import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn,
    OneToMany,
} from 'typeorm';
import { Organization } from './organizations.entity';
import { HrDepartment } from './hr_departments.entity';

@Entity('hr_job_openings')
export class HrJobOpening {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'organization_id', type: 'uuid' })
    organizationId: string;

    @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'organization_id' })
    organization: Organization;

    @Column({ length: 255 })
    title: string;

    @Column({ name: 'department_id', type: 'uuid', nullable: true })
    departmentId: string;

    @ManyToOne(() => HrDepartment, { onDelete: 'SET NULL', nullable: true })
    @JoinColumn({ name: 'department_id' })
    departmentRel: HrDepartment;

    @Column({ length: 100, nullable: true })
    department: string;

    @Column({ length: 255, nullable: true })
    location: string;

    @Column({
        type: 'enum',
        enum: ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN'],
        default: 'FULL_TIME',
    })
    employment_type: string;

    @Column({ type: 'text', nullable: true })
    description: string;

    @Column({ type: 'text', nullable: true })
    requirements: string;

    @Column({ type: 'jsonb', nullable: true })
    salary_range: { min: number; max: number; currency: string };

    @Column({ type: 'int', default: 1 })
    vacancies: number;

    @Column({
        type: 'enum',
        enum: ['DRAFT', 'OPEN', 'ON_HOLD', 'CLOSED'],
        default: 'DRAFT',
    })
    status: string;

    @Column({ type: 'date', nullable: true })
    published_at: Date;

    @Column({ type: 'date', nullable: true })
    deadline: Date;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
