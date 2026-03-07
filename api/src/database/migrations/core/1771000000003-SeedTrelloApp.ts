import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedMeroBoardApp1771000000003 implements MigrationInterface {
  name = 'SeedMeroBoardApp1771000000003';

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
          'Mero Board',
          'mero-board',
          'Advanced project management system with workspaces, projects, epics, tasks, and team collaboration. Features include role-based permissions, member invitations, filters, search, and analytics dashboard.',
          'Complete project management solution for teams.',
          'FolderKanban',
          null,
          null,
          'productivity',
          '["project-management","tasks","workspaces","collaboration","analytics"]'::json,
          25.00,
          'monthly',
          0,
          json_build_object('Structure', 'Workspace Management', 'Planning', 'Projects & Epics', 'Execution', 'Task Management', 'Access', 'Role-Based Permissions', 'Team', 'Member Invitations', 'Search', 'Filters & Search', 'Insights', 'Analytics Dashboard'),
          json_build_array('workspaces.create', 'workspaces.view', 'projects.create', 'projects.view', 'tasks.create', 'tasks.view', 'members.invite'),
          'Mero Jugx',
          null,
          null,
          '1.0.0',
          null,
          null,
          'active',
          false,
          10,
          'organization'::"public"."apps_target_audience_enum"
        WHERE NOT EXISTS (SELECT 1 FROM "apps" WHERE "slug" = 'mero-board');
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
          'Mero Board',
          'mero-board',
          'Advanced project management system with workspaces, projects, epics, tasks, and team collaboration. Features include role-based permissions, member invitations, filters, search, and analytics dashboard.',
          'Complete project management solution for teams.',
          null,
          null,
          null,
          'productivity',
          '["project-management","tasks","workspaces","collaboration","analytics"]'::json,
          25.00,
          'monthly',
          0,
          json_build_array('Workspace Management', 'Projects & Epics', 'Task Management', 'Role-Based Permissions', 'Member Invitations', 'Filters & Search', 'Analytics Dashboard'),
          json_build_array('workspaces.create', 'workspaces.view', 'projects.create', 'projects.view', 'tasks.create', 'tasks.view', 'members.invite'),
          'Mero Jugx',
          null,
          null,
          '1.0.0',
          null,
          null,
          'active',
          false,
          10
        WHERE NOT EXISTS (SELECT 1 FROM "apps" WHERE "slug" = 'mero-board');
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM "apps" WHERE "slug" = 'mero-board'`);
  }
}

