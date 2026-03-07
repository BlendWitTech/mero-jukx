import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddInvoicesForApps1771000000004 implements MigrationInterface {
  name = 'AddInvoicesForApps1771000000004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "public"."invoices_status_enum" AS ENUM('unpaid','paid','overdue');
    `);

    await queryRunner.query(`
      CREATE TABLE "invoices" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "organization_id" uuid NOT NULL,
        "app_id" integer,
        "payment_id" uuid,
        "amount" numeric(10,2) NOT NULL,
        "currency" varchar(10) NOT NULL,
        "status" "public"."invoices_status_enum" NOT NULL DEFAULT 'unpaid',
        "due_date" TIMESTAMP NOT NULL,
        "paid_at" TIMESTAMP,
        "metadata" jsonb,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_invoices_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_invoices_org" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_invoices_app" FOREIGN KEY ("app_id") REFERENCES "apps"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_invoices_payment" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`CREATE INDEX "IDX_invoices_org" ON "invoices" ("organization_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_invoices_status" ON "invoices" ("status")`);
    await queryRunner.query(`CREATE INDEX "IDX_invoices_due" ON "invoices" ("due_date")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_invoices_due"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_invoices_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_invoices_org"`);
    await queryRunner.query(`DROP TABLE "invoices"`);
    await queryRunner.query(`DROP TYPE "public"."invoices_status_enum"`);
  }
}

