import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

export class AddAccountingFixedAssetsModule1829000000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {

        // Fixed Assets Table
        await queryRunner.createTable(
            new Table({
                name: 'fixed_assets',
                columns: [
                    {
                        name: 'id',
                        type: 'uuid',
                        isPrimary: true,
                        generationStrategy: 'uuid',
                        default: 'uuid_generate_v4()',
                    },
                    {
                        name: 'organization_id',
                        type: 'uuid',
                    },
                    {
                        name: 'name',
                        type: 'varchar',
                        length: '255',
                    },
                    {
                        name: 'asset_code',
                        type: 'varchar',
                        length: '50',
                        isNullable: true,
                    },
                    {
                        name: 'purchase_date',
                        type: 'date',
                    },
                    {
                        name: 'purchase_cost',
                        type: 'decimal',
                        precision: 15,
                        scale: 2,
                    },
                    {
                        name: 'salvage_value',
                        type: 'decimal',
                        precision: 15,
                        scale: 2,
                        default: 0,
                    },
                    {
                        name: 'useful_life_years',
                        type: 'int',
                    },
                    {
                        name: 'depreciation_method',
                        type: 'enum',
                        enum: ['STRAIGHT_LINE', 'WDV'],
                        default: "'STRAIGHT_LINE'",
                    },
                    {
                        name: 'depreciation_rate',
                        type: 'decimal',
                        precision: 5,
                        scale: 2,
                        isNullable: true,
                    },
                    {
                        name: 'accumulated_depreciation',
                        type: 'decimal',
                        precision: 15,
                        scale: 2,
                        default: 0,
                    },
                    {
                        name: 'book_value',
                        type: 'decimal',
                        precision: 15,
                        scale: 2,
                    },
                    {
                        name: 'status',
                        type: 'enum',
                        enum: ['ACTIVE', 'DISPOSED', 'FULLY_DEPRECIATED'],
                        default: "'ACTIVE'",
                    },
                    {
                        name: 'asset_account_id',
                        type: 'uuid',
                    },
                    {
                        name: 'depreciation_expense_account_id',
                        type: 'uuid',
                    },
                    {
                        name: 'accumulated_depreciation_account_id',
                        type: 'uuid',
                    },
                    {
                        name: 'created_at',
                        type: 'timestamp',
                        default: 'CURRENT_TIMESTAMP',
                    },
                    {
                        name: 'updated_at',
                        type: 'timestamp',
                        default: 'CURRENT_TIMESTAMP',
                    },
                ],
            }),
            true,
        );

        // Depreciation Logs Table
        await queryRunner.createTable(
            new Table({
                name: 'depreciation_logs',
                columns: [
                    {
                        name: 'id',
                        type: 'uuid',
                        isPrimary: true,
                        generationStrategy: 'uuid',
                        default: 'uuid_generate_v4()',
                    },
                    {
                        name: 'asset_id',
                        type: 'uuid',
                    },
                    {
                        name: 'depreciation_date',
                        type: 'date',
                    },
                    {
                        name: 'amount',
                        type: 'decimal',
                        precision: 15,
                        scale: 2,
                    },
                    {
                        name: 'journal_entry_id',
                        type: 'uuid',
                        isNullable: true,
                    },
                    {
                        name: 'created_at',
                        type: 'timestamp',
                        default: 'CURRENT_TIMESTAMP',
                    },
                ],
            }),
            true,
        );

        // Foreign Keys for Fixed Assets
        await queryRunner.createForeignKey(
            'fixed_assets',
            new TableForeignKey({
                columnNames: ['organization_id'],
                referencedTableName: 'organizations',
                referencedColumnNames: ['id'],
                onDelete: 'CASCADE',
            }),
        );

        await queryRunner.createForeignKey(
            'fixed_assets',
            new TableForeignKey({
                columnNames: ['asset_account_id'],
                referencedTableName: 'accounts',
                referencedColumnNames: ['id'],
                onDelete: 'RESTRICT',
            }),
        );

        // Foreign Keys for Depreciation Logs
        await queryRunner.createForeignKey(
            'depreciation_logs',
            new TableForeignKey({
                columnNames: ['asset_id'],
                referencedTableName: 'fixed_assets',
                referencedColumnNames: ['id'],
                onDelete: 'CASCADE',
            }),
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable('depreciation_logs');
        await queryRunner.dropTable('fixed_assets');
    }
}
