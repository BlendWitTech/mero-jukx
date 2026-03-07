import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBankStatementsToAccounting1850000000002 implements MigrationInterface {
    name = 'AddBankStatementsToAccounting1850000000002';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Enums
        await queryRunner.query(`CREATE TYPE "public"."bank_statements_status_enum" AS ENUM('IMPORTED', 'RECONCILING', 'RECONCILED')`);
        await queryRunner.query(`CREATE TYPE "public"."bank_statement_lines_status_enum" AS ENUM('UNMATCHED', 'MATCHED', 'IGNORED')`);

        // Bank Statement Table
        await queryRunner.query(`
            CREATE TABLE "bank_statements" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "organization_id" uuid NOT NULL,
                "bank_account_id" uuid NOT NULL,
                "statement_date" date NOT NULL,
                "opening_balance" numeric(15,2) NOT NULL DEFAULT '0',
                "closing_balance" numeric(15,2) NOT NULL DEFAULT '0',
                "status" "public"."bank_statements_status_enum" NOT NULL DEFAULT 'IMPORTED',
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_bs" PRIMARY KEY ("id")
            )
        `);

        // Bank Statement Lines Table
        await queryRunner.query(`
            CREATE TABLE "bank_statement_lines" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "bank_statement_id" uuid NOT NULL,
                "transaction_date" date NOT NULL,
                "description" text NOT NULL,
                "reference_number" character varying(255),
                "withdrawal" numeric(15,2) NOT NULL DEFAULT '0',
                "deposit" numeric(15,2) NOT NULL DEFAULT '0',
                "balance" numeric(15,2) NOT NULL DEFAULT '0',
                "status" "public"."bank_statement_lines_status_enum" NOT NULL DEFAULT 'UNMATCHED',
                "journal_entry_id" uuid,
                "journal_entry_line_id" uuid,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_bsl" PRIMARY KEY ("id")
            )
        `);

        // FKs
        await queryRunner.query(`ALTER TABLE "bank_statements" ADD CONSTRAINT "FK_bs_org" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "bank_statements" ADD CONSTRAINT "FK_bs_acc" FOREIGN KEY ("bank_account_id") REFERENCES "bank_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE`);

        await queryRunner.query(`ALTER TABLE "bank_statement_lines" ADD CONSTRAINT "FK_bsl_stmt" FOREIGN KEY ("bank_statement_id") REFERENCES "bank_statements"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "bank_statement_lines" ADD CONSTRAINT "FK_bsl_je" FOREIGN KEY ("journal_entry_id") REFERENCES "journal_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "bank_statement_lines" ADD CONSTRAINT "FK_bsl_jel" FOREIGN KEY ("journal_entry_line_id") REFERENCES "journal_entry_lines"("id") ON DELETE SET NULL ON UPDATE CASCADE`);

        // Indexes
        await queryRunner.query(`CREATE INDEX "IDX_bs_org_acc" ON "bank_statements" ("organization_id", "bank_account_id")`);
        await queryRunner.query(`CREATE INDEX "IDX_bsl_stmt" ON "bank_statement_lines" ("bank_statement_id")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop FKs
        await queryRunner.query(`ALTER TABLE "bank_statement_lines" DROP CONSTRAINT "FK_bsl_jel"`);
        await queryRunner.query(`ALTER TABLE "bank_statement_lines" DROP CONSTRAINT "FK_bsl_je"`);
        await queryRunner.query(`ALTER TABLE "bank_statement_lines" DROP CONSTRAINT "FK_bsl_stmt"`);

        await queryRunner.query(`ALTER TABLE "bank_statements" DROP CONSTRAINT "FK_bs_acc"`);
        await queryRunner.query(`ALTER TABLE "bank_statements" DROP CONSTRAINT "FK_bs_org"`);

        // Drop Indexes
        await queryRunner.query(`DROP INDEX "public"."IDX_bsl_stmt"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_bs_org_acc"`);

        // Drop Tables
        await queryRunner.query(`DROP TABLE "bank_statement_lines"`);
        await queryRunner.query(`DROP TABLE "bank_statements"`);

        // Drop Enums
        await queryRunner.query(`DROP TYPE "public"."bank_statement_lines_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."bank_statements_status_enum"`);
    }
}
