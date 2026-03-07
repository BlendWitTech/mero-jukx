import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreateTicketsTables1771000000001 implements MigrationInterface {
  name = 'CreateTicketsTables1771000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Create Enums
    await queryRunner.query(`DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tickets_status_enum') THEN
            CREATE TYPE "public"."tickets_status_enum" AS ENUM('open', 'in_progress', 'resolved', 'closed');
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tickets_priority_enum') THEN
            CREATE TYPE "public"."tickets_priority_enum" AS ENUM('low', 'medium', 'high', 'urgent');
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tickets_source_enum') THEN
            CREATE TYPE "public"."tickets_source_enum" AS ENUM('regular', 'chat_flag', 'admin_chat');
        END IF;
    END $$;`);

    // 2. Create tickets table
    await queryRunner.createTable(
      new Table({
        name: 'tickets',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            isGenerated: true,
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
            name: 'assignee_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'title',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'tickets_status_enum',
            default: "'open'",
          },
          {
            name: 'priority',
            type: 'tickets_priority_enum',
            default: "'medium'",
          },
          {
            name: 'source',
            type: 'tickets_source_enum',
            default: "'regular'",
          },
          {
            name: 'chat_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'message_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'tags',
            type: 'text',
            isArray: true,
            default: "'{}'::text[]",
          },
          {
            name: 'attachment_urls',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'now()',
          },
        ],
      }),
      true,
    );

    const ticketsTable = await queryRunner.getTable('tickets');
    if (ticketsTable) {
      // Indices
      const indices = [
        { name: 'IDX_tickets_org', columns: ['organization_id'] },
        { name: 'IDX_tickets_status', columns: ['status'] },
        { name: 'IDX_tickets_priority', columns: ['priority'] },
        { name: 'IDX_tickets_assignee', columns: ['assignee_id'] },
        { name: 'IDX_tickets_created_by', columns: ['created_by'] },
        { name: 'IDX_tickets_chat', columns: ['chat_id'] },
      ];

      for (const idx of indices) {
        if (!ticketsTable.indices.find(i => i.name === idx.name || i.columnNames.includes(idx.columns[0]))) {
          await queryRunner.createIndex('tickets', new TableIndex({
            name: idx.name,
            columnNames: idx.columns,
          }));
        }
      }

      // Foreign Keys
      if (!ticketsTable.foreignKeys.find(fk => fk.name === 'FK_tickets_org' || fk.columnNames.includes('organization_id'))) {
        await queryRunner.createForeignKey('tickets', new TableForeignKey({
          name: 'FK_tickets_org',
          columnNames: ['organization_id'],
          referencedColumnNames: ['id'],
          referencedTableName: 'organizations',
          onDelete: 'CASCADE',
        }));
      }
      if (!ticketsTable.foreignKeys.find(fk => fk.name === 'FK_tickets_created_by' || fk.columnNames.includes('created_by'))) {
        await queryRunner.createForeignKey('tickets', new TableForeignKey({
          name: 'FK_tickets_created_by',
          columnNames: ['created_by'],
          referencedColumnNames: ['id'],
          referencedTableName: 'users',
          onDelete: 'NO ACTION',
        }));
      }
      if (!ticketsTable.foreignKeys.find(fk => fk.name === 'FK_tickets_assignee' || fk.columnNames.includes('assignee_id'))) {
        await queryRunner.createForeignKey('tickets', new TableForeignKey({
          name: 'FK_tickets_assignee',
          columnNames: ['assignee_id'],
          referencedColumnNames: ['id'],
          referencedTableName: 'users',
          onDelete: 'SET NULL',
        }));
      }
      if (!ticketsTable.foreignKeys.find(fk => fk.name === 'FK_tickets_chat' || fk.columnNames.includes('chat_id'))) {
        await queryRunner.createForeignKey('tickets', new TableForeignKey({
          name: 'FK_tickets_chat',
          columnNames: ['chat_id'],
          referencedColumnNames: ['id'],
          referencedTableName: 'chats',
          onDelete: 'SET NULL',
        }));
      }
      if (!ticketsTable.foreignKeys.find(fk => fk.name === 'FK_tickets_message' || fk.columnNames.includes('message_id'))) {
        await queryRunner.createForeignKey('tickets', new TableForeignKey({
          name: 'FK_tickets_message',
          columnNames: ['message_id'],
          referencedColumnNames: ['id'],
          referencedTableName: 'messages',
          onDelete: 'SET NULL',
        }));
      }
    }

    // 3. Create ticket_comments table
    await queryRunner.createTable(
      new Table({
        name: 'ticket_comments',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'ticket_id',
            type: 'uuid',
          },
          {
            name: 'author_id',
            type: 'uuid',
          },
          {
            name: 'body',
            type: 'text',
          },
          {
            name: 'attachment_urls',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'now()',
          },
        ],
      }),
      true,
    );

    const commentsTable = await queryRunner.getTable('ticket_comments');
    if (commentsTable) {
      // Indices
      if (!commentsTable.indices.find(idx => idx.name === 'IDX_ticket_comments_ticket' || idx.columnNames.includes('ticket_id'))) {
        await queryRunner.createIndex('ticket_comments', new TableIndex({
          name: 'IDX_ticket_comments_ticket',
          columnNames: ['ticket_id'],
        }));
      }
      if (!commentsTable.indices.find(idx => idx.name === 'IDX_ticket_comments_author' || idx.columnNames.includes('author_id'))) {
        await queryRunner.createIndex('ticket_comments', new TableIndex({
          name: 'IDX_ticket_comments_author',
          columnNames: ['author_id'],
        }));
      }

      // Foreign Keys
      if (!commentsTable.foreignKeys.find(fk => fk.name === 'FK_ticket_comments_ticket' || fk.columnNames.includes('ticket_id'))) {
        await queryRunner.createForeignKey('ticket_comments', new TableForeignKey({
          name: 'FK_ticket_comments_ticket',
          columnNames: ['ticket_id'],
          referencedColumnNames: ['id'],
          referencedTableName: 'tickets',
          onDelete: 'CASCADE',
        }));
      }
      if (!commentsTable.foreignKeys.find(fk => fk.name === 'FK_ticket_comments_author' || fk.columnNames.includes('author_id'))) {
        await queryRunner.createForeignKey('ticket_comments', new TableForeignKey({
          name: 'FK_ticket_comments_author',
          columnNames: ['author_id'],
          referencedColumnNames: ['id'],
          referencedTableName: 'users',
          onDelete: 'NO ACTION',
        }));
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('ticket_comments', true);
    await queryRunner.dropTable('tickets', true);
    await queryRunner.query(`DROP TYPE IF EXISTS "tickets_source_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "tickets_priority_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "tickets_status_enum"`);
  }
}
