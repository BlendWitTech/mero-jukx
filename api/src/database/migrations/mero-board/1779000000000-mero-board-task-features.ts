import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class MeroBoardTaskFeatures1779000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create task_comments table
    await queryRunner.createTable(
      new Table({
        name: 'mero_board_task_comments',
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
            name: 'author_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'body',
            type: 'text',
            isNullable: false,
          },
          {
            name: 'parent_comment_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'is_edited',
            type: 'boolean',
            default: false,
          },
          {
            name: 'is_deleted',
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

    const commentsTable = await queryRunner.getTable('mero_board_task_comments');
    if (commentsTable) {
      // Create indexes for task_comments
      if (!commentsTable.indices.find(idx => idx.name === 'IDX_task_comments_task_id' || idx.columnNames.includes('task_id'))) {
        await queryRunner.createIndex(
          'mero_board_task_comments',
          new TableIndex({
            name: 'IDX_task_comments_task_id',
            columnNames: ['task_id'],
          }),
        );
      }
      if (!commentsTable.indices.find(idx => idx.name === 'IDX_task_comments_author_id' || idx.columnNames.includes('author_id'))) {
        await queryRunner.createIndex(
          'mero_board_task_comments',
          new TableIndex({
            name: 'IDX_task_comments_author_id',
            columnNames: ['author_id'],
          }),
        );
      }
      if (!commentsTable.indices.find(idx => idx.name === 'IDX_task_comments_created_at' || idx.columnNames.includes('created_at'))) {
        await queryRunner.createIndex(
          'mero_board_task_comments',
          new TableIndex({
            name: 'IDX_task_comments_created_at',
            columnNames: ['created_at'],
          }),
        );
      }

      // Create foreign keys for task_comments
      if (!commentsTable.foreignKeys.find(fk => fk.columnNames.includes('task_id'))) {
        await queryRunner.createForeignKey(
          'mero_board_task_comments',
          new TableForeignKey({
            columnNames: ['task_id'],
            referencedColumnNames: ['id'],
            referencedTableName: 'tasks',
            onDelete: 'CASCADE',
          }),
        );
      }
      if (!commentsTable.foreignKeys.find(fk => fk.columnNames.includes('author_id'))) {
        await queryRunner.createForeignKey(
          'mero_board_task_comments',
          new TableForeignKey({
            columnNames: ['author_id'],
            referencedColumnNames: ['id'],
            referencedTableName: 'users',
            onDelete: 'CASCADE',
          }),
        );
      }
      if (!commentsTable.foreignKeys.find(fk => fk.columnNames.includes('parent_comment_id'))) {
        await queryRunner.createForeignKey(
          'mero_board_task_comments',
          new TableForeignKey({
            columnNames: ['parent_comment_id'],
            referencedColumnNames: ['id'],
            referencedTableName: 'mero_board_task_comments',
            onDelete: 'CASCADE',
          }),
        );
      }
    }

    // Create task_attachments table
    await queryRunner.createTable(
      new Table({
        name: 'mero_board_task_attachments',
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
            name: 'file_name',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'file_url',
            type: 'varchar',
            length: '500',
            isNullable: false,
          },
          {
            name: 'file_type',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'file_size',
            type: 'bigint',
            isNullable: false,
          },
          {
            name: 'thumbnail_url',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'uploaded_by',
            type: 'uuid',
            isNullable: false,
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

    const attachmentsTable = await queryRunner.getTable('mero_board_task_attachments');
    if (attachmentsTable) {
      // Create indexes for task_attachments
      if (!attachmentsTable.indices.find(idx => idx.name === 'IDX_task_attachments_task_id' || idx.columnNames.includes('task_id'))) {
        await queryRunner.createIndex(
          'mero_board_task_attachments',
          new TableIndex({
            name: 'IDX_task_attachments_task_id',
            columnNames: ['task_id'],
          }),
        );
      }
      if (!attachmentsTable.indices.find(idx => idx.name === 'IDX_task_attachments_uploaded_by' || idx.columnNames.includes('uploaded_by'))) {
        await queryRunner.createIndex(
          'mero_board_task_attachments',
          new TableIndex({
            name: 'IDX_task_attachments_uploaded_by',
            columnNames: ['uploaded_by'],
          }),
        );
      }

      // Create foreign keys for task_attachments
      if (!attachmentsTable.foreignKeys.find(fk => fk.columnNames.includes('task_id'))) {
        await queryRunner.createForeignKey(
          'mero_board_task_attachments',
          new TableForeignKey({
            columnNames: ['task_id'],
            referencedColumnNames: ['id'],
            referencedTableName: 'tasks',
            onDelete: 'CASCADE',
          }),
        );
      }
      if (!attachmentsTable.foreignKeys.find(fk => fk.columnNames.includes('uploaded_by'))) {
        await queryRunner.createForeignKey(
          'mero_board_task_attachments',
          new TableForeignKey({
            columnNames: ['uploaded_by'],
            referencedColumnNames: ['id'],
            referencedTableName: 'users',
            onDelete: 'CASCADE',
          }),
        );
      }
    }

    // Create task_activities table
    await queryRunner.createTable(
      new Table({
        name: 'mero_board_task_activities',
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
            name: 'activity_type',
            type: 'varchar',
            length: '50',
            isNullable: false,
          },
          {
            name: 'old_value',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'new_value',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'related_comment_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'related_attachment_id',
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

    const activitiesTable = await queryRunner.getTable('mero_board_task_activities');
    if (activitiesTable) {
      // Create indexes for task_activities
      if (!activitiesTable.indices.find(idx => idx.name === 'IDX_task_activities_task_id' || idx.columnNames.includes('task_id'))) {
        await queryRunner.createIndex(
          'mero_board_task_activities',
          new TableIndex({
            name: 'IDX_task_activities_task_id',
            columnNames: ['task_id'],
          }),
        );
      }
      if (!activitiesTable.indices.find(idx => idx.name === 'IDX_task_activities_user_id' || idx.columnNames.includes('user_id'))) {
        await queryRunner.createIndex(
          'mero_board_task_activities',
          new TableIndex({
            name: 'IDX_task_activities_user_id',
            columnNames: ['user_id'],
          }),
        );
      }
      if (!activitiesTable.indices.find(idx => idx.name === 'IDX_task_activities_activity_type' || idx.columnNames.includes('activity_type'))) {
        await queryRunner.createIndex(
          'mero_board_task_activities',
          new TableIndex({
            name: 'IDX_task_activities_activity_type',
            columnNames: ['activity_type'],
          }),
        );
      }
      if (!activitiesTable.indices.find(idx => idx.name === 'IDX_task_activities_created_at' || idx.columnNames.includes('created_at'))) {
        await queryRunner.createIndex(
          'mero_board_task_activities',
          new TableIndex({
            name: 'IDX_task_activities_created_at',
            columnNames: ['created_at'],
          }),
        );
      }

      // Create foreign keys for task_activities
      if (!activitiesTable.foreignKeys.find(fk => fk.columnNames.includes('task_id'))) {
        await queryRunner.createForeignKey(
          'mero_board_task_activities',
          new TableForeignKey({
            columnNames: ['task_id'],
            referencedColumnNames: ['id'],
            referencedTableName: 'tasks',
            onDelete: 'CASCADE',
          }),
        );
      }
      if (!activitiesTable.foreignKeys.find(fk => fk.columnNames.includes('user_id'))) {
        await queryRunner.createForeignKey(
          'mero_board_task_activities',
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
    await queryRunner.dropTable('mero_board_task_activities', true);
    await queryRunner.dropTable('mero_board_task_attachments', true);
    await queryRunner.dropTable('mero_board_task_comments', true);
  }
}
