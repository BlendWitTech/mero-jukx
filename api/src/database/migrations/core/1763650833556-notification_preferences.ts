import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNotificationPreferences1763650833556 implements MigrationInterface {
  name = 'AddNotificationPreferences1763650833556';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create enum type for notification preference scope
    await queryRunner.query(
      `CREATE TYPE "public"."notification_preferences_scope_enum" AS ENUM('personal', 'organization')`,
    );

    // Create notification_preferences table
    await queryRunner.query(`CREATE TABLE "notification_preferences" (
            "id" uuid NOT NULL DEFAULT uuid_generate_v4(), 
            "user_id" uuid NOT NULL, 
            "organization_id" uuid, 
            "scope" "public"."notification_preferences_scope_enum" NOT NULL DEFAULT 'personal', 
            "email_enabled" boolean NOT NULL DEFAULT true, 
            "in_app_enabled" boolean NOT NULL DEFAULT true, 
            "preferences" jsonb, 
            "created_at" TIMESTAMP NOT NULL DEFAULT now(), 
            "updated_at" TIMESTAMP NOT NULL DEFAULT now(), 
            CONSTRAINT "UQ_d79f3c3661a2c38e3622268bd4d" UNIQUE ("user_id", "organization_id", "scope"), 
            CONSTRAINT "PK_e94e2b543f2f218ee68e4f4fad2" PRIMARY KEY ("id")
        )`);

    // Create indexes
    await queryRunner.query(
      `CREATE INDEX "IDX_64c90edc7310c6be7c10c96f67" ON "notification_preferences" ("user_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_7e6d48f418bce30f6bed5e9e6f" ON "notification_preferences" ("organization_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_185e6e397d3f589e0036f2fa61" ON "notification_preferences" ("scope")`,
    );

    // Add foreign key constraints
    await queryRunner.query(
      `ALTER TABLE "notification_preferences" ADD CONSTRAINT "FK_64c90edc7310c6be7c10c96f675" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "notification_preferences" ADD CONSTRAINT "FK_7e6d48f418bce30f6bed5e9e6f3" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign key constraints
    await queryRunner.query(
      `ALTER TABLE "notification_preferences" DROP CONSTRAINT "FK_7e6d48f418bce30f6bed5e9e6f3"`,
    );
    await queryRunner.query(
      `ALTER TABLE "notification_preferences" DROP CONSTRAINT "FK_64c90edc7310c6be7c10c96f675"`,
    );

    // Drop indexes
    await queryRunner.query(`DROP INDEX "public"."IDX_185e6e397d3f589e0036f2fa61"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_7e6d48f418bce30f6bed5e9e6f"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_64c90edc7310c6be7c10c96f67"`);

    // Drop table
    await queryRunner.query(`DROP TABLE "notification_preferences"`);

    // Drop enum type
    await queryRunner.query(`DROP TYPE "public"."notification_preferences_scope_enum"`);
  }
}
