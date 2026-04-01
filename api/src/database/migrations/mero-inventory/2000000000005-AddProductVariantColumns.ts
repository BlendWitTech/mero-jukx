import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProductVariantColumns2000000000005 implements MigrationInterface {
  name = 'AddProductVariantColumns2000000000005';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add product variant columns that the Product entity expects but no prior migration added
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
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "products" DROP COLUMN IF EXISTS "attribute_value"`);
    await queryRunner.query(`ALTER TABLE "products" DROP COLUMN IF EXISTS "attribute_type"`);
    await queryRunner.query(`ALTER TABLE "products" DROP CONSTRAINT IF EXISTS "FK_products_parent"`);
    await queryRunner.query(`ALTER TABLE "products" DROP COLUMN IF EXISTS "parent_id"`);
  }
}
