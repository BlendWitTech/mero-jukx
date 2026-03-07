import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreateApiKeysAndWebhooks1766000000000 implements MigrationInterface {
  name = 'CreateApiKeysAndWebhooks1766000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create api_keys table
    await queryRunner.createTable(
      new Table({
        name: 'api_keys',
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
            name: 'created_by',
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
            name: 'key_hash',
            type: 'varchar',
            length: '255',
            isUnique: true,
          },
          {
            name: 'key_prefix',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['active', 'inactive', 'revoked'],
            default: "'active'",
          },
          {
            name: 'last_used_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'last_used_ip',
            type: 'varchar',
            length: '45',
            isNullable: true,
          },
          {
            name: 'expires_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'permissions',
            type: 'jsonb',
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
          {
            name: 'deleted_at',
            type: 'timestamp',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    const apiKeysTable = await queryRunner.getTable('api_keys');
    if (apiKeysTable) {
      if (!apiKeysTable.indices.find(idx => idx.name === 'IDX_API_KEY_ORG' || idx.columnNames.includes('organization_id'))) {
        await queryRunner.createIndex(
          'api_keys',
          new TableIndex({
            name: 'IDX_API_KEY_ORG',
            columnNames: ['organization_id'],
          }),
        );
      }

      if (!apiKeysTable.indices.find(idx => idx.name === 'IDX_API_KEY_HASH' || idx.columnNames.includes('key_hash'))) {
        await queryRunner.createIndex(
          'api_keys',
          new TableIndex({
            name: 'IDX_API_KEY_HASH',
            columnNames: ['key_hash'],
          }),
        );
      }

      if (!apiKeysTable.indices.find(idx => idx.name === 'IDX_API_KEY_STATUS' || idx.columnNames.includes('status'))) {
        await queryRunner.createIndex(
          'api_keys',
          new TableIndex({
            name: 'IDX_API_KEY_STATUS',
            columnNames: ['status'],
          }),
        );
      }

      if (!apiKeysTable.foreignKeys.find(fk => fk.columnNames.includes('organization_id'))) {
        await queryRunner.createForeignKey(
          'api_keys',
          new TableForeignKey({
            columnNames: ['organization_id'],
            referencedColumnNames: ['id'],
            referencedTableName: 'organizations',
            onDelete: 'CASCADE',
          }),
        );
      }

      if (!apiKeysTable.foreignKeys.find(fk => fk.columnNames.includes('created_by'))) {
        await queryRunner.createForeignKey(
          'api_keys',
          new TableForeignKey({
            columnNames: ['created_by'],
            referencedColumnNames: ['id'],
            referencedTableName: 'users',
          }),
        );
      }
    }

    // Create webhooks table
    await queryRunner.createTable(
      new Table({
        name: 'webhooks',
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
            name: 'created_by',
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
            name: 'url',
            type: 'varchar',
            length: '500',
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['active', 'inactive', 'failed'],
            default: "'active'",
          },
          {
            name: 'events',
            type: 'text',
          },
          {
            name: 'secret',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'success_count',
            type: 'int',
            default: 0,
          },
          {
            name: 'failure_count',
            type: 'int',
            default: 0,
          },
          {
            name: 'last_triggered_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'last_success_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'last_failure_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'last_error',
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
          {
            name: 'deleted_at',
            type: 'timestamp',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    const webhooksTable = await queryRunner.getTable('webhooks');
    if (webhooksTable) {
      if (!webhooksTable.indices.find(idx => idx.name === 'IDX_WEBHOOK_ORG' || idx.columnNames.includes('organization_id'))) {
        await queryRunner.createIndex(
          'webhooks',
          new TableIndex({
            name: 'IDX_WEBHOOK_ORG',
            columnNames: ['organization_id'],
          }),
        );
      }

      if (!webhooksTable.indices.find(idx => idx.name === 'IDX_WEBHOOK_STATUS' || idx.columnNames.includes('status'))) {
        await queryRunner.createIndex(
          'webhooks',
          new TableIndex({
            name: 'IDX_WEBHOOK_STATUS',
            columnNames: ['status'],
          }),
        );
      }

      if (!webhooksTable.foreignKeys.find(fk => fk.columnNames.includes('organization_id'))) {
        await queryRunner.createForeignKey(
          'webhooks',
          new TableForeignKey({
            columnNames: ['organization_id'],
            referencedColumnNames: ['id'],
            referencedTableName: 'organizations',
            onDelete: 'CASCADE',
          }),
        );
      }

      if (!webhooksTable.foreignKeys.find(fk => fk.columnNames.includes('created_by'))) {
        await queryRunner.createForeignKey(
          'webhooks',
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
    await queryRunner.dropTable('webhooks', true);
    await queryRunner.dropTable('api_keys', true);
  }
}
