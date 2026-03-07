import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn,
    OneToMany,
    ManyToMany,
    JoinTable,
} from 'typeorm';
import { Organization } from './organizations.entity';
import { User } from './users.entity';
import { CrmLead } from './crm_leads.entity';
import { CrmActivity } from './crm_activities.entity';
import { CrmDealItem } from './crm_deal_items.entity';
import { CrmPipeline } from './crm_pipelines.entity';
import { CrmStage } from './crm_stages.entity';

@Entity('crm_deals')
export class CrmDeal {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'organization_id', type: 'uuid' })
    organizationId: string;

    @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'organization_id' })
    organization: Organization;

    @Column({ length: 255 })
    title: string;

    @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
    value: number;

    @Column({ length: 10, default: 'NPR' })
    currency: string;

    @Column({ name: 'pipeline_id', type: 'uuid', nullable: true })
    pipelineId: string;

    @ManyToOne(() => CrmPipeline)
    @JoinColumn({ name: 'pipeline_id' })
    pipeline: CrmPipeline;

    @Column({ name: 'stage_id', type: 'uuid', nullable: true })
    stageId: string;

    @ManyToOne(() => CrmStage)
    @JoinColumn({ name: 'stage_id' })
    stage: CrmStage;

    @Column({ length: 50, default: 'NEW' })
    stageName: string;

    @Column({ type: 'date', nullable: true })
    expected_close_date: Date;

    @Column({ name: 'lead_id', type: 'uuid', nullable: true })
    leadId: string;

    @ManyToOne(() => CrmLead, (lead) => lead.deals, { onDelete: 'SET NULL' })
    @JoinColumn({ name: 'lead_id' })
    lead: CrmLead;

    @Column({ name: 'assigned_to', type: 'uuid', nullable: true })
    assignedToId: string;

    @ManyToOne(() => User, { onDelete: 'SET NULL' })
    @JoinColumn({ name: 'assigned_to' })
    assignedTo: User;

    @Column({ type: 'int', default: 0 })
    probability: number;

    @Column({
        type: 'enum',
        enum: ['OPEN', 'WON', 'LOST'],
        default: 'OPEN',
    })
    status: string;

    @Column({ type: 'text', nullable: true })
    win_loss_reason: string;

    @Column({ type: 'jsonb', nullable: true })
    competitors: string[];

    @OneToMany(() => CrmActivity, (activity) => activity.deal)
    activities: CrmActivity[];

    @OneToMany(() => CrmDealItem, (item) => item.deal, { cascade: true })
    items: CrmDealItem[];

    @ManyToMany(() => User)
    @JoinTable({
        name: 'crm_deal_team_members',
        joinColumn: { name: 'deal_id', referencedColumnName: 'id' },
        inverseJoinColumn: { name: 'user_id', referencedColumnName: 'id' }
    })
    teamMembers: User[];

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
