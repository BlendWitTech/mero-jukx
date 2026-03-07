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
} from 'typeorm';
import { Package } from './packages.entity';
import { OrganizationMember } from './organization_members.entity';
import { Role } from './roles.entity';
import { Invitation } from './invitations.entity';
import { OrganizationPackageFeature } from './organization_package_features.entity';
import { OrganizationDocument } from './organization_documents.entity';

export enum OrganizationStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  DELETED = 'deleted',
}

export enum OrganizationType {
  MAIN = 'MAIN',
  BRANCH = 'BRANCH',
  CREATOR = 'CREATOR',
}

@Entity('organizations')
@Index('IDX_ORGANIZATIONS_STATUS', ['status'])
@Index('IDX_ORGANIZATIONS_PACKAGE_ID', ['package_id'])
@Index('IDX_ORGANIZATIONS_PARENT_ID', ['parent_id'])
@Index('IDX_ORGANIZATIONS_PACKAGE_EXPIRES_AT', ['package_expires_at'])
export class Organization {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  name: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  slug: string;

  @Column({ type: 'varchar', length: 255, unique: true, nullable: true })
  email: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  phone: string | null;

  @Column({ type: 'text', nullable: true })
  address: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  city: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  state: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  country: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  postal_code: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  website: string | null;

  @Column({ type: 'varchar', length: 10, default: 'USD' })
  currency: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  logo_url: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  favicon_url: string | null;

  @Column({ type: 'varchar', length: 7, nullable: true })
  primary_color: string | null;

  @Column({ type: 'varchar', length: 7, nullable: true })
  secondary_color: string | null;

  @Column({ type: 'text', nullable: true })
  custom_css: string | null;

  @Column({ type: 'text', nullable: true })
  custom_js: string | null;

  @Column({ type: 'text', nullable: true })
  footer_text: string | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  tax_id: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  registration_number: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  industry: string | null;

  @Column({ type: 'int' })
  package_id: number;

  @ManyToOne(() => Package)
  @JoinColumn({ name: 'package_id' })
  package: Package;

  @Column({ type: 'int', default: 10 })
  user_limit: number;

  @Column({ type: 'int', default: 2 })
  role_limit: number;

  @Column({ type: 'int', default: 1 })
  branch_limit: number;

  @Column({ type: 'varchar', length: 100, nullable: true })
  timezone: string;

  @Column({ type: 'varchar', length: 10, default: 'en' })
  language: string;

  @Column({ type: 'varchar', length: 20, default: 'YYYY-MM-DD' })
  date_format: string;

  @Column({ type: 'varchar', length: 10, default: 'HH:mm' })
  time_format: string;

  @Column({ type: 'boolean', default: false })
  mfa_enabled: boolean;

  @Column({ type: 'boolean', default: false })
  email_verified: boolean;

  @Column({
    type: 'enum',
    enum: OrganizationStatus,
    default: OrganizationStatus.ACTIVE,
  })
  status: OrganizationStatus;

  @Column({ type: 'timestamp', nullable: true })
  package_expires_at: Date | null;

  @Column({ type: 'boolean', default: false })
  package_auto_renew: boolean;

  @Column({ type: 'text', nullable: true })
  package_auto_renew_credentials: string | null;

  @Column({ type: 'boolean', default: false })
  has_upgraded_from_freemium: boolean;

  @Column({ type: 'uuid', nullable: true })
  parent_id: string | null;

  @Column({
    type: 'enum',
    enum: OrganizationType,
    default: OrganizationType.MAIN,
  })
  org_type: OrganizationType;

  @Column({ type: 'text', array: true, nullable: true })
  ip_whitelist: string[] | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  pan_number: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  vat_number: string | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn()
  deleted_at: Date | null;

  // Relations
  @OneToMany(() => OrganizationMember, (member) => member.organization)
  members: OrganizationMember[];

  @OneToMany(() => Role, (role) => role.organization)
  roles: Role[];

  @OneToMany(() => Invitation, (invitation) => invitation.organization)
  invitations: Invitation[];

  @OneToMany(() => OrganizationPackageFeature, (feature) => feature.organization)
  package_features: OrganizationPackageFeature[];

  @OneToMany(() => OrganizationDocument, (doc) => doc.organization)
  documents: OrganizationDocument[];

  @ManyToOne(() => Organization, (org) => org.branches)
  @JoinColumn({ name: 'parent_id' })
  parent: Organization | null;

  @OneToMany(() => Organization, (org) => org.parent)
  branches: Organization[];
}
