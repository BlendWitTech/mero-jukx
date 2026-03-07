import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRoleTemplatesAndDocuments1763103799253 implements MigrationInterface {
  name = 'AddRoleTemplatesAndDocuments1763103799253';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add new columns to organizations table
    await queryRunner.query(`
      ALTER TABLE "organizations" 
      ADD COLUMN IF NOT EXISTS "tax_id" character varying(100),
      ADD COLUMN IF NOT EXISTS "registration_number" character varying(100),
      ADD COLUMN IF NOT EXISTS "industry" character varying(100)
    `);

    // Create role_templates table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "role_templates" (
        "id" SERIAL NOT NULL,
        "package_id" integer NOT NULL,
        "name" character varying(100) NOT NULL,
        "slug" character varying(100) NOT NULL,
        "description" text,
        "is_active" boolean NOT NULL DEFAULT true,
        "sort_order" integer NOT NULL DEFAULT '0',
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_role_templates_package_slug" UNIQUE ("package_id", "slug"),
        CONSTRAINT "PK_role_templates" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_role_templates_package_id" ON "role_templates" ("package_id")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_role_templates_is_active" ON "role_templates" ("is_active")
    `);

    // Create role_template_permissions table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "role_template_permissions" (
        "id" SERIAL NOT NULL,
        "role_template_id" integer NOT NULL,
        "permission_id" integer NOT NULL,
        CONSTRAINT "UQ_role_template_permissions" UNIQUE ("role_template_id", "permission_id"),
        CONSTRAINT "PK_role_template_permissions" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_role_template_permissions_template" ON "role_template_permissions" ("role_template_id")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_role_template_permissions_permission" ON "role_template_permissions" ("permission_id")
    `);

    // Create organization_documents table
    // Check if enum type exists, if not create it
    const enumExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'organization_documents_document_type_enum'
      )
    `);

    if (!enumExists[0].exists) {
      await queryRunner.query(`
        CREATE TYPE "public"."organization_documents_document_type_enum" AS ENUM('contract', 'license', 'certificate', 'invoice', 'other')
      `);
    }

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "organization_documents" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "organization_id" uuid NOT NULL,
        "file_name" character varying(255) NOT NULL,
        "file_path" character varying(500) NOT NULL,
        "file_type" character varying(100),
        "file_size" bigint NOT NULL DEFAULT '0',
        "document_type" "public"."organization_documents_document_type_enum" NOT NULL DEFAULT 'other',
        "title" character varying(255),
        "description" text,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP,
        CONSTRAINT "PK_organization_documents" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_organization_documents_org_id" ON "organization_documents" ("organization_id")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_organization_documents_type" ON "organization_documents" ("document_type")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_organization_documents_is_active" ON "organization_documents" ("is_active")
    `);

    // Add foreign key constraints
    await queryRunner.query(`
      ALTER TABLE "role_templates" 
      ADD CONSTRAINT "FK_role_templates_package" 
      FOREIGN KEY ("package_id") REFERENCES "packages"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "role_template_permissions" 
      ADD CONSTRAINT "FK_role_template_permissions_template" 
      FOREIGN KEY ("role_template_id") REFERENCES "role_templates"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "role_template_permissions" 
      ADD CONSTRAINT "FK_role_template_permissions_permission" 
      FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "organization_documents" 
      ADD CONSTRAINT "FK_organization_documents_organization" 
      FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign key constraints
    await queryRunner.query(`
      ALTER TABLE "organization_documents" 
      DROP CONSTRAINT IF EXISTS "FK_organization_documents_organization"
    `);

    await queryRunner.query(`
      ALTER TABLE "role_template_permissions" 
      DROP CONSTRAINT IF EXISTS "FK_role_template_permissions_permission"
    `);

    await queryRunner.query(`
      ALTER TABLE "role_template_permissions" 
      DROP CONSTRAINT IF EXISTS "FK_role_template_permissions_template"
    `);

    await queryRunner.query(`
      ALTER TABLE "role_templates" 
      DROP CONSTRAINT IF EXISTS "FK_role_templates_package"
    `);

    // Drop tables
    await queryRunner.query(`DROP TABLE IF EXISTS "organization_documents"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "role_template_permissions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "role_templates"`);

    // Drop enum type if it exists
    const enumExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'organization_documents_document_type_enum'
      )
    `);

    if (enumExists[0].exists) {
      await queryRunner.query(`DROP TYPE "public"."organization_documents_document_type_enum"`);
    }

    // Remove columns from organizations table
    await queryRunner.query(`
      ALTER TABLE "organizations" 
      DROP COLUMN IF EXISTS "tax_id",
      DROP COLUMN IF EXISTS "registration_number",
      DROP COLUMN IF EXISTS "industry"
    `);
  }
}
