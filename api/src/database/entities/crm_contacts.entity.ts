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
import { CrmClient } from './crm_clients.entity';

@Entity('crm_contacts')
export class CrmContact {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    first_name: string;

    @Column({ nullable: true })
    last_name: string;

    @Column({ nullable: true })
    email: string;

    @Column({ nullable: true })
    phone: string;

    @Column({ nullable: true })
    job_title: string;

    @Column({ default: false })
    is_primary: boolean;

    @Column({ name: 'client_id' })
    clientId: string;

    @ManyToOne(() => CrmClient, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'client_id' })
    client: CrmClient;

    @Column({ name: 'organization_id' })
    organizationId: string;

    @ManyToOne(() => Organization)
    @JoinColumn({ name: 'organization_id' })
    organization: Organization;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
