import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Syncs the CRM schema to match all entity definitions.
 * Adds missing tables: crm_contacts, crm_pipelines, crm_stages, crm_deal_items, crm_deal_team_members
 * Adds missing columns to crm_leads and crm_deals.
 * All operations are idempotent.
 */
export class SyncCrmSchema2000000000006 implements MigrationInterface {
  name = 'SyncCrmSchema2000000000006';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ─── CRM_LEADS: add missing columns ───────────────────────────────────────
    const addLeadCol = async (col: string, def: string) => {
      const has = await queryRunner.hasColumn('crm_leads', col);
      if (!has) await queryRunner.query(`ALTER TABLE "crm_leads" ADD COLUMN ${def}`);
    };

    await addLeadCol('first_name', `"first_name" varchar(255) NULL`);
    await addLeadCol('last_name', `"last_name" varchar(255) NULL`);
    await addLeadCol('city', `"city" varchar(100) NULL`);
    await addLeadCol('country', `"country" varchar(100) NULL`);
    await addLeadCol('territory', `"territory" varchar(100) NULL`);
    await addLeadCol('score', `"score" integer NOT NULL DEFAULT 0`);
    await addLeadCol('tags', `"tags" jsonb NULL`);
    await addLeadCol('win_loss_reason', `"win_loss_reason" text NULL`);
    await addLeadCol('estimated_value', `"estimated_value" decimal(15,2) NULL`);
    await addLeadCol('custom_fields', `"custom_fields" jsonb NULL`);
    await addLeadCol('job_title', `"job_title" varchar(100) NULL`);

    // Migrate existing 'name' -> 'first_name' if needed
    const leadsHasName = await queryRunner.hasColumn('crm_leads', 'name');
    const leadsHasFirstName = await queryRunner.hasColumn('crm_leads', 'first_name');
    if (leadsHasName && leadsHasFirstName) {
      await queryRunner.query(`UPDATE "crm_leads" SET "first_name" = "name" WHERE "first_name" IS NULL AND "name" IS NOT NULL`);
    }

    // Update status enum to add PROPOSAL, NEGOTIATION, WON values if missing
    await queryRunner.query(`
      DO $$ BEGIN
        IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'crm_leads_status_enum') THEN
          ALTER TYPE "crm_leads_status_enum" ADD VALUE IF NOT EXISTS 'PROPOSAL';
          ALTER TYPE "crm_leads_status_enum" ADD VALUE IF NOT EXISTS 'NEGOTIATION';
          ALTER TYPE "crm_leads_status_enum" ADD VALUE IF NOT EXISTS 'WON';
        END IF;
      END $$
    `);

    // ─── CRM_DEALS: add missing columns ───────────────────────────────────────
    const addDealCol = async (col: string, def: string) => {
      const has = await queryRunner.hasColumn('crm_deals', col);
      if (!has) await queryRunner.query(`ALTER TABLE "crm_deals" ADD COLUMN ${def}`);
    };

    await addDealCol('pipeline_id', `"pipeline_id" uuid NULL`);
    await addDealCol('stage_id', `"stage_id" uuid NULL`);
    await addDealCol('stage_name', `"stage_name" varchar(50) NOT NULL DEFAULT 'NEW'`);
    await addDealCol('currency', `"currency" varchar(10) NOT NULL DEFAULT 'NPR'`);
    await addDealCol('win_loss_reason', `"win_loss_reason" text NULL`);
    await addDealCol('competitors', `"competitors" jsonb NULL`);
    await addDealCol('status', `"status" varchar(10) NOT NULL DEFAULT 'OPEN'`);

    // ─── CRM_PIPELINES table ───────────────────────────────────────────────────
    const hasPipelines = await queryRunner.hasTable('crm_pipelines');
    if (!hasPipelines) {
      await queryRunner.query(`
        CREATE TABLE "crm_pipelines" (
          "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
          "name" varchar(255) NOT NULL,
          "is_default" boolean NOT NULL DEFAULT false,
          "organization_id" uuid NOT NULL,
          "created_at" TIMESTAMP NOT NULL DEFAULT now(),
          "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
          CONSTRAINT "PK_crm_pipelines" PRIMARY KEY ("id"),
          CONSTRAINT "FK_crm_pipelines_org" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE
        )
      `);
      await queryRunner.query(`CREATE INDEX "IDX_crm_pipelines_org" ON "crm_pipelines" ("organization_id")`);
    }

    // ─── CRM_STAGES table ─────────────────────────────────────────────────────
    const hasStages = await queryRunner.hasTable('crm_stages');
    if (!hasStages) {
      await queryRunner.query(`
        CREATE TABLE "crm_stages" (
          "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
          "name" varchar(255) NOT NULL,
          "order" integer NOT NULL DEFAULT 0,
          "probability" integer NOT NULL DEFAULT 0,
          "pipeline_id" uuid NOT NULL,
          "organization_id" uuid NOT NULL,
          "created_at" TIMESTAMP NOT NULL DEFAULT now(),
          "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
          CONSTRAINT "PK_crm_stages" PRIMARY KEY ("id"),
          CONSTRAINT "FK_crm_stages_pipeline" FOREIGN KEY ("pipeline_id") REFERENCES "crm_pipelines"("id") ON DELETE CASCADE,
          CONSTRAINT "FK_crm_stages_org" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE
        )
      `);
      await queryRunner.query(`CREATE INDEX "IDX_crm_stages_pipeline" ON "crm_stages" ("pipeline_id")`);
    }

    // Add FK from crm_deals to crm_pipelines and crm_stages
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_crm_deals_pipeline') THEN
          ALTER TABLE "crm_deals" ADD CONSTRAINT "FK_crm_deals_pipeline"
            FOREIGN KEY ("pipeline_id") REFERENCES "crm_pipelines"("id") ON DELETE SET NULL;
        END IF;
      END $$
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_crm_deals_stage') THEN
          ALTER TABLE "crm_deals" ADD CONSTRAINT "FK_crm_deals_stage"
            FOREIGN KEY ("stage_id") REFERENCES "crm_stages"("id") ON DELETE SET NULL;
        END IF;
      END $$
    `);

    // ─── CRM_CONTACTS table ───────────────────────────────────────────────────
    const hasContacts = await queryRunner.hasTable('crm_contacts');
    if (!hasContacts) {
      await queryRunner.query(`
        CREATE TABLE "crm_contacts" (
          "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
          "first_name" varchar(255) NOT NULL,
          "last_name" varchar(255) NULL,
          "email" varchar(255) NULL,
          "phone" varchar(50) NULL,
          "job_title" varchar(100) NULL,
          "is_primary" boolean NOT NULL DEFAULT false,
          "client_id" uuid NOT NULL,
          "organization_id" uuid NOT NULL,
          "created_at" TIMESTAMP NOT NULL DEFAULT now(),
          "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
          CONSTRAINT "PK_crm_contacts" PRIMARY KEY ("id"),
          CONSTRAINT "FK_crm_contacts_client" FOREIGN KEY ("client_id") REFERENCES "crm_clients"("id") ON DELETE CASCADE,
          CONSTRAINT "FK_crm_contacts_org" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE
        )
      `);
      await queryRunner.query(`CREATE INDEX "IDX_crm_contacts_client" ON "crm_contacts" ("client_id")`);
      await queryRunner.query(`CREATE INDEX "IDX_crm_contacts_org" ON "crm_contacts" ("organization_id")`);
    }

    // ─── CRM_DEAL_ITEMS table ─────────────────────────────────────────────────
    const hasDealItems = await queryRunner.hasTable('crm_deal_items');
    if (!hasDealItems) {
      await queryRunner.query(`
        CREATE TABLE "crm_deal_items" (
          "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
          "deal_id" uuid NOT NULL,
          "organization_id" uuid NOT NULL,
          "product_id" uuid NULL,
          "name" varchar(255) NOT NULL,
          "price" decimal(12,2) NOT NULL DEFAULT 0,
          "quantity" decimal(12,2) NOT NULL DEFAULT 1,
          "amount" decimal(12,2) NOT NULL DEFAULT 0,
          CONSTRAINT "PK_crm_deal_items" PRIMARY KEY ("id"),
          CONSTRAINT "FK_crm_deal_items_deal" FOREIGN KEY ("deal_id") REFERENCES "crm_deals"("id") ON DELETE CASCADE,
          CONSTRAINT "FK_crm_deal_items_org" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE
        )
      `);
      await queryRunner.query(`CREATE INDEX "IDX_crm_deal_items_deal" ON "crm_deal_items" ("deal_id")`);
    }

    // ─── CRM_DEAL_TEAM_MEMBERS join table ─────────────────────────────────────
    const hasDealTeam = await queryRunner.hasTable('crm_deal_team_members');
    if (!hasDealTeam) {
      await queryRunner.query(`
        CREATE TABLE "crm_deal_team_members" (
          "deal_id" uuid NOT NULL,
          "user_id" uuid NOT NULL,
          CONSTRAINT "PK_crm_deal_team_members" PRIMARY KEY ("deal_id", "user_id"),
          CONSTRAINT "FK_crm_deal_team_deal" FOREIGN KEY ("deal_id") REFERENCES "crm_deals"("id") ON DELETE CASCADE,
          CONSTRAINT "FK_crm_deal_team_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
        )
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "crm_deal_team_members"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "crm_deal_items"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "crm_contacts"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "crm_stages"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "crm_pipelines"`);
  }
}
