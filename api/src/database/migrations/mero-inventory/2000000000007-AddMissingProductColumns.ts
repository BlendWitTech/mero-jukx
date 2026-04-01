import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds product columns that were missed because migration 2000000000005
 * was updated after it had already run on the live database.
 * All operations are idempotent.
 */
export class AddMissingProductColumns2000000000007 implements MigrationInterface {
  name = 'AddMissingProductColumns2000000000007';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const add = async (col: string, def: string) => {
      const has = await queryRunner.hasColumn('products', col);
      if (!has) await queryRunner.query(`ALTER TABLE "products" ADD COLUMN ${def}`);
    };

    await add('expiry_date', `"expiry_date" date NULL`);
    await add('expiry_alert_days', `"expiry_alert_days" integer NOT NULL DEFAULT 30`);
    await add('track_expiry', `"track_expiry" boolean NOT NULL DEFAULT false`);
    await add('track_serial', `"track_serial" boolean NOT NULL DEFAULT false`);
    await add('track_batch', `"track_batch" boolean NOT NULL DEFAULT false`);
    await add('parent_id', `"parent_id" uuid NULL`);
    await add('attribute_type', `"attribute_type" varchar(50) NULL`);
    await add('attribute_value', `"attribute_value" varchar(100) NULL`);

    // Add FK for parent_id if column was just added
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_products_parent') THEN
          ALTER TABLE "products" ADD CONSTRAINT "FK_products_parent"
            FOREIGN KEY ("parent_id") REFERENCES "products"("id") ON DELETE SET NULL;
        END IF;
      END $$
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "products" DROP COLUMN IF EXISTS "track_batch"`);
    await queryRunner.query(`ALTER TABLE "products" DROP COLUMN IF EXISTS "track_serial"`);
    await queryRunner.query(`ALTER TABLE "products" DROP COLUMN IF EXISTS "track_expiry"`);
    await queryRunner.query(`ALTER TABLE "products" DROP COLUMN IF EXISTS "expiry_alert_days"`);
    await queryRunner.query(`ALTER TABLE "products" DROP COLUMN IF EXISTS "expiry_date"`);
    await queryRunner.query(`ALTER TABLE "products" DROP COLUMN IF EXISTS "attribute_value"`);
    await queryRunner.query(`ALTER TABLE "products" DROP COLUMN IF EXISTS "attribute_type"`);
    await queryRunner.query(`ALTER TABLE "products" DROP CONSTRAINT IF EXISTS "FK_products_parent"`);
    await queryRunner.query(`ALTER TABLE "products" DROP COLUMN IF EXISTS "parent_id"`);
  }
}
