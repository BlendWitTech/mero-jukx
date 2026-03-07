import { MigrationInterface, QueryRunner } from "typeorm";

export class AddLoanDeductionsToHrPayroll1796000000008 implements MigrationInterface {
    name = 'AddLoanDeductionsToHrPayroll1796000000008'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "hr_payroll" ADD "loan_deduction" numeric(15,2) NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "hr_payroll" ADD "advance_deduction" numeric(15,2) NOT NULL DEFAULT '0'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "hr_payroll" DROP COLUMN "advance_deduction"`);
        await queryRunner.query(`ALTER TABLE "hr_payroll" DROP COLUMN "loan_deduction"`);
    }
}
