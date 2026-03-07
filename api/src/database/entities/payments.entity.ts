import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Organization } from './organizations.entity';
import { User } from './users.entity';

export enum PaymentStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
}

export enum PaymentGateway {
  ESEWA = 'esewa',
  STRIPE = 'stripe',
  KHALTI = 'khalti',
  CONNECT_IPS = 'connect_ips',
  PAYPAL = 'paypal',
  IME_PAY = 'ime_pay',
}

export enum PaymentType {
  PACKAGE_UPGRADE = 'package_upgrade',
  SUBSCRIPTION = 'subscription',
  ONE_TIME = 'one_time',
}

@Entity('payments')
@Index(['organization_id'])
@Index(['user_id'])
@Index(['transaction_id'], { unique: true })
@Index(['status'])
@Index(['gateway'])
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  @Index()
  organization_id: string;

  @ManyToOne(() => Organization)
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @Column({ type: 'uuid' })
  @Index()
  user_id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'varchar', length: 255, unique: true })
  transaction_id: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  reference_id: string | null; // eSewa reference ID

  @Column({ type: 'enum', enum: PaymentGateway })
  gateway: PaymentGateway;

  @Column({ type: 'enum', enum: PaymentType })
  payment_type: PaymentType;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ type: 'varchar', length: 10, default: 'NPR' })
  currency: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'enum', enum: PaymentStatus, default: PaymentStatus.PENDING })
  status: PaymentStatus;

  @Column({ type: 'text', nullable: true })
  gateway_response: string | null; // JSON response from gateway

  @Column({ type: 'text', nullable: true })
  failure_reason: string | null;

  @Column({ type: 'timestamp', nullable: true })
  completed_at: Date | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null; // Additional payment metadata

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
