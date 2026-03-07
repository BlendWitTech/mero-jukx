import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPerformanceIndexes1765000000000 implements MigrationInterface {
  name = 'AddPerformanceIndexes1765000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Composite index for organization_members lookups
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_org_members_org_user" 
      ON "organization_members" ("organization_id", "user_id", "status")
    `);

    // Composite index for notifications queries (unread by user and org)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_notifications_user_org_unread" 
      ON "notifications" ("user_id", "organization_id", "read_at", "created_at")
      WHERE "read_at" IS NULL
    `);

    // Composite index for audit logs queries
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_audit_logs_org_created" 
      ON "audit_logs" ("organization_id", "created_at" DESC)
    `);

    // Composite index for messages in chat
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_messages_chat_created" 
      ON "messages" ("chat_id", "created_at" DESC)
    `);

    // Composite index for chat members lookups
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_chat_members_chat_user" 
      ON "chat_members" ("chat_id", "user_id", "status")
    `);

    // Composite index for sessions (active sessions lookup)
    // Note: Cannot use NOW() in index predicate, so we index on expires_at and filter in queries
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_sessions_user_org_active"
      ON "sessions" ("user_id", "organization_id", "expires_at")
    `);

    // Index for package expiration checks
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_orgs_package_expires" 
      ON "organizations" ("package_expires_at")
      WHERE "package_expires_at" IS NOT NULL
    `);

    // Composite index for invitations (pending invitations)
    // Note: Cannot use NOW() in index predicate, so we index on status and expires_at and filter in queries
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_invitations_org_status_expires"
      ON "invitations" ("organization_id", "status", "expires_at")
      WHERE "status" = 'pending'
    `);

    // Index for user roles lookup
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_roles_org_active" 
      ON "roles" ("organization_id", "is_active")
      WHERE "is_active" = true
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_org_members_org_user"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_notifications_user_org_unread"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_audit_logs_org_created"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_messages_chat_created"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_chat_members_chat_user"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_sessions_user_org_active"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_orgs_package_expires"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_invitations_org_status_expires"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_roles_org_active"`);
  }
}

