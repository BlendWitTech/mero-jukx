import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddHrPhase2Tables1796000000009 implements MigrationInterface {
    name = 'AddHrPhase2Tables1796000000009';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // hr_shifts
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "hr_shifts" (
                "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                "organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
                "name" varchar(100) NOT NULL,
                "start_time" time NOT NULL,
                "end_time" time NOT NULL,
                "work_hours" int NOT NULL DEFAULT 8,
                "work_days" varchar(20) NOT NULL DEFAULT '1,2,3,4,5',
                "is_active" boolean NOT NULL DEFAULT true,
                "description" text,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now()
            )
        `);

        // hr_public_holidays
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "hr_public_holidays" (
                "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                "organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
                "name" varchar(150) NOT NULL,
                "date" date NOT NULL,
                "year" int NOT NULL,
                "nepali_year" varchar(10),
                "is_paid" boolean NOT NULL DEFAULT true,
                "description" text,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now()
            )
        `);

        // hr_leave_balances
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "hr_leave_balances" (
                "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                "organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
                "employee_id" uuid NOT NULL REFERENCES "hr_employees"("id") ON DELETE CASCADE,
                "leave_type" varchar(30) NOT NULL,
                "fiscal_year" varchar(10) NOT NULL,
                "entitled_days" decimal(5,1) NOT NULL DEFAULT 0,
                "used_days" decimal(5,1) NOT NULL DEFAULT 0,
                "carried_forward" decimal(5,1) NOT NULL DEFAULT 0,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "uq_leave_balance" UNIQUE ("employee_id", "leave_type", "fiscal_year")
            )
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE IF EXISTS "hr_leave_balances"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "hr_public_holidays"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "hr_shifts"`);
    }
}
