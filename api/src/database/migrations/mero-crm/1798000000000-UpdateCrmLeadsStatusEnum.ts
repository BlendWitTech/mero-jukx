import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateCrmLeadsStatusEnum1798000000000 implements MigrationInterface {
    name = 'UpdateCrmLeadsStatusEnum1798000000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // 1. Rename old enum
        await queryRunner.query(`ALTER TYPE "public"."crm_leads_status_enum" RENAME TO "crm_leads_status_enum_old"`);

        // 2. Create new enum
        await queryRunner.query(`CREATE TYPE "public"."crm_leads_status_enum" AS ENUM('NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST')`);

        // 3. Drop default value
        await queryRunner.query(`ALTER TABLE "public"."crm_leads" ALTER COLUMN "status" DROP DEFAULT`);

        // 4. Alter table to use new enum using USING clause to map values
        await queryRunner.query(`
            ALTER TABLE "public"."crm_leads" 
            ALTER COLUMN "status" TYPE "public"."crm_leads_status_enum" 
            USING CASE 
                WHEN status::text = 'PROPOSAL_SENT' THEN 'PROPOSAL'::"public"."crm_leads_status_enum"
                WHEN status::text = 'CONVERTED' THEN 'WON'::"public"."crm_leads_status_enum"
                ELSE status::text::"public"."crm_leads_status_enum"
            END
        `);

        // 5. Drop old enum
        await queryRunner.query(`DROP TYPE "public"."crm_leads_status_enum_old"`);

        // 6. Set default value
        await queryRunner.query(`ALTER TABLE "public"."crm_leads" ALTER COLUMN "status" SET DEFAULT 'NEW'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Revert steps
        await queryRunner.query(`ALTER TYPE "public"."crm_leads_status_enum" RENAME TO "crm_leads_status_enum_new"`);
        await queryRunner.query(`CREATE TYPE "public"."crm_leads_status_enum" AS ENUM('NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL_SENT', 'CONVERTED', 'LOST')`);

        // Drop default value before revert
        await queryRunner.query(`ALTER TABLE "public"."crm_leads" ALTER COLUMN "status" DROP DEFAULT`);

        await queryRunner.query(`
            ALTER TABLE "public"."crm_leads" 
            ALTER COLUMN "status" TYPE "public"."crm_leads_status_enum" 
            USING CASE 
                WHEN status::text = 'PROPOSAL' THEN 'PROPOSAL_SENT'::"public"."crm_leads_status_enum"
                WHEN status::text = 'WON' THEN 'CONVERTED'::"public"."crm_leads_status_enum"
                WHEN status::text = 'NEGOTIATION' THEN 'QUALIFIED'::"public"."crm_leads_status_enum" -- Map to something safe?
                ELSE status::text::"public"."crm_leads_status_enum"
            END
        `);

        await queryRunner.query(`DROP TYPE "public"."crm_leads_status_enum_new"`);
        await queryRunner.query(`ALTER TABLE "public"."crm_leads" ALTER COLUMN "status" SET DEFAULT 'NEW'`);
    }
}
