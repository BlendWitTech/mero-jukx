import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Removes the mero-saas-kit and mero-social rows from the `apps` table.
 * These two apps were removed from the product (chore/remove-social-saas-kit).
 *
 * Idempotent: uses a WHERE filter, safe to re-run.
 *
 * No data loss for tenants that never enabled either app. Tenants that DID
 * enable them will have their organization_apps row(s) removed via the FK
 * cascade defined on apps.id (or, if no cascade exists, manually below).
 */
export class RemoveSocialAndSaasKitApps1819000000000 implements MigrationInterface {
  name = 'RemoveSocialAndSaasKitApps1819000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Defensive: clear any organization_apps rows pointing at the apps we are removing,
    // in case the FK is RESTRICT rather than CASCADE.
    await queryRunner.query(`
      DELETE FROM "organization_apps"
      WHERE "app_id" IN (
        SELECT "id" FROM "apps" WHERE "slug" IN ('mero-saas-kit', 'mero-social')
      );
    `);

    await queryRunner.query(`
      DELETE FROM "apps"
      WHERE "slug" IN ('mero-saas-kit', 'mero-social');
    `);
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // No down migration: re-creating these app rows would require restoring data
    // that no longer exists in the codebase. Use the original seed migrations
    // from git history if you genuinely need to reverse this.
  }
}
