import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUserAppAccess1771000000006 implements MigrationInterface {
  name = 'CreateUserAppAccess1771000000006';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "user_app_access" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "organization_id" uuid NOT NULL,
        "app_id" integer NOT NULL,
        "granted_by" uuid NOT NULL,
        "member_id" uuid,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "PK_user_app_access" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_user_app_access_user_org_app" UNIQUE ("user_id", "organization_id", "app_id")
      );
    `);

    await queryRunner.query(`
      ALTER TABLE "user_app_access"
      ADD CONSTRAINT "FK_user_app_access_user"
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
    `);

    await queryRunner.query(`
      ALTER TABLE "user_app_access"
      ADD CONSTRAINT "FK_user_app_access_organization"
      FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE;
    `);

    await queryRunner.query(`
      ALTER TABLE "user_app_access"
      ADD CONSTRAINT "FK_user_app_access_app"
      FOREIGN KEY ("app_id") REFERENCES "apps"("id") ON DELETE CASCADE;
    `);

    await queryRunner.query(`
      ALTER TABLE "user_app_access"
      ADD CONSTRAINT "FK_user_app_access_granted_by"
      FOREIGN KEY ("granted_by") REFERENCES "users"("id") ON DELETE SET NULL;
    `);

    await queryRunner.query(`
      ALTER TABLE "user_app_access"
      ADD CONSTRAINT "FK_user_app_access_member"
      FOREIGN KEY ("member_id") REFERENCES "organization_members"("id") ON DELETE SET NULL;
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_user_app_access_user_org" ON "user_app_access"("user_id", "organization_id");
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_user_app_access_app_id" ON "user_app_access"("app_id");
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_user_app_access_granted_by" ON "user_app_access"("granted_by");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "user_app_access"`);
  }
}

