import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * No-op migration.
 *
 * The original migration here seeded a `mero-saas-kit` row into the `apps` table.
 * Mero SaaS Kit was removed from the product (chore/remove-social-saas-kit).
 *
 * The file is kept (rather than deleted) to preserve migration timestamp ordering
 * for environments that already executed it. A subsequent migration removes the
 * row from any database that did run the original.
 *
 * Fresh installs simply skip the insert.
 */
export class SeedMeroSaaSKitApp1772000000000 implements MigrationInterface {
  name = 'SeedMeroSaaSKitApp1772000000000';

  public async up(_queryRunner: QueryRunner): Promise<void> {
    // intentionally empty
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // intentionally empty
  }
}
