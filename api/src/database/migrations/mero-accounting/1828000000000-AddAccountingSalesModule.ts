import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

export class AddAccountingSalesModule1828000000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {

        // Customers Table
        await queryRunner.createTable(
            new Table({
                name: 'customers',
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
                        name: 'credit_limit',
                        type: 'decimal',
                        precision: 15,
                        scale: 2,
                        isNullable: true,
                    },
                    {
                        name: 'opening_balance',
                        type: 'decimal',
                        precision: 15,
                        scale: 2,
                        default: 0,
                    },
                    {
                        name: 'current_balance',
                        type: 'decimal',
                        precision: 15,
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

        const customersTable = await queryRunner.getTable('customers');
        if (customersTable && !customersTable.foreignKeys.find(fk => fk.columnNames.indexOf('organization_id') !== -1)) {
            await queryRunner.createForeignKey(
                'customers',
                new TableForeignKey({
                    columnNames: ['organization_id'],
                    referencedTableName: 'organizations',
                    referencedColumnNames: ['id'],
                    onDelete: 'CASCADE',
                }),
            );
        }

        // Sales Invoices Table
        await queryRunner.createTable(
            new Table({
                name: 'sales_invoices',
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
                        precision: 15,
                        scale: 2,
                    },
                    {
                        name: 'vat_amount',
                        type: 'decimal',
                        precision: 15,
                        scale: 2,
                    },
                    {
                        name: 'total_amount',
                        type: 'decimal',
                        precision: 15,
                        scale: 2,
                    },
                    {
                        name: 'paid_amount',
                        type: 'decimal',
                        precision: 15,
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

        const salesInvoicesTable = await queryRunner.getTable('sales_invoices');
        if (salesInvoicesTable) {
            if (!salesInvoicesTable.foreignKeys.find(fk => fk.columnNames.indexOf('organization_id') !== -1)) {
                await queryRunner.createForeignKey(
                    'sales_invoices',
                    new TableForeignKey({
                        columnNames: ['organization_id'],
                        referencedTableName: 'organizations',
                        referencedColumnNames: ['id'],
                        onDelete: 'CASCADE',
                    }),
                );
            }
            if (!salesInvoicesTable.foreignKeys.find(fk => fk.columnNames.indexOf('customer_id') !== -1)) {
                await queryRunner.createForeignKey(
                    'sales_invoices',
                    new TableForeignKey({
                        columnNames: ['customer_id'],
                        referencedTableName: 'customers',
                        referencedColumnNames: ['id'],
                        onDelete: 'CASCADE',
                    }),
                );
            }
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable('sales_invoices');
        await queryRunner.dropTable('customers');
    }
}
