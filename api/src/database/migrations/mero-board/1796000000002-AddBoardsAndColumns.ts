import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

export class AddBoardsAndColumns1796000000002 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {

        // Boards Table
        await queryRunner.createTable(
            new Table({
                name: 'boards',
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
                        name: 'description',
                        type: 'text',
                        isNullable: true,
                    },
                    {
                        name: 'type',
                        type: 'enum',
                        enum: ['KANBAN', 'SCRUM', 'LIST'],
                        default: "'KANBAN'",
                    },
                    {
                        name: 'color',
                        type: 'varchar',
                        length: '20',
                        isNullable: true,
                    },
                    {
                        name: 'is_archived',
                        type: 'boolean',
                        default: false,
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
                    {
                        name: 'updated_at',
                        type: 'timestamp',
                        default: 'CURRENT_TIMESTAMP',
                    },
                ],
            }),
            true,
        );

        // Check if organization_id FK exists before creating
        const boardsTable = await queryRunner.getTable('boards');
        const orgFk = boardsTable?.foreignKeys.find(fk => fk.columnNames.indexOf('organization_id') !== -1);
        if (!orgFk) {
            await queryRunner.createForeignKey(
                'boards',
                new TableForeignKey({
                    columnNames: ['organization_id'],
                    referencedTableName: 'organizations',
                    referencedColumnNames: ['id'],
                    onDelete: 'CASCADE',
                }),
            );
        }

        // Check if created_by FK exists before creating
        const createdByFk = boardsTable?.foreignKeys.find(fk => fk.columnNames.indexOf('created_by') !== -1);
        if (!createdByFk) {
            await queryRunner.createForeignKey(
                'boards',
                new TableForeignKey({
                    columnNames: ['created_by'],
                    referencedTableName: 'users',
                    referencedColumnNames: ['id'],
                    onDelete: 'NO ACTION',
                }),
            );
        }


        // Board Columns Table
        await queryRunner.createTable(
            new Table({
                name: 'board_columns',
                columns: [
                    {
                        name: 'id',
                        type: 'uuid',
                        isPrimary: true,
                        generationStrategy: 'uuid',
                        default: 'uuid_generate_v4()',
                    },
                    {
                        name: 'board_id',
                        type: 'uuid',
                    },
                    {
                        name: 'name',
                        type: 'varchar',
                        length: '100',
                    },
                    {
                        name: 'position',
                        type: 'int',
                    },
                    {
                        name: 'color',
                        type: 'varchar',
                        length: '20',
                        isNullable: true,
                    },
                    {
                        name: 'wip_limit',
                        type: 'int',
                        isNullable: true,
                        comment: 'Work In Progress limit',
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

        // Check if board_id FK exists
        const columnsTable = await queryRunner.getTable('board_columns');
        const boardFk = columnsTable?.foreignKeys.find(fk => fk.columnNames.indexOf('board_id') !== -1);
        if (!boardFk) {
            await queryRunner.createForeignKey(
                'board_columns',
                new TableForeignKey({
                    columnNames: ['board_id'],
                    referencedTableName: 'boards',
                    referencedColumnNames: ['id'],
                    onDelete: 'CASCADE',
                }),
            );
        }

        // Add columns to existing tickets table if they don't exist
        const ticketsTable = await queryRunner.getTable('tickets');
        if (ticketsTable) {
            if (!ticketsTable.findColumnByName('board_id')) {
                await queryRunner.query('ALTER TABLE tickets ADD COLUMN board_id UUID');
            }
            if (!ticketsTable.findColumnByName('column_id')) {
                await queryRunner.query('ALTER TABLE tickets ADD COLUMN column_id UUID');
            }
            if (!ticketsTable.findColumnByName('position')) {
                await queryRunner.query('ALTER TABLE tickets ADD COLUMN position INT DEFAULT 0');
            }

            const ticketBoardFk = ticketsTable.foreignKeys.find(fk => fk.columnNames.indexOf('board_id') !== -1);
            if (!ticketBoardFk) {
                await queryRunner.createForeignKey(
                    'tickets',
                    new TableForeignKey({
                        columnNames: ['board_id'],
                        referencedTableName: 'boards',
                        referencedColumnNames: ['id'],
                        onDelete: 'CASCADE',
                    }),
                );
            }

            const ticketColumnFk = ticketsTable.foreignKeys.find(fk => fk.columnNames.indexOf('column_id') !== -1);
            if (!ticketColumnFk) {
                await queryRunner.createForeignKey(
                    'tickets',
                    new TableForeignKey({
                        columnNames: ['column_id'],
                        referencedTableName: 'board_columns',
                        referencedColumnNames: ['id'],
                        onDelete: 'SET NULL',
                    }),
                );
            }
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
      ALTER TABLE tickets 
      DROP COLUMN board_id,
      DROP COLUMN column_id,
      DROP COLUMN position
    `);
        await queryRunner.dropTable('board_columns');
        await queryRunner.dropTable('boards');
    }
}
