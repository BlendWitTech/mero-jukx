import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
} from 'typeorm';
import { CmsForm } from './cms-form.entity';

@Entity('cms_form_submissions')
export class CmsFormSubmission {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid' })
    form_id: string;

    @Column({ type: 'uuid' })
    organization_id: string;

    @Column({ type: 'jsonb' })
    data: Record<string, any>;

    @CreateDateColumn()
    submitted_at: Date;

    @Column({ type: 'varchar', length: 50, nullable: true })
    ip_address: string;

    @Column({ type: 'uuid', nullable: true })
    crm_lead_id: string;

    @ManyToOne(() => CmsForm, (form) => form.submissions, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'form_id' })
    form: CmsForm;
}
