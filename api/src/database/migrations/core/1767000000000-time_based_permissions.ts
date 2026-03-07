import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreateTimeBasedAndCustomPermissions1767000000000 implements MigrationInterface {
  name = 'CreateTimeBasedAndCustomPermissions1767000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create time_based_permissions table
    await queryRunner.createTable(
      new Table({
        name: 'time_based_permissions',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'role_id',
            type: 'int',
          },
          {
            name: 'permission_id',
            type: 'int',
          },
          {
            name: 'starts_at',
            type: 'timestamp',
          },
          {
            name: 'expires_at',
            type: 'timestamp',
          },
          {
            name: 'is_active',
            type: 'boolean',
            default: true,
          },
          {
            name: 'granted_by',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'reason',
            type: 'text',
            isNullable: true,
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

    const timeTable = await queryRunner.getTable('time_based_permissions');
    if (timeTable) {
      if (!timeTable.indices.find(idx => idx.name === 'IDX_TIME_BASED_PERM_ROLE' || idx.columnNames.includes('role_id'))) {
        await queryRunner.createIndex(
          'time_based_permissions',
          new TableIndex({
            name: 'IDX_TIME_BASED_PERM_ROLE',
            columnNames: ['role_id'],
          }),
        );
      }
      if (!timeTable.indices.find(idx => idx.name === 'IDX_TIME_BASED_PERM_EXPIRES' || idx.columnNames.includes('expires_at'))) {
        await queryRunner.createIndex(
          'time_based_permissions',
          new TableIndex({
            name: 'IDX_TIME_BASED_PERM_EXPIRES',
            columnNames: ['expires_at'],
          }),
        );
      }
      if (!timeTable.indices.find(idx => idx.name === 'IDX_TIME_BASED_PERM_ACTIVE' || idx.columnNames.includes('is_active'))) {
        await queryRunner.createIndex(
          'time_based_permissions',
          new TableIndex({
            name: 'IDX_TIME_BASED_PERM_ACTIVE',
            columnNames: ['is_active'],
          }),
        );
      }

      if (!timeTable.foreignKeys.find(fk => fk.columnNames.includes('role_id'))) {
        await queryRunner.createForeignKey(
          'time_based_permissions',
          new TableForeignKey({
            columnNames: ['role_id'],
            referencedColumnNames: ['id'],
            referencedTableName: 'roles',
            onDelete: 'CASCADE',
          }),
        );
      }
      if (!timeTable.foreignKeys.find(fk => fk.columnNames.includes('permission_id'))) {
        await queryRunner.createForeignKey(
          'time_based_permissions',
          new TableForeignKey({
            columnNames: ['permission_id'],
            referencedColumnNames: ['id'],
            referencedTableName: 'permissions',
            onDelete: 'CASCADE',
          }),
        );
      }
      if (!timeTable.foreignKeys.find(fk => fk.columnNames.includes('granted_by'))) {
        await queryRunner.createForeignKey(
          'time_based_permissions',
          new TableForeignKey({
            columnNames: ['granted_by'],
            referencedColumnNames: ['id'],
            referencedTableName: 'users',
            onDelete: 'SET NULL',
          }),
        );
      }
    }

    // Create custom_permissions table
    await queryRunner.createTable(
      new Table({
        name: 'custom_permissions',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'organization_id',
            type: 'uuid',
          },
          {
            name: 'name',
            type: 'varchar',
            length: '100',
          },
          {
            name: 'slug',
            type: 'varchar',
            length: '100',
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'category',
            type: 'varchar',
            length: '50',
          },
          {
            name: 'is_active',
            type: 'boolean',
            default: true,
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

    const customTable = await queryRunner.getTable('custom_permissions');
    if (customTable) {
      if (!customTable.indices.find(idx => idx.name === 'IDX_CUSTOM_PERM_ORG' || (idx.columnNames.length === 1 && idx.columnNames.includes('organization_id')))) {
        await queryRunner.createIndex(
          'custom_permissions',
          new TableIndex({
            name: 'IDX_CUSTOM_PERM_ORG',
            columnNames: ['organization_id'],
          }),
        );
      }
      if (!customTable.indices.find(idx => idx.name === 'IDX_CUSTOM_PERM_SLUG' || (idx.columnNames.length === 1 && idx.columnNames.includes('slug')))) {
        await queryRunner.createIndex(
          'custom_permissions',
          new TableIndex({
            name: 'IDX_CUSTOM_PERM_SLUG',
            columnNames: ['slug'],
          }),
        );
      }
      if (!customTable.indices.find(idx => idx.name === 'IDX_CUSTOM_PERM_ACTIVE' || idx.columnNames.includes('is_active'))) {
        await queryRunner.createIndex(
          'custom_permissions',
          new TableIndex({
            name: 'IDX_CUSTOM_PERM_ACTIVE',
            columnNames: ['is_active'],
          }),
        );
      }
      if (!customTable.indices.find(idx => idx.name === 'IDX_CUSTOM_PERM_ORG_SLUG' || (idx.columnNames.includes('organization_id') && idx.columnNames.includes('slug')))) {
        await queryRunner.createIndex(
          'custom_permissions',
          new TableIndex({
            name: 'IDX_CUSTOM_PERM_ORG_SLUG',
            columnNames: ['organization_id', 'slug'],
            isUnique: true,
          }),
        );
      }

      if (!customTable.foreignKeys.find(fk => fk.columnNames.includes('organization_id'))) {
        await queryRunner.createForeignKey(
          'custom_permissions',
          new TableForeignKey({
            columnNames: ['organization_id'],
            referencedColumnNames: ['id'],
            referencedTableName: 'organizations',
            onDelete: 'CASCADE',
          }),
        );
      }
      if (!customTable.foreignKeys.find(fk => fk.columnNames.includes('created_by'))) {
        await queryRunner.createForeignKey(
          'custom_permissions',
          new TableForeignKey({
            columnNames: ['created_by'],
            referencedColumnNames: ['id'],
            referencedTableName: 'users',
          }),
        );
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('custom_permissions', true);
    await queryRunner.dropTable('time_based_permissions', true);
  }
}
