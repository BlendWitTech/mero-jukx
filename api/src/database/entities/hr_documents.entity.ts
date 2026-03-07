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

@Entity('hr_documents')
export class HrDocument {
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
        enum: ['CITIZENSHIP', 'PASSPORT', 'CONTRACT', 'CERTIFICATE', 'TRAINING', 'OTHER'],
        default: 'OTHER',
    })
    type: string;

    @Column({ length: 255 })
    name: string;

    @Column({ type: 'text' })
    file_url: string;

    @Column({ type: 'date', nullable: true })
    expiry_date: Date;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
