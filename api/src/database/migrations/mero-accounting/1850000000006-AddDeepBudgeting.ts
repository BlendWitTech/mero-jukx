import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDeepBudgeting1850000000006 implements MigrationInterface {
    name = 'AddDeepBudgeting1850000000006';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Dimensions on JournalEntryLine
        await queryRunner.query(`ALTER TABLE "journal_entry_lines" ADD "department_id" uuid`);
        await queryRunner.query(`ALTER TABLE "journal_entry_lines" ADD "project_id" uuid`);

        await queryRunner.query(`ALTER TABLE "journal_entry_lines" ADD CONSTRAINT "FK_jel_dept" FOREIGN KEY ("department_id") REFERENCES "hr_departments"("id") ON DELETE SET NULL ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "journal_entry_lines" ADD CONSTRAINT "FK_jel_proj" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE`);

        // BudgetType Enum
        await queryRunner.query(`CREATE TYPE "public"."budgets_type_enum" AS ENUM('GLOBAL', 'DEPARTMENT', 'PROJECT')`);

        // Budgets Table
        await queryRunner.query(`
            CREATE TABLE "budgets" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "organization_id" uuid NOT NULL,
                "fiscal_year_id" uuid NOT NULL,
                "name" character varying(255) NOT NULL,
                "type" "public"."budgets_type_enum" NOT NULL DEFAULT 'GLOBAL',
                "department_id" uuid,
                "project_id" uuid,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_budgets" PRIMARY KEY ("id")
            )
        `);

        // BudgetLines Table
        await queryRunner.query(`
            CREATE TABLE "budget_lines" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "budget_id" uuid NOT NULL,
                "account_id" uuid NOT NULL,
                "allocated_amount" numeric(15,2) NOT NULL,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_budget_lines" PRIMARY KEY ("id")
            )
        `);

        // FKs for Budgets
        await queryRunner.query(`ALTER TABLE "budgets" ADD CONSTRAINT "FK_bud_org" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "budgets" ADD CONSTRAINT "FK_bud_fy" FOREIGN KEY ("fiscal_year_id") REFERENCES "fiscal_years"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "budgets" ADD CONSTRAINT "FK_bud_dept" FOREIGN KEY ("department_id") REFERENCES "hr_departments"("id") ON DELETE SET NULL ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "budgets" ADD CONSTRAINT "FK_bud_proj" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE`);

        // FKs for BudgetLines
        await queryRunner.query(`ALTER TABLE "budget_lines" ADD CONSTRAINT "FK_budl_bud" FOREIGN KEY ("budget_id") REFERENCES "budgets"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "budget_lines" ADD CONSTRAINT "FK_budl_acc" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop FKs from BudgetLines
        await queryRunner.query(`ALTER TABLE "budget_lines" DROP CONSTRAINT "FK_budl_acc"`);
        await queryRunner.query(`ALTER TABLE "budget_lines" DROP CONSTRAINT "FK_budl_bud"`);

        // Drop FKs from Budgets
        await queryRunner.query(`ALTER TABLE "budgets" DROP CONSTRAINT "FK_bud_proj"`);
        await queryRunner.query(`ALTER TABLE "budgets" DROP CONSTRAINT "FK_bud_dept"`);
        await queryRunner.query(`ALTER TABLE "budgets" DROP CONSTRAINT "FK_bud_fy"`);
        await queryRunner.query(`ALTER TABLE "budgets" DROP CONSTRAINT "FK_bud_org"`);

        // Drop new tables
        await queryRunner.query(`DROP TABLE "budget_lines"`);
        await queryRunner.query(`DROP TABLE "budgets"`);
        await queryRunner.query(`DROP TYPE "public"."budgets_type_enum"`);

        // Drop FKs from JournalEntryLine
        await queryRunner.query(`ALTER TABLE "journal_entry_lines" DROP CONSTRAINT "FK_jel_proj"`);
        await queryRunner.query(`ALTER TABLE "journal_entry_lines" DROP CONSTRAINT "FK_jel_dept"`);

        // Drop columns from JournalEntryLine
        await queryRunner.query(`ALTER TABLE "journal_entry_lines" DROP COLUMN "project_id"`);
        await queryRunner.query(`ALTER TABLE "journal_entry_lines" DROP COLUMN "department_id"`);
    }
}
