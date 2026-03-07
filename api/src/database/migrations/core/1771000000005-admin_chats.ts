import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAdminChatTables1771000000005 implements MigrationInterface {
  name = 'CreateAdminChatTables1771000000005';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create admin_chat_status enum
    await queryRunner.query(`
      CREATE TYPE "admin_chat_status_enum" AS ENUM('open', 'in_progress', 'resolved', 'closed');
    `);

    // Create admin_chat_message_type enum
    await queryRunner.query(`
      CREATE TYPE "admin_chat_message_type_enum" AS ENUM('text', 'system');
    `);

    // Create admin_chats table
    await queryRunner.query(`
      CREATE TABLE "admin_chats" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "organization_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "admin_id" uuid,
        "status" "admin_chat_status_enum" NOT NULL DEFAULT 'open',
        "subject" varchar(255),
        "last_message_at" timestamp,
        "last_message_id" uuid,
        "unread_count_user" integer NOT NULL DEFAULT 0,
        "unread_count_admin" integer NOT NULL DEFAULT 0,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "PK_admin_chats" PRIMARY KEY ("id")
      );
    `);

    // Create admin_chat_messages table
    await queryRunner.query(`
      CREATE TABLE "admin_chat_messages" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "admin_chat_id" uuid NOT NULL,
        "sender_id" uuid NOT NULL,
        "type" "admin_chat_message_type_enum" NOT NULL DEFAULT 'text',
        "content" text NOT NULL,
        "is_from_admin" boolean NOT NULL DEFAULT false,
        "is_read" boolean NOT NULL DEFAULT false,
        "read_at" timestamp,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "PK_admin_chat_messages" PRIMARY KEY ("id")
      );
    `);

    // Create admin_chat_message_attachments table
    await queryRunner.query(`
      CREATE TABLE "admin_chat_message_attachments" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "message_id" uuid NOT NULL,
        "file_name" varchar(255) NOT NULL,
        "file_url" varchar(500) NOT NULL,
        "file_type" varchar(100),
        "file_size" bigint,
        "created_at" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "PK_admin_chat_message_attachments" PRIMARY KEY ("id")
      );
    `);

    // Add foreign keys
    await queryRunner.query(`
      ALTER TABLE "admin_chats"
      ADD CONSTRAINT "FK_admin_chats_organization"
      FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE;
    `);

    await queryRunner.query(`
      ALTER TABLE "admin_chats"
      ADD CONSTRAINT "FK_admin_chats_user"
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
    `);

    await queryRunner.query(`
      ALTER TABLE "admin_chats"
      ADD CONSTRAINT "FK_admin_chats_admin"
      FOREIGN KEY ("admin_id") REFERENCES "users"("id") ON DELETE SET NULL;
    `);

    await queryRunner.query(`
      ALTER TABLE "admin_chat_messages"
      ADD CONSTRAINT "FK_admin_chat_messages_chat"
      FOREIGN KEY ("admin_chat_id") REFERENCES "admin_chats"("id") ON DELETE CASCADE;
    `);

    await queryRunner.query(`
      ALTER TABLE "admin_chat_messages"
      ADD CONSTRAINT "FK_admin_chat_messages_sender"
      FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE CASCADE;
    `);

    await queryRunner.query(`
      ALTER TABLE "admin_chat_message_attachments"
      ADD CONSTRAINT "FK_admin_chat_message_attachments_message"
      FOREIGN KEY ("message_id") REFERENCES "admin_chat_messages"("id") ON DELETE CASCADE;
    `);

    // Create indexes
    await queryRunner.query(`
      CREATE INDEX "IDX_admin_chats_organization_id" ON "admin_chats"("organization_id");
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_admin_chats_user_id" ON "admin_chats"("user_id");
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_admin_chats_status" ON "admin_chats"("status");
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_admin_chats_created_at" ON "admin_chats"("created_at");
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_admin_chat_messages_chat_id" ON "admin_chat_messages"("admin_chat_id");
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_admin_chat_messages_sender_id" ON "admin_chat_messages"("sender_id");
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_admin_chat_messages_created_at" ON "admin_chat_messages"("created_at");
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_admin_chat_message_attachments_message_id" ON "admin_chat_message_attachments"("message_id");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "admin_chat_message_attachments"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "admin_chat_messages"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "admin_chats"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "admin_chat_message_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "admin_chat_status_enum"`);
  }
}

