import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIpWhitelistAndOrgFeatures1880000000001 implements MigrationInterface {
  name = 'AddIpWhitelistAndOrgFeatures1880000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "organizations"
        ADD COLUMN IF NOT EXISTS "ip_whitelist" TEXT[] DEFAULT NULL,
        ADD COLUMN IF NOT EXISTS "pan_number" VARCHAR(20) DEFAULT NULL,
        ADD COLUMN IF NOT EXISTS "vat_number" VARCHAR(20) DEFAULT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "organizations" DROP COLUMN IF EXISTS "ip_whitelist"`);
    await queryRunner.query(`ALTER TABLE "organizations" DROP COLUMN IF EXISTS "pan_number"`);
    await queryRunner.query(`ALTER TABLE "organizations" DROP COLUMN IF EXISTS "vat_number"`);
  }
}
