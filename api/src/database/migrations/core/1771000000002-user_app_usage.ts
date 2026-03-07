import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAppUsageAndFavorites1771000000002 implements MigrationInterface {
  name = 'CreateAppUsageAndFavorites1771000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "user_app_usage" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "organization_id" uuid NOT NULL,
        "app_id" integer NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_user_app_usage" PRIMARY KEY ("id"),
        CONSTRAINT "FK_user_app_usage_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
        CONSTRAINT "FK_user_app_usage_org" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
        CONSTRAINT "FK_user_app_usage_app" FOREIGN KEY ("app_id") REFERENCES "apps"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_user_app_usage_user_org" ON "user_app_usage" ("user_id", "organization_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_user_app_usage_created" ON "user_app_usage" ("created_at")`);

    await queryRunner.query(`
      CREATE TABLE "user_app_favorites" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "organization_id" uuid NOT NULL,
        "app_id" integer NOT NULL,
        "sort_order" integer NOT NULL DEFAULT 0,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_user_app_favorites" PRIMARY KEY ("id"),
        CONSTRAINT "FK_user_app_fav_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
        CONSTRAINT "FK_user_app_fav_org" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
        CONSTRAINT "FK_user_app_fav_app" FOREIGN KEY ("app_id") REFERENCES "apps"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_user_app_favorites_user_org" ON "user_app_favorites" ("user_id", "organization_id")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_user_app_favorites_user_org"`);
    await queryRunner.query(`DROP TABLE "user_app_favorites"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_user_app_usage_created"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_user_app_usage_user_org"`);
    await queryRunner.query(`DROP TABLE "user_app_usage"`);
  }
}

