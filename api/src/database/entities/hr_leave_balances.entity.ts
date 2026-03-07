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

@Entity('hr_leave_balances')
export class HrLeaveBalance {
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

    /** e.g. SICK, CASUAL, ANNUAL, MATERNITY, PATERNITY */
    @Column({ type: 'varchar', length: 30 })
    leave_type: string;

    /** Nepali fiscal year e.g. "2080/81" */
    @Column({ type: 'varchar', length: 10 })
    fiscal_year: string;

    @Column({ type: 'decimal', precision: 5, scale: 1, default: 0 })
    entitled_days: number; // total days this FY

    @Column({ type: 'decimal', precision: 5, scale: 1, default: 0 })
    used_days: number; // days consumed

    @Column({ type: 'decimal', precision: 5, scale: 1, default: 0 })
    carried_forward: number; // balance from previous FY

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
