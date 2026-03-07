import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedMeroCRMApp1784000000000 implements MigrationInterface {
  name = 'SeedMeroCRMApp1784000000000';

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
          'Mero CRM',
          'mero-crm',
          'Comprehensive Customer Relationship Management system. Manage clients, invoices, payments, and track business growth with detailed analytics.',
          'Complete CRM solution for your business.',
          'Users',
          null,
          null,
          'business',
          '["crm","invoices","payments","clients","analytics"]'::json,
          25.00,
          'monthly',
          0,
          json_build_object('Management', 'Client Management', 'Billing', 'Invoicing System', 'Tracking', 'Payment Tracking', 'Analytics', 'Dashboard Analytics', 'Exports', 'PDF Export'),
          json_build_array('crm.clients.view', 'crm.clients.create', 'crm.clients.edit', 'crm.clients.delete', 'crm.invoices.view', 'crm.invoices.create', 'crm.invoices.edit', 'crm.payments.view', 'crm.payments.create'),
          'Mero Jugx',
          null,
          null,
          '1.0.0',
          null,
          null,
          'active',
          false,
          30,
          'organization'::"public"."apps_target_audience_enum"
        WHERE NOT EXISTS (SELECT 1 FROM "apps" WHERE "slug" = 'mero-crm');
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
          'Mero CRM',
          'mero-crm',
          'Comprehensive Customer Relationship Management system. Manage clients, invoices, payments, and track business growth with detailed analytics.',
          'Complete CRM solution for your business.',
          null,
          null,
          null,
          'business',
          '["crm","invoices","payments","clients","analytics"]'::json,
          25.00,
          'monthly',
          0,
          json_build_array('Client Management', 'Invoicing System', 'Payment Tracking', 'Dashboard Analytics', 'PDF Export'),
          json_build_array('crm.clients.view', 'crm.clients.create', 'crm.clients.edit', 'crm.clients.delete', 'crm.invoices.view', 'crm.invoices.create', 'crm.invoices.edit', 'crm.payments.view', 'crm.payments.create'),
          'Mero Jugx',
          null,
          null,
          '1.0.0',
          null,
          null,
          'active',
          false,
          30
        WHERE NOT EXISTS (SELECT 1 FROM "apps" WHERE "slug" = 'mero-crm');
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM "apps" WHERE "slug" = 'mero-crm'`);
  }
}
