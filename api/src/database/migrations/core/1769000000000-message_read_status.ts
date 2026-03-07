import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreateMessageReadStatus1769000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'message_read_status',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'message_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'user_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'delivered_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'read_at',
            type: 'timestamp',
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
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Create unique constraint for message_id + user_id
    // Check if index exists before creating
    const indexExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'IDX_message_read_status_message_user'
      );
    `);
    
    if (!indexExists[0].exists) {
      await queryRunner.createIndex(
        'message_read_status',
        new TableIndex({
          name: 'IDX_message_read_status_message_user',
          columnNames: ['message_id', 'user_id'],
          isUnique: true,
        }),
      );
    }

    // Create indexes - check if they exist first
    const messageIdIndexExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'IDX_message_read_status_message_id'
      );
    `);
    
    if (!messageIdIndexExists[0].exists) {
      await queryRunner.createIndex(
        'message_read_status',
        new TableIndex({
          name: 'IDX_message_read_status_message_id',
          columnNames: ['message_id'],
        }),
      );
    }

    const userIdIndexExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'IDX_message_read_status_user_id'
      );
    `);
    
    if (!userIdIndexExists[0].exists) {
      await queryRunner.createIndex(
        'message_read_status',
        new TableIndex({
          name: 'IDX_message_read_status_user_id',
          columnNames: ['user_id'],
        }),
      );
    }

    const readAtIndexExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'IDX_message_read_status_read_at'
      );
    `);
    
    if (!readAtIndexExists[0].exists) {
      await queryRunner.createIndex(
        'message_read_status',
        new TableIndex({
          name: 'IDX_message_read_status_read_at',
          columnNames: ['read_at'],
        }),
      );
    }

    // Create foreign keys - check if they exist first by checking the actual constraint
    const fkMessageExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.table_constraints tc
        INNER JOIN information_schema.key_column_usage kcu 
          ON tc.constraint_name = kcu.constraint_name
        WHERE tc.table_name = 'message_read_status'
          AND kcu.column_name = 'message_id'
          AND tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_schema = 'public'
      );
    `);
    
    if (!fkMessageExists[0].exists) {
      await queryRunner.createForeignKey(
        'message_read_status',
        new TableForeignKey({
          columnNames: ['message_id'],
          referencedColumnNames: ['id'],
          referencedTableName: 'messages',
          onDelete: 'CASCADE',
        }),
      );
    }

    const fkUserExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.table_constraints tc
        INNER JOIN information_schema.key_column_usage kcu 
          ON tc.constraint_name = kcu.constraint_name
        WHERE tc.table_name = 'message_read_status'
          AND kcu.column_name = 'user_id'
          AND tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_schema = 'public'
      );
    `);
    
    if (!fkUserExists[0].exists) {
      await queryRunner.createForeignKey(
        'message_read_status',
        new TableForeignKey({
          columnNames: ['user_id'],
          referencedColumnNames: ['id'],
          referencedTableName: 'users',
          onDelete: 'CASCADE',
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('message_read_status');
  }
}

