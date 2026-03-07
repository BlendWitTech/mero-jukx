import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

export class AddKhataModule1796000000005 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {

        // Khata Customers Table
        await queryRunner.createTable(
            new Table({
                name: 'khata_customers',
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
                        name: 'name_nepali',
                        type: 'varchar',
                        length: '255',
                        isNullable: true,
                    },
                    {
                        name: 'phone',
                        type: 'varchar',
                        length: '20',
                    },
                    {
                        name: 'address',
                        type: 'text',
                        isNullable: true,
                    },
                    {
                        name: 'opening_balance',
                        type: 'decimal',
                        precision: 10,
                        scale: 2,
                        default: 0,
                        comment: 'What they owed at start (Udhar)',
                    },
                    {
                        name: 'current_balance',
                        type: 'decimal',
                        precision: 10,
                        scale: 2,
                        default: 0,
                        comment: 'Current Udhar amount',
                    },
                    {
                        name: 'credit_limit',
                        type: 'decimal',
                        precision: 10,
                        scale: 2,
                        isNullable: true,
                        comment: 'Maximum Udhar allowed',
                    },
                    {
                        name: 'is_active',
                        type: 'boolean',
                        default: true,
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

        const customersTable = await queryRunner.getTable('khata_customers');
        if (customersTable && !customersTable.foreignKeys.find(fk => fk.columnNames.indexOf('organization_id') !== -1)) {
            await queryRunner.createForeignKey(
                'khata_customers',
                new TableForeignKey({
                    columnNames: ['organization_id'],
                    referencedTableName: 'organizations',
                    referencedColumnNames: ['id'],
                    onDelete: 'CASCADE',
                }),
            );
        }

        // Khata Transactions Table
        await queryRunner.createTable(
            new Table({
                name: 'khata_transactions',
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
                        name: 'customer_id',
                        type: 'uuid',
                    },
                    {
                        name: 'date',
                        type: 'date',
                    },
                    {
                        name: 'type',
                        type: 'enum',
                        enum: ['SALE', 'PAYMENT', 'RETURN', 'ADJUSTMENT'],
                    },
                    {
                        name: 'description',
                        type: 'text',
                        isNullable: true,
                    },
                    {
                        name: 'amount',
                        type: 'decimal',
                        precision: 10,
                        scale: 2,
                    },
                    {
                        name: 'running_balance',
                        type: 'decimal',
                        precision: 10,
                        scale: 2,
                        comment: 'Balance after this transaction',
                    },
                    {
                        name: 'payment_method',
                        type: 'varchar',
                        length: '50',
                        isNullable: true,
                        comment: 'CASH, ESEWA, KHALTI, BANK',
                    },
                    {
                        name: 'created_by',
                        type: 'uuid',
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

        const transactionsTable = await queryRunner.getTable('khata_transactions');
        if (transactionsTable) {
            if (!transactionsTable.foreignKeys.find(fk => fk.columnNames.indexOf('organization_id') !== -1)) {
                await queryRunner.createForeignKey(
                    'khata_transactions',
                    new TableForeignKey({
                        columnNames: ['organization_id'],
                        referencedTableName: 'organizations',
                        referencedColumnNames: ['id'],
                        onDelete: 'CASCADE',
                    }),
                );
            }
            if (!transactionsTable.foreignKeys.find(fk => fk.columnNames.indexOf('customer_id') !== -1)) {
                await queryRunner.createForeignKey(
                    'khata_transactions',
                    new TableForeignKey({
                        columnNames: ['customer_id'],
                        referencedTableName: 'khata_customers',
                        referencedColumnNames: ['id'],
                        onDelete: 'CASCADE',
                    }),
                );
            }
        }

        // Khata Suppliers Table
        await queryRunner.createTable(
            new Table({
                name: 'khata_suppliers',
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
                        name: 'name_nepali',
                        type: 'varchar',
                        length: '255',
                        isNullable: true,
                    },
                    {
                        name: 'phone',
                        type: 'varchar',
                        length: '20',
                    },
                    {
                        name: 'current_balance',
                        type: 'decimal',
                        precision: 10,
                        scale: 2,
                        default: 0,
                        comment: 'What we owe them',
                    },
                    {
                        name: 'is_active',
                        type: 'boolean',
                        default: true,
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

        const suppliersTable = await queryRunner.getTable('khata_suppliers');
        if (suppliersTable && !suppliersTable.foreignKeys.find(fk => fk.columnNames.indexOf('organization_id') !== -1)) {
            await queryRunner.createForeignKey(
                'khata_suppliers',
                new TableForeignKey({
                    columnNames: ['organization_id'],
                    referencedTableName: 'organizations',
                    referencedColumnNames: ['id'],
                    onDelete: 'CASCADE',
                }),
            );
        }

        // Khata Supplier Transactions Table
        await queryRunner.createTable(
            new Table({
                name: 'khata_supplier_transactions',
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
                        name: 'supplier_id',
                        type: 'uuid',
                    },
                    {
                        name: 'date',
                        type: 'date',
                    },
                    {
                        name: 'type',
                        type: 'enum',
                        enum: ['PURCHASE', 'PAYMENT', 'RETURN'],
                    },
                    {
                        name: 'description',
                        type: 'text',
                        isNullable: true,
                    },
                    {
                        name: 'amount',
                        type: 'decimal',
                        precision: 10,
                        scale: 2,
                    },
                    {
                        name: 'running_balance',
                        type: 'decimal',
                        precision: 10,
                        scale: 2,
                    },
                    {
                        name: 'created_by',
                        type: 'uuid',
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

        const supplierTransactionsTable = await queryRunner.getTable('khata_supplier_transactions');
        if (supplierTransactionsTable) {
            if (!supplierTransactionsTable.foreignKeys.find(fk => fk.columnNames.indexOf('organization_id') !== -1)) {
                await queryRunner.createForeignKey(
                    'khata_supplier_transactions',
                    new TableForeignKey({
                        columnNames: ['organization_id'],
                        referencedTableName: 'organizations',
                        referencedColumnNames: ['id'],
                        onDelete: 'CASCADE',
                    }),
                );
            }
            if (!supplierTransactionsTable.foreignKeys.find(fk => fk.columnNames.indexOf('supplier_id') !== -1)) {
                await queryRunner.createForeignKey(
                    'khata_supplier_transactions',
                    new TableForeignKey({
                        columnNames: ['supplier_id'],
                        referencedTableName: 'khata_suppliers',
                        referencedColumnNames: ['id'],
                        onDelete: 'CASCADE',
                    }),
                );
            }
        }

        // Khata Settings Table (for SMS reminders, etc.)
        await queryRunner.createTable(
            new Table({
                name: 'khata_settings',
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
                        isUnique: true,
                    },
                    {
                        name: 'sms_reminders_enabled',
                        type: 'boolean',
                        default: false,
                    },
                    {
                        name: 'reminder_days',
                        type: 'int',
                        default: 7,
                        comment: 'Send reminder after N days of unpaid udhar',
                    },
                    {
                        name: 'reminder_message',
                        type: 'text',
                        isNullable: true,
                        comment: 'Custom SMS template in Nepali',
                    },
                    {
                        name: 'language',
                        type: 'enum',
                        enum: ['ENGLISH', 'NEPALI'],
                        default: "'NEPALI'",
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

        const settingsTable = await queryRunner.getTable('khata_settings');
        if (settingsTable && !settingsTable.foreignKeys.find(fk => fk.columnNames.indexOf('organization_id') !== -1)) {
            await queryRunner.createForeignKey(
                'khata_settings',
                new TableForeignKey({
                    columnNames: ['organization_id'],
                    referencedTableName: 'organizations',
                    referencedColumnNames: ['id'],
                    onDelete: 'CASCADE',
                }),
            );
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable('khata_settings');
        await queryRunner.dropTable('khata_supplier_transactions');
        await queryRunner.dropTable('khata_suppliers');
        await queryRunner.dropTable('khata_transactions');
        await queryRunner.dropTable('khata_customers');
    }
}
