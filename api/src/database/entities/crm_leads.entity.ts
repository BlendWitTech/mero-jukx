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
import { User } from './users.entity';
import { CrmDeal } from './crm_deals.entity';
import { CrmActivity } from './crm_activities.entity';

// Note: Organization entity might be named 'organizations.entity.ts' and class 'Organization'
// Checking list_dir of entities: organizations.entity.ts, users.entity.ts
// So imports should be relative to this file.

@Entity('crm_leads')
export class CrmLead {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'organization_id', type: 'uuid' })
    organizationId: string;

    @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'organization_id' })
    organization: Organization;

    @Column({ length: 255 })
    first_name: string;

    @Column({ length: 255, nullable: true })
    last_name: string;

    @Column({ length: 255, nullable: true })
    email: string;

    @Column({ length: 50, nullable: true })
    phone: string;

    @Column({ length: 255, nullable: true })
    company: string;

    @Column({ length: 100, nullable: true })
    job_title: string;

    @Column({ length: 100, nullable: true })
    country: string;

    @Column({ length: 100, nullable: true })
    city: string;

    @Column({ length: 100, nullable: true })
    territory: string;

    @Column({
        type: 'enum',
        enum: ['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST'],
        default: 'NEW',
    })
    status: string;

    @Column({ length: 50, nullable: true })
    source: string; // Web, Referral, etc.

    @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
    estimated_value: number;

    @Column({ type: 'int', default: 0 })
    score: number;

    @Column({ type: 'jsonb', nullable: true })
    tags: string[];

    @Column({ type: 'text', nullable: true })
    win_loss_reason: string;

    @Column({ name: 'assigned_to', type: 'uuid', nullable: true })
    assignedToId: string;

    @ManyToOne(() => User, { onDelete: 'SET NULL' })
    @JoinColumn({ name: 'assigned_to' })
    assignedTo: User;

    @Column({ type: 'jsonb', nullable: true })
    custom_fields: Record<string, any>;

    @OneToMany(() => CrmDeal, (deal) => deal.lead)
    deals: CrmDeal[];

    @OneToMany(() => CrmActivity, (activity) => activity.lead)
    activities: CrmActivity[];

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
