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

@Entity('exchange_rates')
export class ExchangeRate {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'organization_id', type: 'uuid', nullable: true })
    organizationId: string;

    @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'organization_id' })
    organization: Organization;

    @Column({ name: 'base_currency', length: 10, default: 'NPR' })
    baseCurrency: string;

    @Column({ name: 'target_currency', length: 10 })
    targetCurrency: string;

    @Column({ type: 'decimal', precision: 15, scale: 6 })
    rate: number;

    @Column({ name: 'effective_date', type: 'date' })
    effectiveDate: Date;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
