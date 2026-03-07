import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load environment variables
config();

async function diagnose() {
    console.log('Starting diagnosis...');

    const dbConfig = {
        type: 'postgres',
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5433'),
        username: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
        database: process.env.DB_NAME || 'mero_jugx',
    };

    const dataSource = new DataSource({
        ...dbConfig,
        type: 'postgres',
        ssl: false,
    });

    const results: any = {
        connection: dbConfig,
        users: {},
        organizations: {},
        timestamp: new Date().toISOString()
    };

    try {
        await dataSource.initialize();
        results.connected = true;

        // Check Users
        const userCount = await dataSource.query('SELECT COUNT(*) FROM users');
        results.users.total = userCount[0].count;

        const targetEmail = 'blendwittech@gmail.com';
        const targetUser = await dataSource.query('SELECT * FROM users WHERE email = $1', [targetEmail]);
        results.users.target_found = targetUser.length > 0;
        if (targetUser.length > 0) {
            results.users.target_details = { id: targetUser[0].id, email: targetUser[0].email, created_at: targetUser[0].created_at };
        }

        // List ALL users to identify the mystery user
        const allUsers = await dataSource.query('SELECT id, email, first_name, last_name FROM users');
        results.users.all_users = allUsers;

        const superAdmin = await dataSource.query('SELECT * FROM users WHERE email = $1', ['superadmin@merojugx.com']);
        results.users.superadmin_found = superAdmin.length > 0;

        // Check Organizations
        const orgCount = await dataSource.query('SELECT COUNT(*) FROM organizations');
        results.organizations.total = orgCount[0].count;

        const targetOrgEmail = 'owner@blendwit.com';
        const targetOrg = await dataSource.query('SELECT * FROM organizations WHERE email = $1', [targetOrgEmail]);
        results.organizations.target_email_found = targetOrg.length > 0;

        if (targetOrg.length > 0) {
            results.organizations.target_email_details = { id: targetOrg[0].id, name: targetOrg[0].name, slug: targetOrg[0].slug };
        }

        // Check for common slugs that might conflict
        const targetSlug = 'blendwit-tech'; // Guessing the slug based on email
        const targetOrgSlug = await dataSource.query('SELECT * FROM organizations WHERE slug = $1', [targetSlug]);
        results.organizations.target_slug_found = targetOrgSlug.length > 0;

    } catch (error: any) {
        results.connected = false;
        results.error = error.message;
    } finally {
        if (dataSource.isInitialized) await dataSource.destroy();

        fs.writeFileSync('scripts/diagnose-results.json', JSON.stringify(results, null, 2));
        console.log('Diagnosis complete. Results written to scripts/diagnose-results.json');
    }
}

diagnose();
