import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

export class AddInventoryModule1796000000003 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {

        // Products Table
        await queryRunner.createTable(
            new Table({
                name: 'products',
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
                        name: 'sku',
                        type: 'varchar',
                        length: '100',
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
                        name: 'description',
                        type: 'text',
                        isNullable: true,
                    },
                    {
                        name: 'category',
                        type: 'varchar',
                        length: '100',
                        isNullable: true,
                    },
                    {
                        name: 'unit',
                        type: 'varchar',
                        length: '50',
                        default: "'pcs'",
                        comment: 'pcs, kg, liter, box, dozen, mana, pathi, etc.',
                    },
                    {
                        name: 'cost_price',
                        type: 'decimal',
                        precision: 10,
                        scale: 2,
                    },
                    {
                        name: 'selling_price',
                        type: 'decimal',
                        precision: 10,
                        scale: 2,
                    },
                    {
                        name: 'barcode',
                        type: 'varchar',
                        length: '100',
                        isNullable: true,
                    },
                    {
                        name: 'image_url',
                        type: 'varchar',
                        length: '500',
                        isNullable: true,
                    },
                    {
                        name: 'min_stock_level',
                        type: 'decimal',
                        precision: 10,
                        scale: 2,
                        default: 0,
                    },
                    {
                        name: 'reorder_level',
                        type: 'decimal',
                        precision: 10,
                        scale: 2,
                        default: 0,
                    },
                    {
                        name: 'track_expiry',
                        type: 'boolean',
                        default: false,
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
                    {
                        name: 'deleted_at',
                        type: 'timestamp',
                        isNullable: true,
                    },
                ],
            }),
            true,
        );

        const productsTable = await queryRunner.getTable('products');
        if (productsTable && !productsTable.foreignKeys.find(fk => fk.columnNames.indexOf('organization_id') !== -1)) {
            await queryRunner.createForeignKey(
                'products',
                new TableForeignKey({
                    columnNames: ['organization_id'],
                    referencedTableName: 'organizations',
                    referencedColumnNames: ['id'],
                    onDelete: 'CASCADE',
                }),
            );
        }

        await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_product_org_sku ON products(organization_id, sku) WHERE deleted_at IS NULL
    `);

        // Warehouses Table
        await queryRunner.createTable(
            new Table({
                name: 'warehouses',
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
                        name: 'code',
                        type: 'varchar',
                        length: '50',
                    },
                    {
                        name: 'location',
                        type: 'varchar',
                        length: '255',
                        isNullable: true,
                    },
                    {
                        name: 'is_default',
                        type: 'boolean',
                        default: false,
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

        const warehousesTable = await queryRunner.getTable('warehouses');
        if (warehousesTable && !warehousesTable.foreignKeys.find(fk => fk.columnNames.indexOf('organization_id') !== -1)) {
            await queryRunner.createForeignKey(
                'warehouses',
                new TableForeignKey({
                    columnNames: ['organization_id'],
                    referencedTableName: 'organizations',
                    referencedColumnNames: ['id'],
                    onDelete: 'CASCADE',
                }),
            );
        }

        // Stock Table (Current stock levels)
        await queryRunner.createTable(
            new Table({
                name: 'stock',
                columns: [
                    {
                        name: 'id',
                        type: 'uuid',
                        isPrimary: true,
                        generationStrategy: 'uuid',
                        default: 'uuid_generate_v4()',
                    },
                    {
                        name: 'product_id',
                        type: 'uuid',
                    },
                    {
                        name: 'warehouse_id',
                        type: 'uuid',
                    },
                    {
                        name: 'quantity',
                        type: 'decimal',
                        precision: 10,
                        scale: 2,
                        default: 0,
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

        const stockTable = await queryRunner.getTable('stock');
        if (stockTable) {
            if (!stockTable.foreignKeys.find(fk => fk.columnNames.indexOf('product_id') !== -1)) {
                await queryRunner.createForeignKey(
                    'stock',
                    new TableForeignKey({
                        columnNames: ['product_id'],
                        referencedTableName: 'products',
                        referencedColumnNames: ['id'],
                        onDelete: 'CASCADE',
                    }),
                );
            }
            if (!stockTable.foreignKeys.find(fk => fk.columnNames.indexOf('warehouse_id') !== -1)) {
                await queryRunner.createForeignKey(
                    'stock',
                    new TableForeignKey({
                        columnNames: ['warehouse_id'],
                        referencedTableName: 'warehouses',
                        referencedColumnNames: ['id'],
                        onDelete: 'CASCADE',
                    }),
                );
            }
        }

        await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_stock_product_warehouse ON stock(product_id, warehouse_id)
    `);

        // Stock Movements Table (Transaction log)
        await queryRunner.createTable(
            new Table({
                name: 'stock_movements',
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
                        name: 'product_id',
                        type: 'uuid',
                    },
                    {
                        name: 'warehouse_id',
                        type: 'uuid',
                    },
                    {
                        name: 'type',
                        type: 'enum',
                        enum: ['IN', 'OUT', 'TRANSFER_IN', 'TRANSFER_OUT', 'ADJUSTMENT'],
                    },
                    {
                        name: 'quantity',
                        type: 'decimal',
                        precision: 10,
                        scale: 2,
                    },
                    {
                        name: 'reference_type',
                        type: 'varchar',
                        length: '50',
                        isNullable: true,
                        comment: 'PURCHASE, SALE, ADJUSTMENT, TRANSFER',
                    },
                    {
                        name: 'reference_id',
                        type: 'uuid',
                        isNullable: true,
                    },
                    {
                        name: 'cost_price',
                        type: 'decimal',
                        precision: 10,
                        scale: 2,
                        isNullable: true,
                    },
                    {
                        name: 'notes',
                        type: 'text',
                        isNullable: true,
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

        const stockMovementsTable = await queryRunner.getTable('stock_movements');
        if (stockMovementsTable) {
            if (!stockMovementsTable.foreignKeys.find(fk => fk.columnNames.indexOf('organization_id') !== -1)) {
                await queryRunner.createForeignKey(
                    'stock_movements',
                    new TableForeignKey({
                        columnNames: ['organization_id'],
                        referencedTableName: 'organizations',
                        referencedColumnNames: ['id'],
                        onDelete: 'CASCADE',
                    }),
                );
            }
            if (!stockMovementsTable.foreignKeys.find(fk => fk.columnNames.indexOf('product_id') !== -1)) {
                await queryRunner.createForeignKey(
                    'stock_movements',
                    new TableForeignKey({
                        columnNames: ['product_id'],
                        referencedTableName: 'products',
                        referencedColumnNames: ['id'],
                        onDelete: 'CASCADE',
                    }),
                );
            }
            if (!stockMovementsTable.foreignKeys.find(fk => fk.columnNames.indexOf('warehouse_id') !== -1)) {
                await queryRunner.createForeignKey(
                    'stock_movements',
                    new TableForeignKey({
                        columnNames: ['warehouse_id'],
                        referencedTableName: 'warehouses',
                        referencedColumnNames: ['id'],
                        onDelete: 'CASCADE',
                    }),
                );
            }
        }

        // Stock Adjustments Table
        await queryRunner.createTable(
            new Table({
                name: 'stock_adjustments',
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
                        name: 'adjustment_number',
                        type: 'varchar',
                        length: '100',
                    },
                    {
                        name: 'warehouse_id',
                        type: 'uuid',
                    },
                    {
                        name: 'adjustment_date',
                        type: 'date',
                    },
                    {
                        name: 'reason',
                        type: 'varchar',
                        length: '255',
                        comment: 'Physical Count, Damage, Theft, Expiry, etc.',
                    },
                    {
                        name: 'status',
                        type: 'enum',
                        enum: ['DRAFT', 'APPROVED', 'CANCELLED'],
                        default: "'DRAFT'",
                    },
                    {
                        name: 'notes',
                        type: 'text',
                        isNullable: true,
                    },
                    {
                        name: 'approved_by',
                        type: 'uuid',
                        isNullable: true,
                    },
                    {
                        name: 'approved_at',
                        type: 'timestamp',
                        isNullable: true,
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

        const stockAdjustmentsTable = await queryRunner.getTable('stock_adjustments');
        if (stockAdjustmentsTable) {
            if (!stockAdjustmentsTable.foreignKeys.find(fk => fk.columnNames.indexOf('organization_id') !== -1)) {
                await queryRunner.createForeignKey(
                    'stock_adjustments',
                    new TableForeignKey({
                        columnNames: ['organization_id'],
                        referencedTableName: 'organizations',
                        referencedColumnNames: ['id'],
                        onDelete: 'CASCADE',
                    }),
                );
            }
            if (!stockAdjustmentsTable.foreignKeys.find(fk => fk.columnNames.indexOf('warehouse_id') !== -1)) {
                await queryRunner.createForeignKey(
                    'stock_adjustments',
                    new TableForeignKey({
                        columnNames: ['warehouse_id'],
                        referencedTableName: 'warehouses',
                        referencedColumnNames: ['id'],
                        onDelete: 'CASCADE',
                    }),
                );
            }
        }

        // Stock Adjustment Items Table
        await queryRunner.createTable(
            new Table({
                name: 'stock_adjustment_items',
                columns: [
                    {
                        name: 'id',
                        type: 'uuid',
                        isPrimary: true,
                        generationStrategy: 'uuid',
                        default: 'uuid_generate_v4()',
                    },
                    {
                        name: 'adjustment_id',
                        type: 'uuid',
                    },
                    {
                        name: 'product_id',
                        type: 'uuid',
                    },
                    {
                        name: 'system_quantity',
                        type: 'decimal',
                        precision: 10,
                        scale: 2,
                    },
                    {
                        name: 'actual_quantity',
                        type: 'decimal',
                        precision: 10,
                        scale: 2,
                    },
                    {
                        name: 'difference',
                        type: 'decimal',
                        precision: 10,
                        scale: 2,
                    },
                    {
                        name: 'notes',
                        type: 'text',
                        isNullable: true,
                    },
                ],
            }),
            true,
        );

        const stockAdjustmentItemsTable = await queryRunner.getTable('stock_adjustment_items');
        if (stockAdjustmentItemsTable) {
            if (!stockAdjustmentItemsTable.foreignKeys.find(fk => fk.columnNames.indexOf('adjustment_id') !== -1)) {
                await queryRunner.createForeignKey(
                    'stock_adjustment_items',
                    new TableForeignKey({
                        columnNames: ['adjustment_id'],
                        referencedTableName: 'stock_adjustments',
                        referencedColumnNames: ['id'],
                        onDelete: 'CASCADE',
                    }),
                );
            }
            if (!stockAdjustmentItemsTable.foreignKeys.find(fk => fk.columnNames.indexOf('product_id') !== -1)) {
                await queryRunner.createForeignKey(
                    'stock_adjustment_items',
                    new TableForeignKey({
                        columnNames: ['product_id'],
                        referencedTableName: 'products',
                        referencedColumnNames: ['id'],
                        onDelete: 'CASCADE',
                    }),
                );
            }
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable('stock_adjustment_items');
        await queryRunner.dropTable('stock_adjustments');
        await queryRunner.dropTable('stock_movements');
        await queryRunner.dropTable('stock');
        await queryRunner.dropTable('warehouses');
        await queryRunner.dropTable('products');
    }
}
