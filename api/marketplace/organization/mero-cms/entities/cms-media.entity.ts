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
import { User } from '@src/database/entities/users.entity';

@Entity('cms_media')
export class CmsMedia {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid' })
    organization_id: string;

    @Column({ type: 'varchar', length: 255 })
    filename: string;

    @Column({ type: 'varchar', length: 255 })
    original_name: string;

    @Column({ type: 'varchar', length: 100 })
    mime_type: string;

    @Column({ type: 'bigint', default: 0 })
    size: number;

    @Column({ type: 'varchar', length: 1000 })
    url: string;

    @Column({ type: 'varchar', length: 255, nullable: true, default: 'general' })
    folder: string;

    @Column({ type: 'varchar', length: 255, nullable: true })
    alt_text: string;

    @Column({ type: 'uuid', nullable: true })
    uploaded_by: string;

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;

    @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'organization_id' })
    organization: Organization;

    @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'uploaded_by' })
    uploader: User;
}
