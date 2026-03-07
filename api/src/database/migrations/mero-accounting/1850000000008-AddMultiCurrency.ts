import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMultiCurrency1850000000008 implements MigrationInterface {
    name = 'AddMultiCurrency1850000000008';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // ExchangeRates Table
        await queryRunner.query(`
            CREATE TABLE "exchange_rates" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "organization_id" uuid,
                "base_currency" character varying(10) NOT NULL DEFAULT 'NPR',
                "target_currency" character varying(10) NOT NULL,
                "rate" numeric(15,6) NOT NULL,
                "effective_date" date NOT NULL,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_exchange_rates" PRIMARY KEY ("id")
            )
        `);

        // FK for ExchangeRates
        await queryRunner.query(`ALTER TABLE "exchange_rates" ADD CONSTRAINT "FK_er_org" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE`);

        // Multi-Currency columns on JournalEntryLine
        await queryRunner.query(`ALTER TABLE "journal_entry_lines" ADD "currency" character varying(10) NOT NULL DEFAULT 'NPR'`);
        await queryRunner.query(`ALTER TABLE "journal_entry_lines" ADD "exchange_rate" numeric(15,6) NOT NULL DEFAULT 1.000000`);
        await queryRunner.query(`ALTER TABLE "journal_entry_lines" ADD "foreign_debit" numeric(15,2)`);
        await queryRunner.query(`ALTER TABLE "journal_entry_lines" ADD "foreign_credit" numeric(15,2)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop columns from JournalEntryLine
        await queryRunner.query(`ALTER TABLE "journal_entry_lines" DROP COLUMN "foreign_credit"`);
        await queryRunner.query(`ALTER TABLE "journal_entry_lines" DROP COLUMN "foreign_debit"`);
        await queryRunner.query(`ALTER TABLE "journal_entry_lines" DROP COLUMN "exchange_rate"`);
        await queryRunner.query(`ALTER TABLE "journal_entry_lines" DROP COLUMN "currency"`);

        // Drop FK from ExchangeRates
        await queryRunner.query(`ALTER TABLE "exchange_rates" DROP CONSTRAINT "FK_er_org"`);

        // Drop ExchangeRates Table
        await queryRunner.query(`DROP TABLE "exchange_rates"`);
    }
}
