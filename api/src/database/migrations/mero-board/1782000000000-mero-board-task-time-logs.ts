import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class MeroBoardTaskTimeLogs1782000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'mero_board_task_time_logs',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'task_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'user_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'logged_date',
            type: 'date',
            isNullable: false,
          },
          {
            name: 'duration_minutes',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'is_billable',
            type: 'boolean',
            default: false,
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
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    const table = await queryRunner.getTable('mero_board_task_time_logs');
    if (table) {
      // Add indexes
      if (!table.indices.find(idx => idx.name === 'IDX_mero_board_task_time_logs_task_id' || idx.columnNames.includes('task_id'))) {
        await queryRunner.createIndex(
          'mero_board_task_time_logs',
          new TableIndex({
            name: 'IDX_mero_board_task_time_logs_task_id',
            columnNames: ['task_id'],
          }),
        );
      }

      if (!table.indices.find(idx => idx.name === 'IDX_mero_board_task_time_logs_user_id' || idx.columnNames.includes('user_id'))) {
        await queryRunner.createIndex(
          'mero_board_task_time_logs',
          new TableIndex({
            name: 'IDX_mero_board_task_time_logs_user_id',
            columnNames: ['user_id'],
          }),
        );
      }

      if (!table.indices.find(idx => idx.name === 'IDX_mero_board_task_time_logs_logged_date' || idx.columnNames.includes('logged_date'))) {
        await queryRunner.createIndex(
          'mero_board_task_time_logs',
          new TableIndex({
            name: 'IDX_mero_board_task_time_logs_logged_date',
            columnNames: ['logged_date'],
          }),
        );
      }

      // Add foreign keys
      if (!table.foreignKeys.find(fk => fk.columnNames.includes('task_id'))) {
        await queryRunner.createForeignKey(
          'mero_board_task_time_logs',
          new TableForeignKey({
            columnNames: ['task_id'],
            referencedColumnNames: ['id'],
            referencedTableName: 'tasks',
            onDelete: 'CASCADE',
          }),
        );
      }

      if (!table.foreignKeys.find(fk => fk.columnNames.includes('user_id'))) {
        await queryRunner.createForeignKey(
          'mero_board_task_time_logs',
          new TableForeignKey({
            columnNames: ['user_id'],
            referencedColumnNames: ['id'],
            referencedTableName: 'users',
            onDelete: 'CASCADE',
          }),
        );
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('mero_board_task_time_logs', true);
  }
}
