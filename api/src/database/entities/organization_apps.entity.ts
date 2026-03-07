import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { Organization } from './organizations.entity';
import { App } from './apps.entity';
import { Payment } from './payments.entity';

export enum OrganizationAppStatus {
  TRIAL = 'trial',
  ACTIVE = 'active',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired',
  PENDING_PAYMENT = 'pending_payment',
}

export enum OrganizationAppBillingPeriod {
  MONTHLY = 'monthly',
  YEARLY = 'yearly',
}

@Entity('organization_apps')
@Unique(['organization_id', 'app_id'])
@Index(['organization_id'])
@Index(['app_id'])
@Index(['status'])
@Index(['subscription_end'])
@Index(['next_billing_date'])
export class OrganizationApp {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'uuid' })
  organization_id: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @Column({ type: 'int' })
  app_id: number;

  @ManyToOne(() => App, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'app_id' })
  app: App;

  // Subscription Status
  @Column({
    type: 'enum',
    enum: OrganizationAppStatus,
    default: OrganizationAppStatus.TRIAL,
  })
  status: OrganizationAppStatus;

  // Subscription Dates
  @Column({ type: 'timestamp' })
  subscription_start: Date;

  @Column({ type: 'timestamp' })
  subscription_end: Date;

  @Column({ type: 'timestamp', nullable: true })
  next_billing_date: Date | null;

  // Trial Information
  @Column({ type: 'timestamp', nullable: true })
  trial_ends_at: Date | null;

  @Column({ type: 'boolean', default: false })
  trial_used: boolean; // Whether trial was already used

  // Cancellation
  @Column({ type: 'timestamp', nullable: true })
  cancelled_at: Date | null;

  @Column({ type: 'text', nullable: true })
  cancellation_reason: string | null;

  // Auto-renewal
  @Column({ type: 'boolean', default: true })
  auto_renew: boolean;

  // Payment Tracking
  @Column({ type: 'uuid', nullable: true })
  payment_id: string | null; // Reference to payment entity

  @ManyToOne(() => Payment, { nullable: true })
  @JoinColumn({ name: 'payment_id' })
  payment: Payment | null;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  subscription_price: number; // Price at time of subscription

  @Column({
    type: 'enum',
    enum: OrganizationAppBillingPeriod,
  })
  billing_period: OrganizationAppBillingPeriod;

  // Timestamps
  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}

