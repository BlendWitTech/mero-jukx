import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    OneToMany,
    JoinColumn,
} from 'typeorm';
import { Organization } from './organizations.entity';
import { User } from './users.entity';

export enum WorkflowExecutionStatus {
    RUNNING = 'RUNNING',
    COMPLETED = 'COMPLETED',
    FAILED = 'FAILED',
}

@Entity('workflow_templates')
export class WorkflowTemplate {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'organization_id', type: 'uuid', nullable: true })
    organizationId: string | null;

    @ManyToOne(() => Organization, { nullable: true, onDelete: 'CASCADE' })
    @JoinColumn({ name: 'organization_id' })
    organization: Organization | null;

    @Column({ length: 255 })
    name: string;

    @Column({ type: 'text', nullable: true })
    description: string | null;

    @Column({ type: 'jsonb', default: [] })
    nodes: any[];

    @Column({ type: 'jsonb', default: [] })
    edges: any[];

    @Column({ name: 'is_active', type: 'boolean', default: true })
    isActive: boolean;

    @Column({ name: 'is_system_template', type: 'boolean', default: false })
    isSystemTemplate: boolean;

    @Column({ name: 'created_by', type: 'uuid', nullable: true })
    createdBy: string | null;

    @OneToMany(() => WorkflowExecution, (exec) => exec.workflow)
    executions: WorkflowExecution[];

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}

@Entity('workflow_executions')
export class WorkflowExecution {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'workflow_id', type: 'uuid' })
    workflowId: string;

    @ManyToOne(() => WorkflowTemplate, (wf) => wf.executions, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'workflow_id' })
    workflow: WorkflowTemplate;

    @Column({ name: 'organization_id', type: 'uuid' })
    organizationId: string;

    @Column({ name: 'trigger_data', type: 'jsonb', nullable: true })
    triggerData: Record<string, any> | null;

    @Column({
        type: 'enum',
        enum: WorkflowExecutionStatus,
        default: WorkflowExecutionStatus.RUNNING,
    })
    status: WorkflowExecutionStatus;

    @Column({ name: 'steps_log', type: 'jsonb', default: [] })
    stepsLog: any[];

    @CreateDateColumn({ name: 'started_at' })
    startedAt: Date;

    @Column({ name: 'completed_at', type: 'timestamp', nullable: true })
    completedAt: Date | null;
}
