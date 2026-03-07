import { MigrationInterface, QueryRunner } from "typeorm";

export class AddMaritalStatusToHrEmployees1796000000007 implements MigrationInterface {
    name = 'AddMaritalStatusToHrEmployees1796000000007'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create the enum type if it doesn't exist (using DO block for safety)
        await queryRunner.query(`
            DO $$
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'hr_employees_marital_status_enum') THEN
                    CREATE TYPE "public"."hr_employees_marital_status_enum" AS ENUM('SINGLE', 'MARRIED');
                END IF;
            END
            $$;
        `);

        // Add the column
        await queryRunner.query(`ALTER TABLE "hr_employees" ADD "marital_status" "public"."hr_employees_marital_status_enum" NOT NULL DEFAULT 'SINGLE'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "hr_employees" DROP COLUMN "marital_status"`);
        await queryRunner.query(`DROP TYPE "public"."hr_employees_marital_status_enum"`);
    }
}
