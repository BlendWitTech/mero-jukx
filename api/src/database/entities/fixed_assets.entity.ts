import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    OneToMany,
    JoinColumn,
} from 'typeorm';
import { Organization } from './organizations.entity';
import { Account } from './accounts.entity';
import { Vendor } from './vendors_purchase_invoices.entity';
import { JournalEntry } from './journal_entries.entity';

export enum DepreciationMethod {
    STRAIGHT_LINE = 'STRAIGHT_LINE',
    WDV = 'WDV', // Written Down Value / Reducing Balance
    UNIT_OF_PRODUCTION = 'UNIT_OF_PRODUCTION',
}

export enum DepreciationBlock {
    A = 'A', // 5%
    B = 'B', // 25%
    C = 'C', // 20%
    D = 'D', // 15%
    E = 'E', // Softwares etc
}

export enum AssetStatus {
    ACTIVE = 'ACTIVE',
    DISPOSED = 'DISPOSED',
    FULLY_DEPRECIATED = 'FULLY_DEPRECIATED',
}

@Entity('fixed_assets')
export class FixedAsset {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'organization_id', type: 'uuid' })
    organizationId: string;

    @ManyToOne(() => Organization)
    @JoinColumn({ name: 'organization_id' })
    organization: Organization;

    @Column({ length: 255 })
    name: string;

    @Column({ name: 'asset_code', length: 50, nullable: true })
    assetCode: string;

    @Column({ name: 'purchase_date', type: 'date' })
    purchaseDate: Date;

    @Column({ name: 'purchase_cost', type: 'decimal', precision: 15, scale: 2 })
    purchaseCost: number;

    @Column({ name: 'salvage_value', type: 'decimal', precision: 15, scale: 2, default: 0 })
    salvageValue: number;

    @Column({ name: 'useful_life_years', type: 'int' })
    usefulLifeYears: number;

    @Column({
        name: 'depreciation_method',
        type: 'enum',
        enum: DepreciationMethod,
        default: DepreciationMethod.STRAIGHT_LINE,
    })
    depreciationMethod: DepreciationMethod;

    @Column({
        name: 'depreciation_block',
        type: 'enum',
        enum: DepreciationBlock,
        nullable: true,
    })
    depreciationBlock: DepreciationBlock;

    @Column({ name: 'depreciation_rate', type: 'decimal', precision: 5, scale: 2, nullable: true })
    depreciationRate: number; // For WDV

    @Column({ name: 'total_units_production', type: 'decimal', precision: 15, scale: 2, nullable: true })
    totalUnitsProduction: number;

    @Column({ name: 'units_produced_to_date', type: 'decimal', precision: 15, scale: 2, default: 0 })
    unitsProducedToDate: number;

    @Column({ name: 'accumulated_depreciation', type: 'decimal', precision: 15, scale: 2, default: 0 })
    accumulatedDepreciation: number;

    @Column({ name: 'book_value', type: 'decimal', precision: 15, scale: 2 })
    bookValue: number;

    @Column({
        type: 'enum',
        enum: AssetStatus,
        default: AssetStatus.ACTIVE,
    })
    status: AssetStatus;

    @Column({ name: 'asset_account_id', type: 'uuid' })
    assetAccountId: string;

    @ManyToOne(() => Account)
    @JoinColumn({ name: 'asset_account_id' })
    assetAccount: Account;

    @Column({ name: 'depreciation_expense_account_id', type: 'uuid' })
    depreciationExpenseAccountId: string;

    @ManyToOne(() => Account)
    @JoinColumn({ name: 'depreciation_expense_account_id' })
    depreciationExpenseAccount: Account;

    @Column({ name: 'accumulated_depreciation_account_id', type: 'uuid' })
    accumulatedDepreciationAccountId: string;

    @ManyToOne(() => Account)
    @JoinColumn({ name: 'accumulated_depreciation_account_id' })
    accumulatedDepreciationAccount: Account;

    @Column({ name: 'revaluation_reserve_account_id', type: 'uuid', nullable: true })
    revaluationReserveAccountId: string;

    @ManyToOne(() => Account)
    @JoinColumn({ name: 'revaluation_reserve_account_id' })
    revaluationReserveAccount: Account;

    @Column({ name: 'gain_loss_account_id', type: 'uuid', nullable: true })
    gainLossAccountId: string;

    @ManyToOne(() => Account)
    @JoinColumn({ name: 'gain_loss_account_id' })
    gainLossAccount: Account;

    @Column({ name: 'source_invoice_id', type: 'uuid', nullable: true })
    sourceInvoiceId: string | null;

    @Column({ length: 100, nullable: true })
    category: string | null;

    @OneToMany(() => DepreciationLog, (log) => log.asset)
    depreciationLogs: DepreciationLog[];

    @OneToMany(() => AssetMaintenanceLog, (log) => log.asset)
    maintenanceLogs: AssetMaintenanceLog[];

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}

@Entity('depreciation_logs')
export class DepreciationLog {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'asset_id', type: 'uuid' })
    assetId: string;

    @ManyToOne(() => FixedAsset, (asset) => asset.depreciationLogs)
    @JoinColumn({ name: 'asset_id' })
    asset: FixedAsset;

    @Column({ name: 'depreciation_date', type: 'date' })
    depreciationDate: Date;

    @Column({ type: 'decimal', precision: 15, scale: 2 })
    amount: number;

    @Column({ name: 'units_produced_this_period', type: 'decimal', precision: 15, scale: 2, nullable: true })
    unitsProducedThisPeriod: number;

    @Column({ name: 'journal_entry_id', type: 'uuid', nullable: true })
    journalEntryId: string;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
}

@Entity('asset_maintenance_logs')
export class AssetMaintenanceLog {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'asset_id', type: 'uuid' })
    assetId: string;

    @ManyToOne(() => FixedAsset, (asset) => asset.maintenanceLogs)
    @JoinColumn({ name: 'asset_id' })
    asset: FixedAsset;

    @Column({ name: 'maintenance_date', type: 'date' })
    maintenanceDate: Date;

    @Column({ type: 'text' })
    description: string;

    @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
    cost: number;

    @Column({ name: 'vendor_id', type: 'uuid', nullable: true })
    vendorId: string;

    @ManyToOne(() => Vendor)
    @JoinColumn({ name: 'vendor_id' })
    vendor: Vendor;

    @Column({ name: 'journal_entry_id', type: 'uuid', nullable: true })
    journalEntryId: string;

    @ManyToOne(() => JournalEntry)
    @JoinColumn({ name: 'journal_entry_id' })
    journalEntry: JournalEntry;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
