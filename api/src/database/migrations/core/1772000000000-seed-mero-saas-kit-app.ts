import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedMeroSaaSKitApp1772000000000 implements MigrationInterface {
  name = 'SeedMeroSaaSKitApp1772000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if target_audience column exists (added in later migration)
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
      // Include target_audience if column exists
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
          'Mero SaaS Kit',
          'mero-saas-kit',
          'Visual SaaS builder and template generator. Build, customize, and deploy SaaS applications with ease. Features include drag-and-drop interface, component library, code generator, one-click deployment, template marketplace, and multi-framework support.',
          'Visual builder and code generator for SaaS applications.',
          null,
          null,
          null,
          'productivity',
          '["saas-builder","code-generator","visual-builder","templates","deployment"]'::json,
          0.00,
          'monthly',
          0,
          json_build_array('Visual Builder', 'Component Library', 'Code Generator', 'One-Click Deployment', 'Template Marketplace', 'Multi-Framework Support'),
          json_build_array('apps.view', 'apps.create', 'apps.edit'),
          'Mero Jugx',
          null,
          null,
          '1.0.0',
          null,
          null,
          'active',
          false,
          20,
          'organization'::"public"."apps_target_audience_enum"
        WHERE NOT EXISTS (SELECT 1 FROM "apps" WHERE "slug" = 'mero-saas-kit');
      `);
    } else {
      // Original insert without target_audience (for when column doesn't exist yet)
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
          'Mero SaaS Kit',
          'mero-saas-kit',
          'Visual SaaS builder and template generator. Build, customize, and deploy SaaS applications with ease. Features include drag-and-drop interface, component library, code generator, one-click deployment, template marketplace, and multi-framework support.',
          'Visual builder and code generator for SaaS applications.',
          null,
          null,
          null,
          'productivity',
          '["saas-builder","code-generator","visual-builder","templates","deployment"]'::json,
          0.00,
          'monthly',
          0,
          json_build_array('Visual Builder', 'Component Library', 'Code Generator', 'One-Click Deployment', 'Template Marketplace', 'Multi-Framework Support'),
          json_build_array('apps.view', 'apps.create', 'apps.edit'),
          'Mero Jugx',
          null,
          null,
          '1.0.0',
          null,
          null,
          'active',
          false,
          20
        WHERE NOT EXISTS (SELECT 1 FROM "apps" WHERE "slug" = 'mero-saas-kit');
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM "apps" WHERE "slug" = 'mero-saas-kit'`);
  }
}

