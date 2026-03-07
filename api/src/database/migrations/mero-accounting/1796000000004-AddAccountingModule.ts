import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

export class AddAccountingModule1796000000004 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {

        // Chart of Accounts Table
        await queryRunner.createTable(
            new Table({
                name: 'accounts',
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
                        isNullable: true,
                    },
                    {
                        name: 'code',
                        type: 'varchar',
                        length: '50',
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
                        name: 'account_type',
                        type: 'enum',
                        enum: ['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'],
                    },
                    {
                        name: 'category',
                        type: 'varchar',
                        length: '100',
                        comment: 'Current Asset, Fixed Asset, Current Liability, etc.',
                    },
                    {
                        name: 'parent_id',
                        type: 'uuid',
                        isNullable: true,
                    },
                    {
                        name: 'balance',
                        type: 'decimal',
                        precision: 15,
                        scale: 2,
                        default: 0,
                    },
                    {
                        name: 'is_system',
                        type: 'boolean',
                        default: false,
                        comment: 'Nepal standard accounts',
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

        const accountsTable = await queryRunner.getTable('accounts');
        if (accountsTable) {
            if (!accountsTable.foreignKeys.find(fk => fk.columnNames.indexOf('organization_id') !== -1)) {
                await queryRunner.createForeignKey(
                    'accounts',
                    new TableForeignKey({
                        columnNames: ['organization_id'],
                        referencedTableName: 'organizations',
                        referencedColumnNames: ['id'],
                        onDelete: 'CASCADE',
                    }),
                );
            }
            if (!accountsTable.foreignKeys.find(fk => fk.columnNames.indexOf('parent_id') !== -1)) {
                await queryRunner.createForeignKey(
                    'accounts',
                    new TableForeignKey({
                        columnNames: ['parent_id'],
                        referencedTableName: 'accounts',
                        referencedColumnNames: ['id'],
                        onDelete: 'SET NULL',
                    }),
                );
            }
        }

        await queryRunner.query(`
          CREATE UNIQUE INDEX IF NOT EXISTS idx_account_org_code ON accounts(organization_id, code) WHERE organization_id IS NOT NULL
        `);

        await queryRunner.query(`
          CREATE UNIQUE INDEX IF NOT EXISTS idx_account_system_code ON accounts(code) WHERE organization_id IS NULL
        `);

        // Journal Entries Table
        await queryRunner.createTable(
            new Table({
                name: 'journal_entries',
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
                        name: 'entry_number',
                        type: 'varchar',
                        length: '100',
                    },
                    {
                        name: 'entry_date',
                        type: 'date',
                    },
                    {
                        name: 'narration',
                        type: 'text',
                    },
                    {
                        name: 'status',
                        type: 'enum',
                        enum: ['DRAFT', 'POSTED', 'CANCELLED'],
                        default: "'DRAFT'",
                    },
                    {
                        name: 'reference_type',
                        type: 'varchar',
                        length: '50',
                        isNullable: true,
                        comment: 'INVOICE, BILL, PAYMENT, etc.',
                    },
                    {
                        name: 'reference_id',
                        type: 'uuid',
                        isNullable: true,
                    },
                    {
                        name: 'created_by',
                        type: 'uuid',
                    },
                    {
                        name: 'posted_by',
                        type: 'uuid',
                        isNullable: true,
                    },
                    {
                        name: 'posted_at',
                        type: 'timestamp',
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

        const journalEntriesTable = await queryRunner.getTable('journal_entries');
        if (journalEntriesTable && !journalEntriesTable.foreignKeys.find(fk => fk.columnNames.indexOf('organization_id') !== -1)) {
            await queryRunner.createForeignKey(
                'journal_entries',
                new TableForeignKey({
                    columnNames: ['organization_id'],
                    referencedTableName: 'organizations',
                    referencedColumnNames: ['id'],
                    onDelete: 'CASCADE',
                }),
            );
        }

        // Journal Entry Lines Table
        await queryRunner.createTable(
            new Table({
                name: 'journal_entry_lines',
                columns: [
                    {
                        name: 'id',
                        type: 'uuid',
                        isPrimary: true,
                        generationStrategy: 'uuid',
                        default: 'uuid_generate_v4()',
                    },
                    {
                        name: 'journal_entry_id',
                        type: 'uuid',
                    },
                    {
                        name: 'account_id',
                        type: 'uuid',
                    },
                    {
                        name: 'debit',
                        type: 'decimal',
                        precision: 15,
                        scale: 2,
                        default: 0,
                    },
                    {
                        name: 'credit',
                        type: 'decimal',
                        precision: 15,
                        scale: 2,
                        default: 0,
                    },
                    {
                        name: 'description',
                        type: 'text',
                        isNullable: true,
                    },
                ],
            }),
            true,
        );

        const journalEntryLinesTable = await queryRunner.getTable('journal_entry_lines');
        if (journalEntryLinesTable) {
            if (!journalEntryLinesTable.foreignKeys.find(fk => fk.columnNames.indexOf('journal_entry_id') !== -1)) {
                await queryRunner.createForeignKey(
                    'journal_entry_lines',
                    new TableForeignKey({
                        columnNames: ['journal_entry_id'],
                        referencedTableName: 'journal_entries',
                        referencedColumnNames: ['id'],
                        onDelete: 'CASCADE',
                    }),
                );
            }
            if (!journalEntryLinesTable.foreignKeys.find(fk => fk.columnNames.indexOf('account_id') !== -1)) {
                await queryRunner.createForeignKey(
                    'journal_entry_lines',
                    new TableForeignKey({
                        columnNames: ['account_id'],
                        referencedTableName: 'accounts',
                        referencedColumnNames: ['id'],
                        onDelete: 'CASCADE',
                    }),
                );
            }
        }

        // Vendors Table
        await queryRunner.createTable(
            new Table({
                name: 'vendors',
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
                        name: 'pan_number',
                        type: 'varchar',
                        length: '20',
                        isNullable: true,
                    },
                    {
                        name: 'email',
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
                        name: 'payment_terms',
                        type: 'int',
                        isNullable: true,
                        comment: 'Payment terms in days',
                    },
                    {
                        name: 'opening_balance',
                        type: 'decimal',
                        precision: 10,
                        scale: 2,
                        default: 0,
                    },
                    {
                        name: 'current_balance',
                        type: 'decimal',
                        precision: 10,
                        scale: 2,
                        default: 0,
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

        const vendorsTable = await queryRunner.getTable('vendors');
        if (vendorsTable && !vendorsTable.foreignKeys.find(fk => fk.columnNames.indexOf('organization_id') !== -1)) {
            await queryRunner.createForeignKey(
                'vendors',
                new TableForeignKey({
                    columnNames: ['organization_id'],
                    referencedTableName: 'organizations',
                    referencedColumnNames: ['id'],
                    onDelete: 'CASCADE',
                }),
            );
        }

        // Purchase Invoices Table
        await queryRunner.createTable(
            new Table({
                name: 'purchase_invoices',
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
                        name: 'vendor_id',
                        type: 'uuid',
                    },
                    {
                        name: 'invoice_number',
                        type: 'varchar',
                        length: '100',
                    },
                    {
                        name: 'invoice_date',
                        type: 'date',
                    },
                    {
                        name: 'due_date',
                        type: 'date',
                    },
                    {
                        name: 'subtotal',
                        type: 'decimal',
                        precision: 10,
                        scale: 2,
                    },
                    {
                        name: 'vat_amount',
                        type: 'decimal',
                        precision: 10,
                        scale: 2,
                    },
                    {
                        name: 'total_amount',
                        type: 'decimal',
                        precision: 10,
                        scale: 2,
                    },
                    {
                        name: 'paid_amount',
                        type: 'decimal',
                        precision: 10,
                        scale: 2,
                        default: 0,
                    },
                    {
                        name: 'status',
                        type: 'enum',
                        enum: ['DRAFT', 'POSTED', 'PARTIALLY_PAID', 'PAID', 'CANCELLED'],
                        default: "'DRAFT'",
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

        const purchaseInvoicesTable = await queryRunner.getTable('purchase_invoices');
        if (purchaseInvoicesTable) {
            if (!purchaseInvoicesTable.foreignKeys.find(fk => fk.columnNames.indexOf('organization_id') !== -1)) {
                await queryRunner.createForeignKey(
                    'purchase_invoices',
                    new TableForeignKey({
                        columnNames: ['organization_id'],
                        referencedTableName: 'organizations',
                        referencedColumnNames: ['id'],
                        onDelete: 'CASCADE',
                    }),
                );
            }
            if (!purchaseInvoicesTable.foreignKeys.find(fk => fk.columnNames.indexOf('vendor_id') !== -1)) {
                await queryRunner.createForeignKey(
                    'purchase_invoices',
                    new TableForeignKey({
                        columnNames: ['vendor_id'],
                        referencedTableName: 'vendors',
                        referencedColumnNames: ['id'],
                        onDelete: 'CASCADE',
                    }),
                );
            }
        }

        // Bank Accounts Table
        await queryRunner.createTable(
            new Table({
                name: 'bank_accounts',
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
                        name: 'account_id',
                        type: 'uuid',
                        comment: 'Link to Chart of Accounts',
                    },
                    {
                        name: 'bank_name',
                        type: 'varchar',
                        length: '255',
                    },
                    {
                        name: 'account_number',
                        type: 'varchar',
                        length: '100',
                    },
                    {
                        name: 'branch',
                        type: 'varchar',
                        length: '255',
                        isNullable: true,
                    },
                    {
                        name: 'account_holder',
                        type: 'varchar',
                        length: '255',
                    },
                    {
                        name: 'opening_balance',
                        type: 'decimal',
                        precision: 15,
                        scale: 2,
                    },
                    {
                        name: 'current_balance',
                        type: 'decimal',
                        precision: 15,
                        scale: 2,
                    },
                    {
                        name: 'currency',
                        type: 'varchar',
                        length: '10',
                        default: "'NPR'",
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

        const bankAccountsTable = await queryRunner.getTable('bank_accounts');
        if (bankAccountsTable) {
            if (!bankAccountsTable.foreignKeys.find(fk => fk.columnNames.indexOf('organization_id') !== -1)) {
                await queryRunner.createForeignKey(
                    'bank_accounts',
                    new TableForeignKey({
                        columnNames: ['organization_id'],
                        referencedTableName: 'organizations',
                        referencedColumnNames: ['id'],
                        onDelete: 'CASCADE',
                    }),
                );
            }
            if (!bankAccountsTable.foreignKeys.find(fk => fk.columnNames.indexOf('account_id') !== -1)) {
                await queryRunner.createForeignKey(
                    'bank_accounts',
                    new TableForeignKey({
                        columnNames: ['account_id'],
                        referencedTableName: 'accounts',
                        referencedColumnNames: ['id'],
                        onDelete: 'CASCADE',
                    }),
                );
            }
        }

        // Fiscal Years Table
        await queryRunner.createTable(
            new Table({
                name: 'fiscal_years',
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
                        name: 'year',
                        type: 'varchar',
                        length: '20',
                        comment: '2080-81 (BS) or 2023-24 (AD)',
                    },
                    {
                        name: 'start_date',
                        type: 'date',
                        comment: '1 Shrawan or custom start',
                    },
                    {
                        name: 'end_date',
                        type: 'date',
                        comment: '32 Ashadh or custom end',
                    },
                    {
                        name: 'is_closed',
                        type: 'boolean',
                        default: false,
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

        const fiscalYearsTable = await queryRunner.getTable('fiscal_years');
        if (fiscalYearsTable && !fiscalYearsTable.foreignKeys.find(fk => fk.columnNames.indexOf('organization_id') !== -1)) {
            await queryRunner.createForeignKey(
                'fiscal_years',
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
        await queryRunner.dropTable('fiscal_years');
        await queryRunner.dropTable('bank_accounts');
        await queryRunner.dropTable('purchase_invoices');
        await queryRunner.dropTable('vendors');
        await queryRunner.dropTable('journal_entry_lines');
        await queryRunner.dropTable('journal_entries');
        await queryRunner.dropTable('accounts');
    }
}
