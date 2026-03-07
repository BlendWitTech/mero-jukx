import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex, TableUnique } from 'typeorm';

export class CreateUserAppPinned1771000000008 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'user_app_pinned',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'user_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'organization_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'app_id',
            type: 'integer',
            isNullable: false,
          },
          {
            name: 'sort_order',
            type: 'integer',
            default: 0,
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

    const table = await queryRunner.getTable('user_app_pinned');
    if (table) {
      // Foreign Keys
      if (!table.foreignKeys.find(fk => fk.columnNames.includes('user_id'))) {
        await queryRunner.createForeignKey(
          'user_app_pinned',
          new TableForeignKey({
            columnNames: ['user_id'],
            referencedColumnNames: ['id'],
            referencedTableName: 'users',
            onDelete: 'CASCADE',
          }),
        );
      }

      if (!table.foreignKeys.find(fk => fk.columnNames.includes('organization_id'))) {
        await queryRunner.createForeignKey(
          'user_app_pinned',
          new TableForeignKey({
            columnNames: ['organization_id'],
            referencedColumnNames: ['id'],
            referencedTableName: 'organizations',
            onDelete: 'CASCADE',
          }),
        );
      }

      if (!table.foreignKeys.find(fk => fk.columnNames.includes('app_id'))) {
        await queryRunner.createForeignKey(
          'user_app_pinned',
          new TableForeignKey({
            columnNames: ['app_id'],
            referencedColumnNames: ['id'],
            referencedTableName: 'apps',
            onDelete: 'CASCADE',
          }),
        );
      }

      // Unique Constraint
      if (!table.uniques.find(uq => uq.columnNames.includes('user_id') && uq.columnNames.includes('organization_id') && uq.columnNames.includes('app_id'))) {
        await queryRunner.createUniqueConstraint(
          'user_app_pinned',
          new TableUnique({
            columnNames: ['user_id', 'organization_id', 'app_id'],
          }),
        );
      }

      // Index
      if (!table.indices.find(idx => idx.name === 'IDX_USER_APP_PINNED_USER_ORG' || (idx.columnNames.includes('user_id') && idx.columnNames.includes('organization_id')))) {
        await queryRunner.createIndex(
          'user_app_pinned',
          new TableIndex({
            name: 'IDX_USER_APP_PINNED_USER_ORG',
            columnNames: ['user_id', 'organization_id'],
          }),
        );
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('user_app_pinned', true);
  }
}
