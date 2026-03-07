import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedMeroHrApp1831000000000 implements MigrationInterface {
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
                    "name", "slug", "description", "short_description", "icon_url", 
                    "category", "tags", "price", "billing_period", "trial_days", 
                    "features", "permissions", "developer_name", "version", 
                    "status", "is_featured", "sort_order", "target_audience"
                )
                SELECT
                    'Mero HR',
                    'mero-hr',
                    'Complete Human Resource Management system for personnel, attendance, leave, and payroll processing. Fully compliant with Nepal social security and tax regulations.',
                    'Comprehensive HR and Payroll management.',
                    'Users',
                    'business',
                    '["hr","human resources","payroll","attendance","nepal"]'::json,
                    25.00,
                    'monthly',
                    30,
                    json_build_object(
                        'Employees', 'Centralized personnel records',
                        'Attendance', 'Real-time check-in/out tracking',
                        'Leave', 'Automated approval workflows',
                        'Payroll', 'Nepal specific SSF/Tax engine',
                        'Accounting', 'Auto-post to Mero Accounting'
                    ),
                    json_build_array('hr.view', 'hr.manage', 'hr.payroll', 'hr.attendance'),
                    'Blendwit',
                    '1.0.0',
                    'active',
                    true,
                    50,
                    'organization'::"public"."apps_target_audience_enum"
                WHERE NOT EXISTS (SELECT 1 FROM "apps" WHERE "slug" = 'mero-hr');
            `);
        } else {
            await queryRunner.query(`
                INSERT INTO "apps" (
                    "name", "slug", "description", "short_description", "icon_url", 
                    "category", "tags", "price", "billing_period", "trial_days", 
                    "features", "permissions", "developer_name", "version", 
                    "status", "is_featured", "sort_order"
                )
                SELECT
                    'Mero HR',
                    'mero-hr',
                    'Complete Human Resource Management system for personnel, attendance, leave, and payroll processing. Fully compliant with Nepal social security and tax regulations.',
                    'Comprehensive HR and Payroll management.',
                    'https://cdn-icons-png.flaticon.com/512/912/912318.png',
                    'business',
                    '["hr","human resources","payroll","attendance","nepal"]'::json,
                    25.00,
                    'monthly',
                    30,
                    json_build_array(
                        'Centralized personnel records',
                        'Real-time check-in/out tracking',
                        'Automated approval workflows',
                        'Nepal specific SSF/Tax engine',
                        'Auto-post to Mero Accounting'
                    ),
                    json_build_array('hr.view', 'hr.manage', 'hr.payroll', 'hr.attendance'),
                    'Blendwit',
                    '1.0.0',
                    'active',
                    true,
                    50
                WHERE NOT EXISTS (SELECT 1 FROM "apps" WHERE "slug" = 'mero-hr');
            `);
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DELETE FROM "apps" WHERE "slug" = 'mero-hr'`);
    }
}
