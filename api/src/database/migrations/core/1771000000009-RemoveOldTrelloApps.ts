import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveOldTrelloApps1771000000009 implements MigrationInterface {
  name = 'RemoveOldTrelloApps1771000000009';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // First, find all apps with "trello" in the name or slug (case-insensitive)
    // but exclude "mero-board" which is the correct app
    const trelloApps = await queryRunner.query(`
      SELECT id FROM "apps" 
      WHERE (
        LOWER("name") LIKE '%trello%' 
        OR LOWER("slug") LIKE '%trello%'
        OR LOWER("name") LIKE '%trello-style%'
        OR LOWER("slug") LIKE '%trello-style%'
      )
      AND "slug" != 'mero-board';
    `);

    if (trelloApps.length === 0) {
      return; // No apps to delete
    }

    const appIds = trelloApps.map((app: any) => parseInt(app.id, 10)).filter((id: number) => !isNaN(id));

    if (appIds.length === 0) {
      return; // No valid app IDs
    }

    // Delete related records first (in order of dependencies)
    // Use parameterized queries for safety
    const placeholders = appIds.map((_, index) => `$${index + 1}`).join(',');
    
    // 1. Delete user_app_usage records
    await queryRunner.query(
      `DELETE FROM "user_app_usage" WHERE "app_id" IN (${placeholders})`,
      appIds,
    );

    // 2. Delete user_app_favorites records
    await queryRunner.query(
      `DELETE FROM "user_app_favorites" WHERE "app_id" IN (${placeholders})`,
      appIds,
    );

    // 3. Delete user_app_pinned records
    await queryRunner.query(
      `DELETE FROM "user_app_pinned" WHERE "app_id" IN (${placeholders})`,
      appIds,
    );

    // 4. Delete user_app_access records
    await queryRunner.query(
      `DELETE FROM "user_app_access" WHERE "app_id" IN (${placeholders})`,
      appIds,
    );

    // 5. Delete organization_apps records (subscriptions)
    await queryRunner.query(
      `DELETE FROM "organization_apps" WHERE "app_id" IN (${placeholders})`,
      appIds,
    );

    // 6. Update invoices to set app_id to NULL (don't delete invoices, just unlink)
    await queryRunner.query(
      `UPDATE "invoices" SET "app_id" = NULL WHERE "app_id" IN (${placeholders})`,
      appIds,
    );

    // 7. Update tickets to set board_app_id to NULL (don't delete tickets, just unlink)
    await queryRunner.query(
      `UPDATE "tickets" SET "board_app_id" = NULL, "board_id" = NULL, "board_card_id" = NULL WHERE "board_app_id" IN (${placeholders})`,
      appIds,
    );

    // 8. Finally, delete the apps themselves
    await queryRunner.query(
      `DELETE FROM "apps" WHERE "id" IN (${placeholders})`,
      appIds,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // This migration cannot be reversed as we don't know what the old apps were
    // If needed, the old apps would need to be recreated manually
  }
}

