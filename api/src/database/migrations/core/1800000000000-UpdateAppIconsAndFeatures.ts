import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateAppIconsAndFeatures1800000000000 implements MigrationInterface {
    name = 'UpdateAppIconsAndFeatures1800000000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Update Mero CRM
        await queryRunner.query(`
            UPDATE "apps"
            SET "icon_url" = 'Users',
                "features" = json_build_object('Management', 'Client Management', 'Billing', 'Invoicing System', 'Tracking', 'Payment Tracking', 'Analytics', 'Dashboard Analytics', 'Exports', 'PDF Export')
            WHERE "slug" = 'mero-crm'
        `);

        // Update Mero Board
        await queryRunner.query(`
            UPDATE "apps"
            SET "icon_url" = 'FolderKanban',
                "features" = json_build_object('Structure', 'Workspace Management', 'Planning', 'Projects & Epics', 'Execution', 'Task Management', 'Access', 'Role-Based Permissions', 'Team', 'Member Invitations', 'Search', 'Filters & Search', 'Insights', 'Analytics Dashboard')
            WHERE "slug" = 'mero-board'
        `);

        // Update Mero Inventory
        await queryRunner.query(`
            UPDATE "apps"
            SET "icon_url" = 'Package',
                "features" = json_build_object('Warehousing', 'Multi-warehouse support', 'Tracking', 'Stock tracking', 'Alerts', 'Low stock alerts', 'Catalog', 'Product categorization', 'Operations', 'Stock movements')
            WHERE "slug" = 'mero-inventory'
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Revert Mero CRM
        await queryRunner.query(`
            UPDATE "apps"
            SET "icon_url" = null,
                "features" = json_build_array('Client Management', 'Invoicing System', 'Payment Tracking', 'Dashboard Analytics', 'PDF Export')
            WHERE "slug" = 'mero-crm'
        `);

        // Revert Mero Board
        await queryRunner.query(`
            UPDATE "apps"
            SET "icon_url" = null,
                "features" = json_build_array('Workspace Management', 'Projects & Epics', 'Task Management', 'Role-Based Permissions', 'Member Invitations', 'Filters & Search', 'Analytics Dashboard')
            WHERE "slug" = 'mero-board'
        `);

        // Revert Mero Inventory
        await queryRunner.query(`
            UPDATE "apps"
            SET "icon_url" = 'https://cdn-icons-png.flaticon.com/512/10473/10473673.png',
                "features" = json_build_array('Multi-warehouse support', 'Stock tracking', 'Low stock alerts', 'Product categorization', 'Stock movements')
            WHERE "slug" = 'mero-inventory'
        `);
    }
}
