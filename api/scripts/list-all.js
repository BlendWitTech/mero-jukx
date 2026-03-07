const { Client } = require('pg');
const { config } = require('dotenv');
const path = require('path');

config({ path: path.resolve(__dirname, '../.env') });

async function listAll() {
    const dbConfig = {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
        database: 'mero_jugx',
    };

    const client = new Client(dbConfig);
    try {
        await client.connect();
        console.log('✅ Connected to mero_jugx');

        const usersRes = await client.query('SELECT id, email, first_name FROM users');
        console.log(`\nUsers (${usersRes.rows.length}):`);
        usersRes.rows.forEach(u => console.log(`  - ${u.email} (${u.first_name})`));

        const orgsRes = await client.query('SELECT id, email, name, org_type, parent_id FROM organizations');
        console.log(`\nOrganizations (${orgsRes.rows.length}):`);
        orgsRes.rows.forEach(o => console.log(`  - ${o.email} | ${o.name} | ${o.org_type} | Parent: ${o.parent_id}`));

    } catch (e) {
        console.log(`❌ Failed: ${e.message}`);
    } finally {
        await client.end();
    }
}

listAll();
