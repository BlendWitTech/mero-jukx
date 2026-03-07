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
import { User } from './users.entity';
import { CrmLead } from './crm_leads.entity';
import { CrmDeal } from './crm_deals.entity';
import { CrmClient } from './crm_clients.entity';

@Entity('crm_activities')
export class CrmActivity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'organization_id', type: 'uuid' })
    organizationId: string;

    @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'organization_id' })
    organization: Organization;

    @Column({
        type: 'enum',
        enum: ['CALL', 'MEETING', 'TASK', 'EMAIL', 'NOTE'],
    })
    type: string;

    @Column({ length: 255 })
    subject: string;

    @Column({ type: 'text', nullable: true })
    description: string;

    @Column({ type: 'timestamp', nullable: true })
    due_date: Date;

    @Column({
        type: 'enum',
        enum: ['PENDING', 'COMPLETED', 'CANCELLED'],
        default: 'PENDING',
    })
    status: string;

    @Column({ name: 'lead_id', type: 'uuid', nullable: true })
    leadId: string;

    @ManyToOne(() => CrmLead, (lead) => lead.activities, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'lead_id' })
    lead: CrmLead;

    @Column({ name: 'deal_id', type: 'uuid', nullable: true })
    dealId: string;

    @ManyToOne(() => CrmDeal, (deal) => deal.activities, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'deal_id' })
    deal: CrmDeal;

    @Column({ name: 'client_id', type: 'uuid', nullable: true })
    clientId: string;

    @ManyToOne(() => CrmClient, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'client_id' })
    client: CrmClient;

    @Column({ name: 'assigned_to', type: 'uuid', nullable: true })
    assignedToId: string;

    @ManyToOne(() => User, { onDelete: 'SET NULL' })
    @JoinColumn({ name: 'assigned_to' })
    assignedTo: User;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
