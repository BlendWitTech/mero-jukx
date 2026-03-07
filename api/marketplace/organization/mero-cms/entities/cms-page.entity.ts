import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    DeleteDateColumn,
    ManyToOne,
    JoinColumn,
} from 'typeorm';
import { Organization } from '@src/database/entities/organizations.entity';
import { User } from '@src/database/entities/users.entity';

export enum CmsPageStatus {
    DRAFT = 'DRAFT',
    PUBLISHED = 'PUBLISHED',
    ARCHIVED = 'ARCHIVED',
}

@Entity('cms_pages')
export class CmsPage {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid' })
    organization_id: string;

    @Column({ type: 'varchar', length: 255 })
    title: string;

    @Column({ type: 'varchar', length: 255, unique: false })
    slug: string;

    @Column({ type: 'jsonb', nullable: true })
    content: Record<string, any>;

    @Column({ type: 'varchar', length: 255, nullable: true })
    meta_title: string;

    @Column({ type: 'text', nullable: true })
    meta_description: string;

    @Column({ type: 'enum', enum: CmsPageStatus, default: CmsPageStatus.DRAFT })
    status: CmsPageStatus;

    @Column({ type: 'timestamp', nullable: true })
    published_at: Date;

    @Column({ type: 'uuid', nullable: true })
    created_by: string;

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;

    @DeleteDateColumn()
    deleted_at: Date;

    @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'organization_id' })
    organization: Organization;

    @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'created_by' })
    creator: User;
}
