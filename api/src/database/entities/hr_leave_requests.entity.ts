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
import { User } from './users.entity';

@Entity('hr_leave_requests')
export class HrLeaveRequest {
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

    @Column({
        type: 'enum',
        enum: ['SICK', 'CASUAL', 'ANNUAL', 'MATERNITY', 'PATERNITY', 'UNPAID', 'OTHER'],
        default: 'CASUAL',
    })
    leave_type: string;

    @Column({ type: 'date' })
    start_date: Date;

    @Column({ type: 'date' })
    end_date: Date;

    @Column({ type: 'decimal', precision: 4, scale: 1 })
    total_days: number;

    @Column({ type: 'text' })
    reason: string;

    @Column({
        type: 'enum',
        enum: ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'],
        default: 'PENDING',
    })
    status: string;

    @Column({ name: 'approved_by', type: 'uuid', nullable: true })
    approvedById: string;

    @ManyToOne(() => User, { onDelete: 'SET NULL' })
    @JoinColumn({ name: 'approved_by' })
    approvedBy: User;

    @Column({ type: 'text', nullable: true })
    admin_remarks: string;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
