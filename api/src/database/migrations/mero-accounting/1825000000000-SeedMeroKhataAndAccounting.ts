import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedMeroKhataAndAccounting1825000000000 implements MigrationInterface {
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
            // Mero Khata
            await queryRunner.query(`
                INSERT INTO "apps" (
                    "name", "slug", "description", "short_description", "icon_url", 
                    "category", "tags", "price", "billing_period", "trial_days", 
                    "features", "permissions", "developer_name", "version", 
                    "status", "is_featured", "sort_order", "target_audience"
                )
                SELECT
                    'Mero Khata',
                    'mero-khata',
                    'Advanced digital ledger system to track credit (Udhar) and payments for businesses. Features SMS reminders, customer tracking, and detailed financial history.',
                    'Smart digital ledger for credit tracking.',
                    'Book',
                    'business',
                    '["khata","ledger","credit","udhar","finance"]'::json,
                    12.00,
                    'monthly',
                    14,
                    json_build_object('Ledger', 'Digital credit tracking', 'Reminders', 'SMS payment reminders', 'Customers', 'Customer management', 'History', 'Transaction history', 'Security', 'Data encryption'),
                    json_build_array('khata.view', 'khata.manage', 'khata.reports'),
                    'Blendwit',
                    '1.0.0',
                    'active',
                    true,
                    40,
                    'organization'::"public"."apps_target_audience_enum"
                WHERE NOT EXISTS (SELECT 1 FROM "apps" WHERE "slug" = 'mero-khata');
            `);

            // Mero Accounting
            await queryRunner.query(`
                INSERT INTO "apps" (
                    "name", "slug", "description", "short_description", "icon_url", 
                    "category", "tags", "price", "billing_period", "trial_days", 
                    "features", "permissions", "developer_name", "version", 
                    "status", "is_featured", "sort_order", "target_audience"
                )
                SELECT
                    'Mero Accounting',
                    'mero-accounting',
                    'Professional-grade accounting system with double-entry bookkeeping, banking integration, sales/purchase management, and comprehensive financial reports.',
                    'Professional accounting for growing organizations.',
                    'Calculator',
                    'business',
                    '["accounting","bookkeeping","finance","tax","reports"]'::json,
                    35.00,
                    'monthly',
                    30,
                    json_build_object('Double-Entry', 'Standard accounting model', 'Banking', 'Bank reconciliation', 'Reports', 'P&L and Balance Sheet', 'Sales', 'Invoice management', 'Purchases', 'Vendor bill tracking'),
                    json_build_array('accounting.view', 'accounting.manage', 'accounting.reports', 'accounting.journals'),
                    'Blendwit',
                    '1.0.0',
                    'active',
                    true,
                    45,
                    'organization'::"public"."apps_target_audience_enum"
                WHERE NOT EXISTS (SELECT 1 FROM "apps" WHERE "slug" = 'mero-accounting');
            `);
        } else {
            // Mero Khata
            await queryRunner.query(`
                INSERT INTO "apps" (
                    "name", "slug", "description", "short_description", "icon_url", 
                    "category", "tags", "price", "billing_period", "trial_days", 
                    "features", "permissions", "developer_name", "version", 
                    "status", "is_featured", "sort_order"
                )
                SELECT
                    'Mero Khata',
                    'mero-khata',
                    'Advanced digital ledger system to track credit (Udhar) and payments for businesses. Features SMS reminders, customer tracking, and detailed financial history.',
                    'Smart digital ledger for credit tracking.',
                    'https://cdn-icons-png.flaticon.com/512/3532/3532050.png',
                    'business',
                    '["khata","ledger","credit","udhar","finance"]'::json,
                    12.00,
                    'monthly',
                    14,
                    json_build_array('Digital credit tracking', 'SMS payment reminders', 'Customer management', 'Transaction history', 'Data encryption'),
                    json_build_array('khata.view', 'khata.manage', 'khata.reports'),
                    'Blendwit',
                    '1.0.0',
                    'active',
                    true,
                    40
                WHERE NOT EXISTS (SELECT 1 FROM "apps" WHERE "slug" = 'mero-khata');
            `);

            // Mero Accounting
            await queryRunner.query(`
                INSERT INTO "apps" (
                    "name", "slug", "description", "short_description", "icon_url", 
                    "category", "tags", "price", "billing_period", "trial_days", 
                    "features", "permissions", "developer_name", "version", 
                    "status", "is_featured", "sort_order"
                )
                SELECT
                    'Mero Accounting',
                    'mero-accounting',
                    'Professional-grade accounting system with double-entry bookkeeping, banking integration, sales/purchase management, and comprehensive financial reports.',
                    'Professional accounting for growing organizations.',
                    'https://cdn-icons-png.flaticon.com/512/2652/2652218.png',
                    'business',
                    '["accounting","bookkeeping","finance","tax","reports"]'::json,
                    35.00,
                    'monthly',
                    30,
                    json_build_array('Standard accounting model', 'Bank reconciliation', 'P&L and Balance Sheet', 'Invoice management', 'Vendor bill tracking'),
                    json_build_array('accounting.view', 'accounting.manage', 'accounting.reports', 'accounting.journals'),
                    'Blendwit',
                    '1.0.0',
                    'active',
                    true,
                    45
                WHERE NOT EXISTS (SELECT 1 FROM "apps" WHERE "slug" = 'mero-accounting');
            `);
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DELETE FROM "apps" WHERE "slug" IN ('mero-khata', 'mero-accounting')`);
    }
}
