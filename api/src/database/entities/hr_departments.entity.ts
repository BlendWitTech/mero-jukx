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
import { HrEmployee } from './hr_employees.entity';

@Entity('hr_departments')
export class HrDepartment {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'organization_id', type: 'uuid' })
    organizationId: string;

    @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'organization_id' })
    organization: Organization;

    @Column({ length: 255 })
    name: string;

    @Column({ length: 50, nullable: true })
    code: string;

    @Column({ name: 'parent_id', type: 'uuid', nullable: true })
    parentId: string;

    @ManyToOne(() => HrDepartment, (dept) => dept.children, { onDelete: 'SET NULL' })
    @JoinColumn({ name: 'parent_id' })
    parent: HrDepartment;

    @OneToMany(() => HrDepartment, (dept) => dept.parent)
    children: HrDepartment[];

    @Column({ name: 'manager_id', type: 'uuid', nullable: true })
    managerId: string;

    @ManyToOne(() => HrEmployee, { onDelete: 'SET NULL' })
    @JoinColumn({ name: 'manager_id' })
    manager: HrEmployee;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
