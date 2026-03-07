import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Organization } from './organizations.entity';
import { User } from './users.entity';

@Entity('audit_logs')
@Index('IDX_AUDIT_LOGS_ORG_ID', ['organization_id'])
@Index('IDX_AUDIT_LOGS_USER_ID', ['user_id'])
@Index('IDX_AUDIT_LOGS_ACTION', ['action'])
@Index('IDX_AUDIT_LOGS_ENTITY', ['entity_type', 'entity_id'])
@Index('IDX_AUDIT_LOGS_SEVERITY', ['severity'])
@Index('IDX_AUDIT_LOGS_CREATED_AT', ['created_at'])
export class AuditLog {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'uuid', nullable: true })
  organization_id: string | null;

  @ManyToOne(() => Organization, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization | null;

  @Column({ type: 'uuid', nullable: true })
  user_id: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'user_id' })
  user: User | null;

  @Column({ type: 'varchar', length: 100 })
  action: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  entity_type: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  entity_id: string | null;

  @Column({ type: 'json', nullable: true })
  old_values: Record<string, any> | null;

  @Column({ type: 'json', nullable: true })
  new_values: Record<string, any> | null;

  @Column({ type: 'varchar', length: 45, nullable: true })
  ip_address: string | null;

  @Column({ type: 'text', nullable: true })
  user_agent: string | null;

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, any> | null;

  @Column({
    type: 'enum',
    enum: ['critical', 'warning', 'info'],
    default: 'info',
    nullable: true
  })
  severity: 'critical' | 'warning' | 'info';

  @CreateDateColumn()
  created_at: Date;
}
