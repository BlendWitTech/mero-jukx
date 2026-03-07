import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn,
} from 'typeorm';
import { HrEmployee } from './hr_employees.entity';
import { Organization } from './organizations.entity';

@Entity('hr_payroll')
export class HrPayroll {
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

    @Column({ length: 20 })
    month: string; // e.g., "2024-03" (Gregorian) or "2080-Chaitra" (BS)

    @Column({ type: 'date' })
    period_start: Date;

    @Column({ type: 'date' })
    period_end: Date;

    @Column({ type: 'decimal', precision: 15, scale: 2 })
    basic_salary: number;

    @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
    allowances: number;

    @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
    overtime: number;

    @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
    bonus: number;

    @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
    ssf_contribution_employee: number; // 11%

    @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
    ssf_contribution_employer: number; // 20%

    @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
    cit_contribution: number;

    @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
    income_tax: number;

    @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
    loan_deduction: number;

    @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
    advance_deduction: number;

    @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
    other_deductions: number;

    @Column({ type: 'decimal', precision: 15, scale: 2 })
    net_salary: number;

    @Column({
        type: 'enum',
        enum: ['DRAFT', 'PROCESSED', 'PAID'],
        default: 'DRAFT',
    })
    status: string;

    @Column({ type: 'date', nullable: true })
    payment_date: Date;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
