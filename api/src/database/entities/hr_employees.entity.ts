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
import { User } from './users.entity';
import { HrDepartment } from './hr_departments.entity';
import { HrDesignation } from './hr_designations.entity';
import { HrDocument } from './hr_documents.entity';

@Entity('hr_employees')
export class HrEmployee {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'organization_id', type: 'uuid' })
    organizationId: string;

    @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'organization_id' })
    organization: Organization;

    @Column({ name: 'user_id', type: 'uuid', nullable: true })
    userId: string;

    @ManyToOne(() => User, { onDelete: 'SET NULL' })
    @JoinColumn({ name: 'user_id' })
    user: User;

    @Column({ length: 50, unique: true, nullable: true })
    employee_id: string;

    @Column({ length: 255 })
    first_name: string;

    @Column({ length: 255, nullable: true })
    last_name: string;

    @Column({ length: 255, nullable: true })
    email: string;

    @Column({ length: 50, nullable: true })
    phone: string;

    @Column({ type: 'date', nullable: true })
    date_of_birth: Date;

    @Column({ length: 20, nullable: true })
    gender: string;

    @Column({ type: 'text', nullable: true })
    address: string;

    @Column({ type: 'text', nullable: true })
    photo_url: string;

    @Column({
        type: 'enum',
        enum: ['SINGLE', 'MARRIED'],
        default: 'SINGLE',
    })
    marital_status: string;

    @Column({ name: 'department_id', type: 'uuid', nullable: true })
    departmentId: string;

    @ManyToOne(() => HrDepartment, { onDelete: 'SET NULL' })
    @JoinColumn({ name: 'department_id' })
    departmentRel: HrDepartment;

    @Column({ name: 'designation_id', type: 'uuid', nullable: true })
    designationId: string;

    @ManyToOne(() => HrDesignation, { onDelete: 'SET NULL' })
    @JoinColumn({ name: 'designation_id' })
    designationRel: HrDesignation;

    @Column({ length: 100, nullable: true })
    designation: string; // Keep for backward compatibility or simple entry

    @Column({ length: 100, nullable: true })
    department: string;

    @Column({ type: 'date', nullable: true })
    joining_date: Date;

    @Column({
        type: 'enum',
        enum: ['ACTIVE', 'ON_LEAVE', 'TERMINATED', 'RESIGNED'],
        default: 'ACTIVE',
    })
    status: string;

    @Column({ name: 'supervisor_id', type: 'uuid', nullable: true })
    supervisorId: string;

    @ManyToOne(() => HrEmployee, { onDelete: 'SET NULL' })
    @JoinColumn({ name: 'supervisor_id' })
    supervisor: HrEmployee;

    @Column({ type: 'date', nullable: true })
    probation_end_date: Date;

    @Column({ type: 'date', nullable: true })
    contract_end_date: Date;

    @Column({ type: 'jsonb', nullable: true })
    emergency_contact: {
        name: string;
        relation: string;
        phone: string;
    };

    @Column({ length: 50, nullable: true })
    pan_number: string;

    @Column({ length: 50, nullable: true })
    citizenship_number: string;

    @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
    base_salary: number;

    @Column({ type: 'jsonb', nullable: true })
    bank_details: {
        bank_name: string;
        account_name: string;
        account_number: string;
        branch: string;
    };

    @OneToMany(() => HrDocument, (doc) => doc.employee)
    documents: HrDocument[];

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
