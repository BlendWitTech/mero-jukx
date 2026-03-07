import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAuditLogSeverity1774000000000 implements MigrationInterface {
  name = 'AddAuditLogSeverity1774000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create enum type for severity
    await queryRunner.query(`
      CREATE TYPE "audit_log_severity_enum" AS ENUM('critical', 'warning', 'info')
    `);

    // Add severity column with default value
    await queryRunner.query(`
      ALTER TABLE "audit_logs" 
      ADD COLUMN "severity" "audit_log_severity_enum" NOT NULL DEFAULT 'info'
    `);

    // Create index on severity
    await queryRunner.query(`
      CREATE INDEX "IDX_audit_logs_severity" ON "audit_logs" ("severity")
    `);

    // Update existing logs based on action type
    // Critical: unauthorized access, security violations
    await queryRunner.query(`
      UPDATE "audit_logs" 
      SET "severity" = 'critical' 
      WHERE "action" LIKE '%unauthorized%' 
         OR "action" LIKE '%permission denied%'
         OR "action" LIKE '%security%'
         OR "action" LIKE '%breach%'
    `);

    // Warning: failed operations, errors
    await queryRunner.query(`
      UPDATE "audit_logs" 
      SET "severity" = 'warning' 
      WHERE "action" LIKE '%failed%' 
         OR "action" LIKE '%error%'
         OR "action" LIKE '%rejected%'
         OR "action" LIKE '%cancelled%'
    `);

    // Info: normal operations (default)
    // Already set as default, no update needed
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop index
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_audit_logs_severity"`);

    // Drop column
    await queryRunner.query(`ALTER TABLE "audit_logs" DROP COLUMN "severity"`);

    // Drop enum type
    await queryRunner.query(`DROP TYPE IF EXISTS "audit_log_severity_enum"`);
  }
}

