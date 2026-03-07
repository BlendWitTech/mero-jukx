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

@Entity('hr_attendance')
export class HrAttendance {
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

    @Column({ type: 'date' })
    date: Date;

    @Column({ type: 'timestamp', nullable: true })
    check_in: Date;

    @Column({ type: 'timestamp', nullable: true })
    check_out: Date;

    @Column({
        type: 'enum',
        enum: ['PRESENT', 'ABSENT', 'LATE', 'ON_LEAVE', 'HOLIDAY'],
        default: 'PRESENT',
    })
    status: string;

    @Column({ type: 'point', nullable: true })
    location: string; // GPS point for check-in

    @Column({ type: 'text', nullable: true })
    remarks: string;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
