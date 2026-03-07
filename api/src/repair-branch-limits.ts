import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { Package } from './database/entities/packages.entity';
import { Organization } from './database/entities/organizations.entity';

dotenv.config();

async function repairBranchLimits() {
    const dataSource = new DataSource({
        type: 'postgres',
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        username: process.env.DB_USERNAME || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
        database: process.env.DB_DATABASE || 'mero_jugx',
        entities: [Package, Organization],
        synchronize: false,
    });

    try {
        await dataSource.initialize();
        console.log('Successfully connected to the database.');

        // Update all organizations where branch_limit doesn't match the package's base_branch_limit
        const result = await dataSource.query(`
            UPDATE organizations 
            SET branch_limit = p.base_branch_limit 
            FROM packages p 
            WHERE organizations.package_id = p.id 
            AND organizations.branch_limit != p.base_branch_limit
            AND organizations.org_type = 'MAIN';
        `);

        console.log(`Successfully repaired branch limits for MAIN organizations.`);

        // Show current state
        const orgs = await dataSource.query(`
            SELECT o.name, o.branch_limit, p.slug as package_slug, p.base_branch_limit 
            FROM organizations o
            JOIN packages p ON o.package_id = p.id
            WHERE o.org_type = 'MAIN'
        `);

        console.table(orgs);

    } catch (error) {
        console.error('Error during database repair:', error);
    } finally {
        await dataSource.destroy();
    }
}

repairBranchLimits();
