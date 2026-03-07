import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn,
} from 'typeorm';
import { Organization } from '@src/database/entities/organizations.entity';

@Entity('cms_settings')
export class CmsSettings {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid', unique: true })
    organization_id: string;

    @Column({ type: 'varchar', length: 255, nullable: true })
    site_name: string;

    @Column({ type: 'text', nullable: true })
    site_description: string;

    @Column({ type: 'varchar', length: 500, nullable: true })
    logo_url: string;

    @Column({ type: 'varchar', length: 500, nullable: true })
    favicon_url: string;

    @Column({ type: 'varchar', length: 20, nullable: true, default: '#3b82f6' })
    primary_color: string;

    @Column({ type: 'text', nullable: true })
    custom_css: string;

    @Column({ type: 'varchar', length: 255, nullable: true })
    custom_domain: string;

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;

    @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'organization_id' })
    organization: Organization;
}
