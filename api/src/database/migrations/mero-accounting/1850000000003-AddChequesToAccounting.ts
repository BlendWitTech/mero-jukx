import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddChequesToAccounting1850000000003 implements MigrationInterface {
    name = 'AddChequesToAccounting1850000000003';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Enums
        await queryRunner.query(`CREATE TYPE "public"."cheques_type_enum" AS ENUM('ISSUED', 'RECEIVED')`);
        await queryRunner.query(`CREATE TYPE "public"."cheques_status_enum" AS ENUM('DRAFT', 'PRINTED', 'CLEARED', 'BOUNCED', 'CANCELLED')`);

        // Table
        await queryRunner.query(`
            CREATE TABLE "cheques" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "organization_id" uuid NOT NULL,
                "bank_account_id" uuid,
                "cheque_number" character varying(100) NOT NULL,
                "payee_name" character varying(255) NOT NULL,
                "amount" numeric(15,2) NOT NULL,
                "cheque_date" date NOT NULL,
                "issue_date" date NOT NULL,
                "type" "public"."cheques_type_enum" NOT NULL,
                "status" "public"."cheques_status_enum" NOT NULL DEFAULT 'DRAFT',
                "journal_entry_id" uuid,
                "remarks" text,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_cq" PRIMARY KEY ("id")
            )
        `);

        // FKs
        await queryRunner.query(`ALTER TABLE "cheques" ADD CONSTRAINT "FK_cq_org" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "cheques" ADD CONSTRAINT "FK_cq_bank" FOREIGN KEY ("bank_account_id") REFERENCES "bank_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "cheques" ADD CONSTRAINT "FK_cq_je" FOREIGN KEY ("journal_entry_id") REFERENCES "journal_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE`);

        // Indexes
        await queryRunner.query(`CREATE INDEX "IDX_cq_org_bank" ON "cheques" ("organization_id", "bank_account_id")`);
        await queryRunner.query(`CREATE INDEX "IDX_cq_org_status" ON "cheques" ("organization_id", "status")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // FKs
        await queryRunner.query(`ALTER TABLE "cheques" DROP CONSTRAINT "FK_cq_je"`);
        await queryRunner.query(`ALTER TABLE "cheques" DROP CONSTRAINT "FK_cq_bank"`);
        await queryRunner.query(`ALTER TABLE "cheques" DROP CONSTRAINT "FK_cq_org"`);

        // Indexes
        await queryRunner.query(`DROP INDEX "public"."IDX_cq_org_status"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_cq_org_bank"`);

        // Table
        await queryRunner.query(`DROP TABLE "cheques"`);

        // Enums
        await queryRunner.query(`DROP TYPE "public"."cheques_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."cheques_type_enum"`);
    }
}
