import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedMeroInventoryApp1796000000004 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Check if target_audience column exists
        const columnExists = await queryRunner.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.columns 
                WHERE table_schema = 'public' 
                AND table_name = 'apps' 
                AND column_name = 'target_audience'
            );
        `);

        const hasTargetAudience = columnExists[0]?.exists === true;

        if (hasTargetAudience) {
            await queryRunner.query(`
                INSERT INTO "apps" (
                    "name",
                    "slug",
                    "description",
                    "short_description",
                    "icon_url",
                    "banner_url",
                    "screenshots",
                    "category",
                    "tags",
                    "price",
                    "billing_period",
                    "trial_days",
                    "features",
                    "permissions",
                    "developer_name",
                    "developer_email",
                    "developer_website",
                    "version",
                    "support_url",
                    "documentation_url",
                    "status",
                    "is_featured",
                    "sort_order",
                    "target_audience"
                )
                SELECT
                    'Mero Inventory',
                    'mero-inventory',
                    'Complete inventory management system to track stock, manage warehouses, and optimize supply chain operations.',
                    'Smart inventory management for your business.',
                    'Package',
                    null,
                    null,
                    'business',
                    '["inventory","stock","warehouse","supply-chain"]'::json,
                    15.00,
                    'monthly',
                    14,
                    json_build_object('Warehousing', 'Multi-warehouse support', 'Tracking', 'Stock tracking', 'Alerts', 'Low stock alerts', 'Catalog', 'Product categorization', 'Operations', 'Stock movements'),
                    json_build_array('inventory.products.view', 'inventory.products.create', 'inventory.products.edit', 'inventory.products.delete', 'inventory.stock.view', 'inventory.stock.adjust'),
                    'Blendwit',
                    'support@blendwit.com',
                    'https://blendwit.com',
                    '1.0.0',
                    'https://blendwit.com/support',
                    'https://docs.blendwit.com/mero-inventory',
                    'active',
                    false,
                    35,
                    'organization'::"public"."apps_target_audience_enum"
                WHERE NOT EXISTS (SELECT 1 FROM "apps" WHERE "slug" = 'mero-inventory');
            `);
        } else {
            await queryRunner.query(`
                INSERT INTO "apps" (
                    "name",
                    "slug",
                    "description",
                    "short_description",
                    "icon_url",
                    "banner_url",
                    "screenshots",
                    "category",
                    "tags",
                    "price",
                    "billing_period",
                    "trial_days",
                    "features",
                    "permissions",
                    "developer_name",
                    "developer_email",
                    "developer_website",
                    "version",
                    "support_url",
                    "documentation_url",
                    "status",
                    "is_featured",
                    "sort_order"
                )
                SELECT
                    'Mero Inventory',
                    'mero-inventory',
                    'Complete inventory management system to track stock, manage warehouses, and optimize supply chain operations.',
                    'Smart inventory management for your business.',
                    'https://cdn-icons-png.flaticon.com/512/10473/10473673.png',
                    null,
                    null,
                    'business',
                    '["inventory","stock","warehouse","supply-chain"]'::json,
                    15.00,
                    'monthly',
                    14,
                    json_build_array('Multi-warehouse support', 'Stock tracking', 'Low stock alerts', 'Product categorization', 'Stock movements'),
                    json_build_array('inventory.products.view', 'inventory.products.create', 'inventory.products.edit', 'inventory.products.delete', 'inventory.stock.view', 'inventory.stock.adjust'),
                    'Blendwit',
                    'support@blendwit.com',
                    'https://blendwit.com',
                    '1.0.0',
                    'https://blendwit.com/support',
                    'https://docs.blendwit.com/mero-inventory',
                    'active',
                    false,
                    35
                WHERE NOT EXISTS (SELECT 1 FROM "apps" WHERE "slug" = 'mero-inventory');
            `);
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DELETE FROM "apps" WHERE "slug" = 'mero-inventory'`);
    }
}
