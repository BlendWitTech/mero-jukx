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
import { FiscalYear } from './banking_fiscal.entity';
import { HrDepartment } from './hr_departments.entity';
import { Project } from './projects.entity';
import { Account } from './accounts.entity';

export enum BudgetType {
    GLOBAL = 'GLOBAL',
    DEPARTMENT = 'DEPARTMENT',
    PROJECT = 'PROJECT',
}

@Entity('budgets')
export class Budget {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'organization_id', type: 'uuid' })
    organizationId: string;

    @ManyToOne(() => Organization)
    @JoinColumn({ name: 'organization_id' })
    organization: Organization;

    @Column({ name: 'fiscal_year_id', type: 'uuid' })
    fiscalYearId: string;

    @ManyToOne(() => FiscalYear)
    @JoinColumn({ name: 'fiscal_year_id' })
    fiscalYear: FiscalYear;

    @Column({ length: 255 })
    name: string;

    @Column({
        type: 'enum',
        enum: BudgetType,
        default: BudgetType.GLOBAL,
    })
    type: BudgetType;

    @Column({ name: 'department_id', type: 'uuid', nullable: true })
    departmentId: string;

    @ManyToOne(() => HrDepartment)
    @JoinColumn({ name: 'department_id' })
    department: HrDepartment;

    @Column({ name: 'project_id', type: 'uuid', nullable: true })
    projectId: string;

    @ManyToOne(() => Project)
    @JoinColumn({ name: 'project_id' })
    project: Project;

    @OneToMany(() => BudgetLine, (line) => line.budget, { cascade: true })
    lines: BudgetLine[];

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}

@Entity('budget_lines')
export class BudgetLine {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'budget_id', type: 'uuid' })
    budgetId: string;

    @ManyToOne(() => Budget, (budget) => budget.lines, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'budget_id' })
    budget: Budget;

    @Column({ name: 'account_id', type: 'uuid' })
    accountId: string;

    @ManyToOne(() => Account)
    @JoinColumn({ name: 'account_id' })
    account: Account;

    @Column({ name: 'allocated_amount', type: 'decimal', precision: 15, scale: 2 })
    allocatedAmount: number;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
}
