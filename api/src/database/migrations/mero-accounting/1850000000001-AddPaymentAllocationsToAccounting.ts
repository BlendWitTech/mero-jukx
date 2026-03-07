import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPaymentAllocationsToAccounting1850000000001 implements MigrationInterface {
    name = 'AddPaymentAllocationsToAccounting1850000000001';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create Enum types
        await queryRunner.query(`CREATE TYPE "public"."payment_allocations_invoice_type_enum" AS ENUM('SALES', 'PURCHASE')`);

        // Create table
        await queryRunner.query(`
            CREATE TABLE "payment_allocations" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "organization_id" uuid NOT NULL,
                "journal_entry_id" uuid NOT NULL,
                "invoice_type" "public"."payment_allocations_invoice_type_enum" NOT NULL,
                "invoice_id" uuid NOT NULL,
                "amount" numeric(15,2) NOT NULL,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_pa" PRIMARY KEY ("id")
            )
        `);

        // foreign keys
        await queryRunner.query(`ALTER TABLE "payment_allocations" ADD CONSTRAINT "FK_pa_org_id" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "payment_allocations" ADD CONSTRAINT "FK_pa_je_id" FOREIGN KEY ("journal_entry_id") REFERENCES "journal_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE`);

        // Indexes
        await queryRunner.query(`CREATE INDEX "IDX_pa_org_je" ON "payment_allocations" ("organization_id", "journal_entry_id")`);
        await queryRunner.query(`CREATE INDEX "IDX_pa_org_inv" ON "payment_allocations" ("organization_id", "invoice_id")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "payment_allocations" DROP CONSTRAINT "FK_pa_je_id"`);
        await queryRunner.query(`ALTER TABLE "payment_allocations" DROP CONSTRAINT "FK_pa_org_id"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_pa_org_inv"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_pa_org_je"`);
        await queryRunner.query(`DROP TABLE "payment_allocations"`);
        await queryRunner.query(`DROP TYPE "public"."payment_allocations_invoice_type_enum"`);
    }
}
