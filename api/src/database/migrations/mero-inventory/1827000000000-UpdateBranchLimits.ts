import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateBranchLimits1827000000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Update package branch limits
        // Requested limits: Basic (2), Platinum (5), Diamond (10)
        // Previous limits (from migration 1810000000000): Free: 1, Basic: 5, Platinum: 10, Diamond: 15

        await queryRunner.query("UPDATE packages SET base_branch_limit = 1 WHERE slug = 'freemium'");
        await queryRunner.query("UPDATE packages SET base_branch_limit = 2 WHERE slug = 'basic'");
        await queryRunner.query("UPDATE packages SET base_branch_limit = 5 WHERE slug = 'platinum'");
        await queryRunner.query("UPDATE packages SET base_branch_limit = 10 WHERE slug = 'diamond'");

        // Sync branch_limit in organizations based on their package
        await queryRunner.query(`
            UPDATE organizations 
            SET branch_limit = p.base_branch_limit 
            FROM packages p 
            WHERE organizations.package_id = p.id
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Revert to previous limits if needed (Free: 1, Basic: 5, Platinum: 10, Diamond: 15)
        await queryRunner.query("UPDATE packages SET base_branch_limit = 1 WHERE slug = 'freemium'");
        await queryRunner.query("UPDATE packages SET base_branch_limit = 5 WHERE slug = 'basic'");
        await queryRunner.query("UPDATE packages SET base_branch_limit = 10 WHERE slug = 'platinum'");
        await queryRunner.query("UPDATE packages SET base_branch_limit = 15 WHERE slug = 'diamond'");

        // Sync branch_limit in organizations
        await queryRunner.query(`
            UPDATE organizations 
            SET branch_limit = p.base_branch_limit 
            FROM packages p 
            WHERE organizations.package_id = p.id
        `);
    }
}
