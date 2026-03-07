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

@Entity('hr_public_holidays')
export class HrPublicHoliday {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'organization_id', type: 'uuid' })
    organizationId: string;

    @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'organization_id' })
    organization: Organization;

    @Column({ type: 'varchar', length: 150 })
    name: string; // e.g. "Dashain", "Tihar", "Republic Day"

    @Column({ type: 'date' })
    date: Date;

    /** Gregorian year for filtering */
    @Column({ type: 'int' })
    year: number;

    /** Nepali fiscal year e.g. "2080/81" */
    @Column({ type: 'varchar', length: 10, nullable: true })
    nepali_year: string;

    @Column({ type: 'boolean', default: true })
    is_paid: boolean; // paid holiday vs unpaid

    @Column({ type: 'text', nullable: true })
    description: string;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
