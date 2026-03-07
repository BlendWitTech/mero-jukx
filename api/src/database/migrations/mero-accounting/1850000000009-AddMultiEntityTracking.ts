import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMultiEntityTracking1850000000009 implements MigrationInterface {
    name = 'AddMultiEntityTracking1850000000009';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Multi-Entity linked ID on JournalEntry
        await queryRunner.query(`ALTER TABLE "journal_entries" ADD "inter_company_linked_entry_id" uuid`);

        // This is a self-referencing logical link, but across organizations. We won't strictly enforce an FK to avoid cross-tenant constraint nightmares during deletion, but we add an index for quick lookup.
        await queryRunner.query(`CREATE INDEX "IDX_je_inter_company" ON "journal_entries" ("inter_company_linked_entry_id")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "IDX_je_inter_company"`);
        await queryRunner.query(`ALTER TABLE "journal_entries" DROP COLUMN "inter_company_linked_entry_id"`);
    }
}
