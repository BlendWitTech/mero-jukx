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
// import { CrmPipeline } from './crm_pipelines.entity';

@Entity('crm_stages')
export class CrmStage {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    name: string;

    @Column({ type: 'int', default: 0 })
    order: number;

    @Column({ type: 'int', default: 0 })
    probability: number;

    @Column({ name: 'pipeline_id' })
    pipelineId: string;

    @ManyToOne('CrmPipeline', (pipeline: any) => pipeline.stages, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'pipeline_id' })
    pipeline: any;

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
