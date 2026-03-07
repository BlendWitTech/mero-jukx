import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveSystemAdminApp1784000000000 implements MigrationInterface {
  name = 'RemoveSystemAdminApp1784000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // First, find the system-admin app
    const systemAdminApp = await queryRunner.query(`
      SELECT id FROM "apps" 
      WHERE "slug" = 'system-admin';
    `);

    if (systemAdminApp.length === 0) {
      return; // No app to delete
    }

    const appId = parseInt(systemAdminApp[0].id, 10);

    if (isNaN(appId)) {
      return; // Invalid app ID
    }

    // Delete related records first (in order of dependencies)
    
    // 1. Delete user_app_usage records
    await queryRunner.query(
      `DELETE FROM "user_app_usage" WHERE "app_id" = $1`,
      [appId],
    );

    // 2. Delete user_app_favorites records
    await queryRunner.query(
      `DELETE FROM "user_app_favorites" WHERE "app_id" = $1`,
      [appId],
    );

    // 3. Delete user_app_pinned records
    await queryRunner.query(
      `DELETE FROM "user_app_pinned" WHERE "app_id" = $1`,
      [appId],
    );

    // 4. Delete user_app_access records
    await queryRunner.query(
      `DELETE FROM "user_app_access" WHERE "app_id" = $1`,
      [appId],
    );

    // 5. Delete organization_apps records (subscriptions)
    await queryRunner.query(
      `DELETE FROM "organization_apps" WHERE "app_id" = $1`,
      [appId],
    );

    // 6. Update invoices to set app_id to NULL (don't delete invoices, just unlink)
    await queryRunner.query(
      `UPDATE "invoices" SET "app_id" = NULL WHERE "app_id" = $1`,
      [appId],
    );

    // 7. Finally, delete the app itself
    await queryRunner.query(
      `DELETE FROM "apps" WHERE "id" = $1`,
      [appId],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // This migration is for removal only, so down() does nothing
    // If you need to restore, you would need to manually insert the app again
    // or create a separate migration to restore it
  }
}

