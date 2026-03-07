import { MigrationInterface, QueryRunner } from 'typeorm';

export class EnhanceDocuments1776000000000 implements MigrationInterface {
  name = 'EnhanceDocuments1776000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add new document types
    await queryRunner.query(
      `ALTER TYPE "public"."organization_documents_document_type_enum" ADD VALUE IF NOT EXISTS 'office_registration'`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."organization_documents_document_type_enum" ADD VALUE IF NOT EXISTS 'letterhead'`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."organization_documents_document_type_enum" ADD VALUE IF NOT EXISTS 'invoice_template'`,
    );

    // Add new columns for document enhancements
    await queryRunner.query(
      `ALTER TABLE "organization_documents" ADD COLUMN "file_url" varchar(500) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization_documents" ADD COLUMN "thumbnail_url" varchar(500) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization_documents" ADD COLUMN "is_scanned" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization_documents" ADD COLUMN "scan_metadata" jsonb NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization_documents" ADD COLUMN "has_signature" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization_documents" ADD COLUMN "signature_url" varchar(500) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization_documents" ADD COLUMN "has_logo" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization_documents" ADD COLUMN "logo_url" varchar(500) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization_documents" ADD COLUMN "letterhead_design_id" varchar(100) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization_documents" ADD COLUMN "invoice_design_id" varchar(100) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization_documents" ADD COLUMN "design_metadata" jsonb NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization_documents" ADD COLUMN "created_by" uuid NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization_documents" ADD COLUMN "is_template" boolean NOT NULL DEFAULT false`,
    );

    // Add foreign key for created_by
    await queryRunner.query(
      `ALTER TABLE "organization_documents" ADD CONSTRAINT "FK_organization_documents_created_by" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );

    // Add indexes
    await queryRunner.query(
      `CREATE INDEX "IDX_organization_documents_created_by" ON "organization_documents" ("created_by")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_organization_documents_is_template" ON "organization_documents" ("is_template")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_organization_documents_letterhead_design" ON "organization_documents" ("letterhead_design_id") WHERE "letterhead_design_id" IS NOT NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_organization_documents_invoice_design" ON "organization_documents" ("invoice_design_id") WHERE "invoice_design_id" IS NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_organization_documents_invoice_design"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_organization_documents_letterhead_design"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_organization_documents_is_template"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_organization_documents_created_by"`,
    );

    // Drop foreign key
    await queryRunner.query(
      `ALTER TABLE "organization_documents" DROP CONSTRAINT IF EXISTS "FK_organization_documents_created_by"`,
    );

    // Drop columns
    await queryRunner.query(
      `ALTER TABLE "organization_documents" DROP COLUMN IF EXISTS "is_template"`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization_documents" DROP COLUMN IF EXISTS "created_by"`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization_documents" DROP COLUMN IF EXISTS "design_metadata"`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization_documents" DROP COLUMN IF EXISTS "invoice_design_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization_documents" DROP COLUMN IF EXISTS "letterhead_design_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization_documents" DROP COLUMN IF EXISTS "logo_url"`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization_documents" DROP COLUMN IF EXISTS "has_logo"`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization_documents" DROP COLUMN IF EXISTS "signature_url"`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization_documents" DROP COLUMN IF EXISTS "has_signature"`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization_documents" DROP COLUMN IF EXISTS "scan_metadata"`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization_documents" DROP COLUMN IF EXISTS "is_scanned"`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization_documents" DROP COLUMN IF EXISTS "thumbnail_url"`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization_documents" DROP COLUMN IF EXISTS "file_url"`,
    );

    // Note: We cannot easily remove enum values, so we'll leave them
  }
}

