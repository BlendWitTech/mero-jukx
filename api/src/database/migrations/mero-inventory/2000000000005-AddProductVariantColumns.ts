import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProductVariantColumns2000000000005 implements MigrationInterface {
  name = 'AddProductVariantColumns2000000000005';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add product variant columns (parent_id, attribute_type, attribute_value)
    const hasParentId = await queryRunner.hasColumn('products', 'parent_id');
    if (!hasParentId) {
      await queryRunner.query(`ALTER TABLE "products" ADD COLUMN "parent_id" uuid NULL`);
      await queryRunner.query(`
        DO $$ BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_products_parent') THEN
            ALTER TABLE "products" ADD CONSTRAINT "FK_products_parent"
              FOREIGN KEY ("parent_id") REFERENCES "products"("id") ON DELETE SET NULL;
          END IF;
        END $$
      `);
    }

    const hasAttributeType = await queryRunner.hasColumn('products', 'attribute_type');
    if (!hasAttributeType) {
      await queryRunner.query(`ALTER TABLE "products" ADD COLUMN "attribute_type" varchar(50) NULL`);
    }

    const hasAttributeValue = await queryRunner.hasColumn('products', 'attribute_value');
    if (!hasAttributeValue) {
      await queryRunner.query(`ALTER TABLE "products" ADD COLUMN "attribute_value" varchar(100) NULL`);
    }

    // Add expiry columns (migration 1853000000000 targeted wrong table name 'inventory_products')
    const hasExpiryDate = await queryRunner.hasColumn('products', 'expiry_date');
    if (!hasExpiryDate) {
      await queryRunner.query(`ALTER TABLE "products" ADD COLUMN "expiry_date" date NULL`);
    }

    const hasExpiryAlertDays = await queryRunner.hasColumn('products', 'expiry_alert_days');
    if (!hasExpiryAlertDays) {
      await queryRunner.query(`ALTER TABLE "products" ADD COLUMN "expiry_alert_days" integer NOT NULL DEFAULT 30`);
    }

    const hasTrackExpiry = await queryRunner.hasColumn('products', 'track_expiry');
    if (!hasTrackExpiry) {
      await queryRunner.query(`ALTER TABLE "products" ADD COLUMN "track_expiry" boolean NOT NULL DEFAULT false`);
    }

    // Add serial/batch tracking columns (migration 1857000000000 targeted wrong table name)
    const hasTrackSerial = await queryRunner.hasColumn('products', 'track_serial');
    if (!hasTrackSerial) {
      await queryRunner.query(`ALTER TABLE "products" ADD COLUMN "track_serial" boolean NOT NULL DEFAULT false`);
    }

    const hasTrackBatch = await queryRunner.hasColumn('products', 'track_batch');
    if (!hasTrackBatch) {
      await queryRunner.query(`ALTER TABLE "products" ADD COLUMN "track_batch" boolean NOT NULL DEFAULT false`);
    }
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
