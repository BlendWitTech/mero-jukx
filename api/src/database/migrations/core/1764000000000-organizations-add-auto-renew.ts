import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAutoRenewCredentials1764000000000 implements MigrationInterface {
  name = 'AddAutoRenewCredentials1764000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "organizations" ADD COLUMN "package_auto_renew_credentials" text`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "organizations" DROP COLUMN "package_auto_renew_credentials"`,
    );
  }
}

