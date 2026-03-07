import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './users.entity';
import { Organization } from './organizations.entity';

@Entity('sessions')
@Index('IDX_SESSIONS_USER_ID', ['user_id'])
@Index('IDX_SESSIONS_ORG_ID', ['organization_id'])
@Index('IDX_SESSIONS_EXPIRES_AT', ['expires_at'])
export class Session {
  @PrimaryColumn({ type: 'varchar', length: 255 })
  id: string;

  @Column({ type: 'uuid' })
  user_id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'uuid', nullable: true })
  organization_id: string | null;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization | null;

  @Column({ type: 'text', nullable: true })
  access_token: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true, unique: true })
  refresh_token: string | null;

  @Column({ type: 'varchar', length: 45, nullable: true })
  ip_address: string | null;

  @Column({ type: 'text', nullable: true })
  user_agent: string | null;

  @Column({ type: 'timestamp' })
  expires_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  revoked_at: Date | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // Helper method
  isExpired(): boolean {
    return new Date() > this.expires_at || this.revoked_at !== null;
  }
}
