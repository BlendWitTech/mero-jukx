import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddKhataBankReconciliation1851000000000 implements MigrationInterface {
    name = 'AddKhataBankReconciliation1851000000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        const tableExists = await queryRunner.hasTable('khata_transactions');
        if (!tableExists) return;

        const colExists = await queryRunner.hasColumn('khata_transactions', 'is_reconciled');
        if (!colExists) {
            await queryRunner.query(`
                ALTER TABLE "khata_transactions"
                ADD COLUMN "is_reconciled" boolean NOT NULL DEFAULT false
            `);
        }

        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "khata_bank_entries" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "organization_id" uuid NOT NULL,
                "entry_date" date NOT NULL,
                "description" text,
                "amount" numeric(12,2) NOT NULL,
                "type" varchar(10) NOT NULL DEFAULT 'CREDIT',
                "reference" varchar(100),
                "matched_transaction_id" uuid,
                "is_matched" boolean NOT NULL DEFAULT false,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_khata_bank_entries" PRIMARY KEY ("id"),
                CONSTRAINT "CHK_khata_bank_entries_type" CHECK ("type" IN ('CREDIT','DEBIT'))
            )
        `);

        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_khata_bank_entries_org"
            ON "khata_bank_entries" ("organization_id")
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE IF EXISTS "khata_bank_entries"`);

        const colExists = await queryRunner.hasColumn('khata_transactions', 'is_reconciled');
        if (colExists) {
            await queryRunner.query(`
                ALTER TABLE "khata_transactions" DROP COLUMN "is_reconciled"
            `);
        }
    }
}
