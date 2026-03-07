import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex, TableUnique } from 'typeorm';

export class MeroBoardTaskDependencies1781000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'mero_board_task_dependencies',
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
            name: 'depends_on_task_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'dependency_type',
            type: 'enum',
            enum: ['blocks', 'blocked_by', 'related'],
            default: "'blocks'",
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

    const table = await queryRunner.getTable('mero_board_task_dependencies');
    if (table) {
      // Add unique constraint
      if (!table.uniques.find(uq => uq.columnNames.includes('task_id') && uq.columnNames.includes('depends_on_task_id'))) {
        await queryRunner.createUniqueConstraint(
          'mero_board_task_dependencies',
          new TableUnique({
            columnNames: ['task_id', 'depends_on_task_id'],
          }),
        );
      }

      // Add indexes
      if (!table.indices.find(idx => idx.name === 'IDX_mero_board_task_dependencies_task_id' || idx.columnNames.includes('task_id'))) {
        await queryRunner.createIndex(
          'mero_board_task_dependencies',
          new TableIndex({
            name: 'IDX_mero_board_task_dependencies_task_id',
            columnNames: ['task_id'],
          }),
        );
      }

      if (!table.indices.find(idx => idx.name === 'IDX_mero_board_task_dependencies_depends_on_task_id' || idx.columnNames.includes('depends_on_task_id'))) {
        await queryRunner.createIndex(
          'mero_board_task_dependencies',
          new TableIndex({
            name: 'IDX_mero_board_task_dependencies_depends_on_task_id',
            columnNames: ['depends_on_task_id'],
          }),
        );
      }

      // Add foreign keys
      if (!table.foreignKeys.find(fk => fk.columnNames.includes('task_id'))) {
        await queryRunner.createForeignKey(
          'mero_board_task_dependencies',
          new TableForeignKey({
            columnNames: ['task_id'],
            referencedColumnNames: ['id'],
            referencedTableName: 'tasks',
            onDelete: 'CASCADE',
          }),
        );
      }

      if (!table.foreignKeys.find(fk => fk.columnNames.includes('depends_on_task_id'))) {
        await queryRunner.createForeignKey(
          'mero_board_task_dependencies',
          new TableForeignKey({
            columnNames: ['depends_on_task_id'],
            referencedColumnNames: ['id'],
            referencedTableName: 'tasks',
            onDelete: 'CASCADE',
          }),
        );
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('mero_board_task_dependencies', true);
  }
}
