import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTicketTimeTracking1777000000000 implements MigrationInterface {
  name = 'AddTicketTimeTracking1777000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add time tracking fields
    await queryRunner.query(
      `ALTER TABLE "tickets" ADD COLUMN "estimated_time_minutes" integer NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "tickets" ADD COLUMN "actual_time_minutes" integer NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "tickets" ADD COLUMN "due_date" TIMESTAMP NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "tickets" ADD COLUMN "completed_at" TIMESTAMP NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "tickets" ADD COLUMN "additional_time_requested_minutes" integer NULL`,
    );

    // Add transfer fields
    await queryRunner.query(
      `ALTER TABLE "tickets" ADD COLUMN "transferred_from_user_id" uuid NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "tickets" ADD COLUMN "transferred_to_user_id" uuid NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "tickets" ADD COLUMN "transferred_at" TIMESTAMP NULL`,
    );

    // Add foreign keys for transfer fields
    await queryRunner.query(
      `ALTER TABLE "tickets" ADD CONSTRAINT "FK_tickets_transferred_from_user" FOREIGN KEY ("transferred_from_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "tickets" ADD CONSTRAINT "FK_tickets_transferred_to_user" FOREIGN KEY ("transferred_to_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );

    // Add indexes for performance
    await queryRunner.query(
      `CREATE INDEX "IDX_tickets_due_date" ON "tickets" ("due_date") WHERE "due_date" IS NOT NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_tickets_completed_at" ON "tickets" ("completed_at") WHERE "completed_at" IS NOT NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_tickets_transferred_from" ON "tickets" ("transferred_from_user_id") WHERE "transferred_from_user_id" IS NOT NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_tickets_transferred_to" ON "tickets" ("transferred_to_user_id") WHERE "transferred_to_user_id" IS NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_tickets_transferred_to"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_tickets_transferred_from"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_tickets_completed_at"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_tickets_due_date"`);

    // Drop foreign keys
    await queryRunner.query(
      `ALTER TABLE "tickets" DROP CONSTRAINT IF EXISTS "FK_tickets_transferred_to_user"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tickets" DROP CONSTRAINT IF EXISTS "FK_tickets_transferred_from_user"`,
    );

    // Drop columns
    await queryRunner.query(
      `ALTER TABLE "tickets" DROP COLUMN IF EXISTS "transferred_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tickets" DROP COLUMN IF EXISTS "transferred_to_user_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tickets" DROP COLUMN IF EXISTS "transferred_from_user_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tickets" DROP COLUMN IF EXISTS "additional_time_requested_minutes"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tickets" DROP COLUMN IF EXISTS "completed_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tickets" DROP COLUMN IF EXISTS "due_date"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tickets" DROP COLUMN IF EXISTS "actual_time_minutes"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tickets" DROP COLUMN IF EXISTS "estimated_time_minutes"`,
    );
  }
}


