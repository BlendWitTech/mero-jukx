import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddExciseDutyAndNotes1856000000001 implements MigrationInterface {
    name = 'AddExciseDutyAndNotes1856000000001';

    async up(queryRunner: QueryRunner): Promise<void> {
        // Excise duty rates table
        try {
            const hasExcise = await queryRunner.hasTable('excise_duty_rates');
            if (!hasExcise) {
                await queryRunner.query(`
                    CREATE TABLE "excise_duty_rates" (
                        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                        "organization_id" uuid NOT NULL,
                        "category" character varying(100) NOT NULL,
                        "description" character varying(255),
                        "rate" numeric(10,4) NOT NULL,
                        "effective_date" date,
                        "status" character varying(20) NOT NULL DEFAULT 'ACTIVE',
                        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                        CONSTRAINT "PK_excise_duty_rates" PRIMARY KEY ("id")
                    )
                `);
                await queryRunner.query(`
                    CREATE INDEX "IDX_excise_duty_rates_org" ON "excise_duty_rates" ("organization_id")
                `);
                await queryRunner.query(`
                    ALTER TABLE "excise_duty_rates"
                    ADD CONSTRAINT "FK_excise_duty_rates_org"
                    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE
                `);
            }
        } catch (e) {
            console.warn('AddExciseDutyAndNotes: excise_duty_rates table warning:', e.message);
        }

        // Financial notes table
        try {
            const hasNotes = await queryRunner.hasTable('financial_notes');
            if (!hasNotes) {
                await queryRunner.query(`
                    CREATE TABLE "financial_notes" (
                        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                        "organization_id" uuid NOT NULL,
                        "fiscal_year" character varying(20) NOT NULL,
                        "section" character varying(20) NOT NULL DEFAULT 'OTHER',
                        "note_number" integer NOT NULL DEFAULT 1,
                        "title" character varying(255) NOT NULL,
                        "content" text,
                        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                        CONSTRAINT "PK_financial_notes" PRIMARY KEY ("id")
                    )
                `);
                await queryRunner.query(`
                    CREATE INDEX "IDX_financial_notes_org_year" ON "financial_notes" ("organization_id", "fiscal_year")
                `);
                await queryRunner.query(`
                    ALTER TABLE "financial_notes"
                    ADD CONSTRAINT "FK_financial_notes_org"
                    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE
                `);
            }
        } catch (e) {
            console.warn('AddExciseDutyAndNotes: financial_notes table warning:', e.message);
        }

        // Add inter-company columns to journal_entries
        try {
            const hasIntercompany = await queryRunner.query(`
                SELECT column_name FROM information_schema.columns
                WHERE table_name = 'journal_entries' AND column_name = 'is_intercompany'
            `);
            if (!hasIntercompany || hasIntercompany.length === 0) {
                await queryRunner.query(`
                    ALTER TABLE "journal_entries"
                    ADD COLUMN IF NOT EXISTS "is_intercompany" boolean NOT NULL DEFAULT false,
                    ADD COLUMN IF NOT EXISTS "intercompany_org_id" uuid
                `);
            }
        } catch (e) {
            console.warn('AddExciseDutyAndNotes: journal_entries alter warning:', e.message);
        }
    }

    async down(queryRunner: QueryRunner): Promise<void> {
        try {
            await queryRunner.query(`DROP TABLE IF EXISTS "financial_notes"`);
            await queryRunner.query(`DROP TABLE IF EXISTS "excise_duty_rates"`);
            await queryRunner.query(`
                ALTER TABLE "journal_entries"
                DROP COLUMN IF EXISTS "is_intercompany",
                DROP COLUMN IF EXISTS "intercompany_org_id"
            `);
        } catch (e) {
            console.warn('AddExciseDutyAndNotes down warning:', e.message);
        }
    }
}
