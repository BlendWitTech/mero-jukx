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

@Entity('hr_exit_records')
export class HrExitRecord {
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
        enum: ['RESIGNATION', 'TERMINATION', 'RETIREMENT', 'MUTUAL_SEPARATION', 'CONTRACT_END', 'DEATH', 'OTHER'],
        default: 'RESIGNATION',
    })
    reason: string;

    @Column({
        type: 'enum',
        enum: ['VOLUNTARY', 'INVOLUNTARY'],
        default: 'VOLUNTARY',
    })
    separation_type: string;

    @Column({ type: 'date' })
    last_working_day: Date;

    @Column({ type: 'int', nullable: true })
    notice_period_days: number;

    @Column({ type: 'int', nullable: true })
    notice_served_days: number;

    @Column({ type: 'date', nullable: true })
    exit_interview_date: Date;

    @Column({ name: 'exit_interview_by_id', type: 'uuid', nullable: true })
    exitInterviewById: string;

    @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
    @JoinColumn({ name: 'exit_interview_by_id' })
    exitInterviewBy: User;

    @Column({ type: 'text', nullable: true })
    feedback: string;

    @Column({ type: 'text', nullable: true })
    handover_notes: string;

    @Column({
        type: 'enum',
        enum: ['PENDING', 'PARTIAL', 'COMPLETED'],
        default: 'PENDING',
    })
    clearance_status: string;

    @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
    final_settlement_amount: number;

    @Column({ type: 'date', nullable: true })
    final_settlement_date: Date;

    @Column({
        type: 'enum',
        enum: ['INITIATED', 'IN_PROGRESS', 'COMPLETED'],
        default: 'INITIATED',
    })
    status: string;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
