import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPaymentsTable1763733064840 implements MigrationInterface {
  name = 'AddPaymentsTable1763733064840';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "invitations" DROP CONSTRAINT "FK_0c292d64b056e6ae82ebf07434d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization_documents" DROP CONSTRAINT "FK_organization_documents_organization"`,
    );
    await queryRunner.query(
      `ALTER TABLE "role_templates" DROP CONSTRAINT "FK_role_templates_package"`,
    );
    await queryRunner.query(
      `ALTER TABLE "role_template_permissions" DROP CONSTRAINT "FK_role_template_permissions_permission"`,
    );
    await queryRunner.query(
      `ALTER TABLE "role_template_permissions" DROP CONSTRAINT "FK_role_template_permissions_template"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_organization_documents_org_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_organization_documents_type"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_organization_documents_is_active"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_role_templates_package_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_role_templates_is_active"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_role_template_permissions_template"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_role_template_permissions_permission"`);
    await queryRunner.query(
      `ALTER TABLE "role_templates" DROP CONSTRAINT "UQ_role_templates_package_slug"`,
    );
    await queryRunner.query(
      `ALTER TABLE "role_template_permissions" DROP CONSTRAINT "UQ_role_template_permissions"`,
    );
    await queryRunner.query(`CREATE TYPE "public"."payments_gateway_enum" AS ENUM('esewa')`);
    await queryRunner.query(
      `CREATE TYPE "public"."payments_payment_type_enum" AS ENUM('package_upgrade', 'subscription', 'one_time')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."payments_status_enum" AS ENUM('pending', 'completed', 'failed', 'cancelled', 'refunded')`,
    );
    await queryRunner.query(
      `CREATE TABLE "payments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "organization_id" uuid NOT NULL, "user_id" uuid NOT NULL, "transaction_id" character varying(255) NOT NULL, "reference_id" character varying(100), "gateway" "public"."payments_gateway_enum" NOT NULL, "payment_type" "public"."payments_payment_type_enum" NOT NULL, "amount" numeric(10,2) NOT NULL, "currency" character varying(10) NOT NULL DEFAULT 'NPR', "description" text, "status" "public"."payments_status_enum" NOT NULL DEFAULT 'pending', "gateway_response" text, "failure_reason" text, "completed_at" TIMESTAMP, "metadata" jsonb, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_3c324ca49dabde7ffc0ef64675d" UNIQUE ("transaction_id"), CONSTRAINT "PK_197ab7af18c93fbb0c9b28b4a59" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_fc07ace491143726974991711f" ON "payments" ("organization_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_427785468fb7d2733f59e7d7d3" ON "payments" ("user_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_094fd3232fe017b7d6ec81c4b5" ON "payments" ("gateway") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_32b41cdb985a296213e9a928b5" ON "payments" ("status") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_3c324ca49dabde7ffc0ef64675" ON "payments" ("transaction_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_53b492b28f1cc0664edb6bfddb" ON "organization_documents" ("is_active") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ed46eb2faeb4e011fabe61459c" ON "organization_documents" ("document_type") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_3a028be3e263bf8bf5dc2e4675" ON "organization_documents" ("organization_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_d5ed76d22b3c3955a338191cc7" ON "role_templates" ("package_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_2be5b2c2cf18eb4cf2ca3d8401" ON "role_templates" ("is_active") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_b19600e51c7b2e1d4165d46d03" ON "role_template_permissions" ("permission_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_7a4c3b54aad22ecb9790c4a972" ON "role_template_permissions" ("role_template_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "role_templates" ADD CONSTRAINT "UQ_21f493207f532f7acecc09db8c2" UNIQUE ("package_id", "slug")`,
    );
    await queryRunner.query(
      `ALTER TABLE "role_template_permissions" ADD CONSTRAINT "UQ_5e71544d57d83b7a4ccf993a80c" UNIQUE ("role_template_id", "permission_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "invitations" ADD CONSTRAINT "FK_0c292d64b056e6ae82ebf07434d" FOREIGN KEY ("cancelled_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization_documents" ADD CONSTRAINT "FK_3a028be3e263bf8bf5dc2e46759" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "role_templates" ADD CONSTRAINT "FK_d5ed76d22b3c3955a338191cc7a" FOREIGN KEY ("package_id") REFERENCES "packages"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "role_template_permissions" ADD CONSTRAINT "FK_7a4c3b54aad22ecb9790c4a9727" FOREIGN KEY ("role_template_id") REFERENCES "role_templates"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "role_template_permissions" ADD CONSTRAINT "FK_b19600e51c7b2e1d4165d46d03a" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" ADD CONSTRAINT "FK_fc07ace491143726974991711f2" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" ADD CONSTRAINT "FK_427785468fb7d2733f59e7d7d39" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "payments" DROP CONSTRAINT "FK_427785468fb7d2733f59e7d7d39"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" DROP CONSTRAINT "FK_fc07ace491143726974991711f2"`,
    );
    await queryRunner.query(
      `ALTER TABLE "role_template_permissions" DROP CONSTRAINT "FK_b19600e51c7b2e1d4165d46d03a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "role_template_permissions" DROP CONSTRAINT "FK_7a4c3b54aad22ecb9790c4a9727"`,
    );
    await queryRunner.query(
      `ALTER TABLE "role_templates" DROP CONSTRAINT "FK_d5ed76d22b3c3955a338191cc7a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization_documents" DROP CONSTRAINT "FK_3a028be3e263bf8bf5dc2e46759"`,
    );
    await queryRunner.query(
      `ALTER TABLE "invitations" DROP CONSTRAINT "FK_0c292d64b056e6ae82ebf07434d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "role_template_permissions" DROP CONSTRAINT "UQ_5e71544d57d83b7a4ccf993a80c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "role_templates" DROP CONSTRAINT "UQ_21f493207f532f7acecc09db8c2"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_7a4c3b54aad22ecb9790c4a972"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_b19600e51c7b2e1d4165d46d03"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_d5ed76d22b3c3955a338191cc7"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_2be5b2c2cf18eb4cf2ca3d8401"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_3a028be3e263bf8bf5dc2e4675"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_ed46eb2faeb4e011fabe61459c"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_53b492b28f1cc0664edb6bfddb"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_fc07ace491143726974991711f"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_427785468fb7d2733f59e7d7d3"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_3c324ca49dabde7ffc0ef64675"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_32b41cdb985a296213e9a928b5"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_094fd3232fe017b7d6ec81c4b5"`);
    await queryRunner.query(`DROP TABLE "payments"`);
    await queryRunner.query(`DROP TYPE "public"."payments_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."payments_payment_type_enum"`);
    await queryRunner.query(`DROP TYPE "public"."payments_gateway_enum"`);
    await queryRunner.query(
      `ALTER TABLE "role_template_permissions" ADD CONSTRAINT "UQ_role_template_permissions" UNIQUE ("role_template_id", "permission_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "role_templates" ADD CONSTRAINT "UQ_role_templates_package_slug" UNIQUE ("package_id", "slug")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_role_template_permissions_permission" ON "role_template_permissions" ("permission_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_role_template_permissions_template" ON "role_template_permissions" ("role_template_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_role_templates_is_active" ON "role_templates" ("is_active") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_role_templates_package_id" ON "role_templates" ("package_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_organization_documents_is_active" ON "organization_documents" ("is_active") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_organization_documents_type" ON "organization_documents" ("document_type") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_organization_documents_org_id" ON "organization_documents" ("organization_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "role_template_permissions" ADD CONSTRAINT "FK_role_template_permissions_template" FOREIGN KEY ("role_template_id") REFERENCES "role_templates"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "role_template_permissions" ADD CONSTRAINT "FK_role_template_permissions_permission" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "role_templates" ADD CONSTRAINT "FK_role_templates_package" FOREIGN KEY ("package_id") REFERENCES "packages"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization_documents" ADD CONSTRAINT "FK_organization_documents_organization" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "invitations" ADD CONSTRAINT "FK_0c292d64b056e6ae82ebf07434d" FOREIGN KEY ("cancelled_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }
}
