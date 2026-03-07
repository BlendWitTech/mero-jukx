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

export enum CmsPostStatus {
    DRAFT = 'DRAFT',
    PUBLISHED = 'PUBLISHED',
    ARCHIVED = 'ARCHIVED',
}

@Entity('cms_posts')
export class CmsPost {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid' })
    organization_id: string;

    @Column({ type: 'varchar', length: 255 })
    title: string;

    @Column({ type: 'varchar', length: 255 })
    slug: string;

    @Column({ type: 'text', nullable: true })
    content: string;

    @Column({ type: 'text', nullable: true })
    excerpt: string;

    @Column({ type: 'varchar', length: 500, nullable: true })
    featured_image: string;

    @Column({ type: 'uuid', nullable: true })
    author_id: string;

    @Column({ type: 'varchar', length: 100, nullable: true })
    category: string;

    @Column({ type: 'jsonb', nullable: true, default: '[]' })
    tags: string[];

    @Column({ type: 'enum', enum: CmsPostStatus, default: CmsPostStatus.DRAFT })
    status: CmsPostStatus;

    @Column({ type: 'varchar', length: 255, nullable: true })
    meta_title: string;

    @Column({ type: 'text', nullable: true })
    meta_description: string;

    @Column({ type: 'timestamp', nullable: true })
    published_at: Date;

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
    @JoinColumn({ name: 'author_id' })
    author: User;
}
