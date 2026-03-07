import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    OneToMany,
    ManyToOne,
    JoinColumn,
} from 'typeorm';
import { Organization } from '@src/database/entities/organizations.entity';
import { CmsFormSubmission } from './cms-form-submission.entity';

export enum CmsFormStatus {
    ACTIVE = 'ACTIVE',
    INACTIVE = 'INACTIVE',
}

@Entity('cms_forms')
export class CmsForm {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid' })
    organization_id: string;

    @Column({ type: 'varchar', length: 255 })
    name: string;

    @Column({ type: 'varchar', length: 255 })
    slug: string;

    @Column({ type: 'jsonb', nullable: true, default: '[]' })
    fields: Record<string, any>[];

    @Column({ type: 'boolean', default: false })
    crm_sync: boolean;

    @Column({ type: 'boolean', default: false })
    email_notify: boolean;

    @Column({ type: 'varchar', length: 255, nullable: true })
    notify_email: string;

    @Column({ type: 'enum', enum: CmsFormStatus, default: CmsFormStatus.ACTIVE })
    status: CmsFormStatus;

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;

    @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'organization_id' })
    organization: Organization;

    @OneToMany(() => CmsFormSubmission, (submission) => submission.form)
    submissions: CmsFormSubmission[];
}
