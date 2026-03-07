import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
  Index,
} from 'typeorm';
import { Role } from './roles.entity';
import { Permission } from './permissions.entity';

@Entity('role_permissions')
@Unique(['role_id', 'permission_id'])
@Index('IDX_ROLE_PERMS_ROLE_ID', ['role_id'])
@Index('IDX_ROLE_PERMS_PERM_ID', ['permission_id'])
export class RolePermission {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  role_id: number;

  @ManyToOne(() => Role, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'role_id' })
  role: Role;

  @Column({ type: 'int' })
  permission_id: number;

  @ManyToOne(() => Permission, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'permission_id' })
  permission: Permission;

  @CreateDateColumn()
  created_at: Date;
}
