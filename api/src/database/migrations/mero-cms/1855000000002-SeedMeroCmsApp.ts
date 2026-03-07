import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedMeroCmsApp1855000000002 implements MigrationInterface {
    name = 'SeedMeroCmsApp1855000000002';

    public async up(queryRunner: QueryRunner): Promise<void> {
        try {
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
                        "name", "slug", "description", "short_description",
                        "icon_url", "banner_url", "screenshots",
                        "category", "tags", "price", "billing_period", "trial_days",
                        "features", "permissions",
                        "developer_name", "developer_email", "developer_website",
                        "version", "support_url", "documentation_url",
                        "status", "is_featured", "sort_order", "target_audience"
                    )
                    SELECT
                        'Mero CMS',
                        'mero-cms',
                        'Complete content management system for your organization. Build websites, manage blog posts, create lead capture forms, and manage your media library — all integrated with your ERP.',
                        'Website and content management with blog, forms, and media library.',
                        'FileText',
                        null, null,
                        'business',
                        '["cms","website","blog","forms","media","content"]'::json,
                        20.00,
                        'monthly',
                        14,
                        json_build_object(
                            'Pages', 'Website page builder with rich content',
                            'Blog', 'Full blog management with SEO support',
                            'Media', 'Centralized media library for images and files',
                            'Forms', 'Drag-and-drop form builder with CRM integration',
                            'Settings', 'Site branding and custom domain support'
                        ),
                        json_build_array(
                            'cms.pages.view', 'cms.pages.create', 'cms.pages.edit', 'cms.pages.delete',
                            'cms.posts.view', 'cms.posts.create', 'cms.posts.edit', 'cms.posts.delete',
                            'cms.media.view', 'cms.media.upload', 'cms.media.delete',
                            'cms.forms.view', 'cms.forms.create', 'cms.forms.edit', 'cms.forms.delete',
                            'cms.settings.view', 'cms.settings.edit'
                        ),
                        'Mero Jugx', null, null,
                        '1.0.0', null, null,
                        'active', false, 70,
                        'organization'::"public"."apps_target_audience_enum"
                    WHERE NOT EXISTS (SELECT 1 FROM "apps" WHERE "slug" = 'mero-cms');
                `);
            } else {
                await queryRunner.query(`
                    INSERT INTO "apps" (
                        "name", "slug", "description", "short_description",
                        "icon_url", "banner_url", "screenshots",
                        "category", "tags", "price", "billing_period", "trial_days",
                        "features", "permissions",
                        "developer_name", "developer_email", "developer_website",
                        "version", "support_url", "documentation_url",
                        "status", "is_featured", "sort_order"
                    )
                    SELECT
                        'Mero CMS',
                        'mero-cms',
                        'Complete content management system for your organization. Build websites, manage blog posts, create lead capture forms, and manage your media library — all integrated with your ERP.',
                        'Website and content management with blog, forms, and media library.',
                        'FileText',
                        null, null,
                        'business',
                        '["cms","website","blog","forms","media","content"]'::json,
                        20.00,
                        'monthly',
                        14,
                        json_build_array('Website Pages', 'Blog Management', 'Media Library', 'Form Builder', 'CRM Integration'),
                        json_build_array(
                            'cms.pages.view', 'cms.pages.create', 'cms.pages.edit', 'cms.pages.delete',
                            'cms.posts.view', 'cms.posts.create', 'cms.posts.edit', 'cms.posts.delete',
                            'cms.media.view', 'cms.media.upload', 'cms.media.delete',
                            'cms.forms.view', 'cms.forms.create', 'cms.forms.edit', 'cms.forms.delete',
                            'cms.settings.view', 'cms.settings.edit'
                        ),
                        'Mero Jugx', null, null,
                        '1.0.0', null, null,
                        'active', false, 70
                    WHERE NOT EXISTS (SELECT 1 FROM "apps" WHERE "slug" = 'mero-cms');
                `);
            }
        } catch (error) {
            console.error('SeedMeroCmsApp migration error:', error.message);
            throw error;
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DELETE FROM "apps" WHERE "slug" = 'mero-cms'`);
    }
}
