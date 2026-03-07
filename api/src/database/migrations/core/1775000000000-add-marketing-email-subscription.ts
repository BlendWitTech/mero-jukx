import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMarketingEmailSubscription1775000000000 implements MigrationInterface {
  name = 'AddMarketingEmailSubscription1775000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add marketing_email_subscribed column to notification_preferences
    await queryRunner.query(
      `ALTER TABLE "notification_preferences" ADD COLUMN "marketing_email_subscribed" boolean NOT NULL DEFAULT false`,
    );

    // Create index for faster queries
    await queryRunner.query(
      `CREATE INDEX "IDX_notification_preferences_marketing_subscribed" ON "notification_preferences" ("marketing_email_subscribed") WHERE "marketing_email_subscribed" = true`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop index
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_notification_preferences_marketing_subscribed"`,
    );

    // Drop column
    await queryRunner.query(
      `ALTER TABLE "notification_preferences" DROP COLUMN IF EXISTS "marketing_email_subscribed"`,
    );
  }
}

