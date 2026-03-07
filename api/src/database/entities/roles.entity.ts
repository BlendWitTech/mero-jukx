import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { Organization } from './organizations.entity';
import { OrganizationMember } from './organization_members.entity';
import { RolePermission } from './role_permissions.entity';
import { App } from './apps.entity';

@Entity('roles')
@Unique(['organization_id', 'slug'])
@Index('IDX_ROLES_ORG_ID', ['organization_id'])
@Index('IDX_ROLES_APP_ID', ['app_id'])
@Index('IDX_ROLES_SYSTEM_ROLE', ['is_system_role'])
@Index('IDX_ROLES_ACTIVE', ['is_active'])
export class Role {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'uuid', nullable: true })
  organization_id: string | null;

  @ManyToOne(() => Organization, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization | null;

  @Column({ type: 'int', nullable: true })
  app_id: number | null;

  @ManyToOne(() => App, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'app_id' })
  app: App | null;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 100 })
  slug: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'boolean', default: false })
  is_system_role: boolean;

  @Column({ type: 'boolean', default: false })
  is_organization_owner: boolean;

  @Column({ type: 'boolean', default: false })
  is_default: boolean;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @Column({ type: 'int', nullable: true })
  hierarchy_level: number | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn()
  deleted_at: Date | null;

  // Relations
  @OneToMany(() => OrganizationMember, (member) => member.role)
  members: OrganizationMember[];

  @OneToMany(() => RolePermission, (rolePermission) => rolePermission.role)
  role_permissions: RolePermission[];
}
