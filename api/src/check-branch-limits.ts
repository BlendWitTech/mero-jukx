import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { Package } from './database/entities/packages.entity';
import { Organization } from './database/entities/organizations.entity';

dotenv.config();

async function checkLimits() {
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
        console.log('--- Packages ---');
        const packages = await dataSource.getRepository(Package).find();
        packages.forEach(pkg => {
            console.log(`${pkg.slug}: base_branch_limit = ${pkg.base_branch_limit}`);
        });

        console.log('\n--- Organizations ---');
        const organizations = await dataSource.getRepository(Organization).find({
            relations: ['package']
        });
        organizations.forEach(org => {
            console.log(`${org.name} (${org.org_type}): branch_limit = ${org.branch_limit}, package = ${org.package?.slug}`);
        });

    } catch (error) {
        console.error('Error during database check:', error);
    } finally {
        await dataSource.destroy();
    }
}

checkLimits();
