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

export enum CostCenterType {
    COST_CENTER = 'COST_CENTER',
    PROFIT_CENTER = 'PROFIT_CENTER',
}

@Entity('cost_centers')
export class CostCenter {
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

    @Column({
        type: 'enum',
        enum: CostCenterType,
        default: CostCenterType.COST_CENTER,
    })
    type: CostCenterType;

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
