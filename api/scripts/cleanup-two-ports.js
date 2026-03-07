const { Client } = require('pg');
const { config } = require('dotenv');
const path = require('path');

// Load environment variables
config({ path: path.resolve(__dirname, '../.env') });

async function checkPort(port) {
    console.log(`\n--- Checking port ${port} ---`);
    const dbConfig = {
        host: process.env.DB_HOST || 'localhost',
        port: port,
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
        database: process.env.DB_NAME || 'mero_jugx',
    };

    const client = new Client(dbConfig);
    try {
        await client.connect();
        console.log(`✅ Connected to port ${port}`);

        const orgEmail = 'blendwittech@gmail.com';
        const userEmail = 'owner@blendwit.com';

        const orgRes = await client.query('SELECT id, name, email FROM organizations WHERE email = $1', [orgEmail]);
        console.log(`Org '${orgEmail}': found ${orgRes.rows.length}`);
        if (orgRes.rows.length > 0) {
            console.log('Orgs:', orgRes.rows);
            await client.query('DELETE FROM organizations WHERE email = $1', [orgEmail]);
            console.log('✅ Deleted org');
        }

        const userRes = await client.query('SELECT id, email FROM users WHERE email = $1', [userEmail]);
        console.log(`User '${userEmail}': found ${userRes.rows.length}`);
        if (userRes.rows.length > 0) {
            console.log('Users:', userRes.rows);
            await client.query('DELETE FROM users WHERE email = $1', [userEmail]);
            console.log('✅ Deleted user');
        }

        // List some other orgs just in case
        const someOrgs = await client.query('SELECT name, email FROM organizations LIMIT 5');
        console.log('Some orgs in this DB:', someOrgs.rows);

    } catch (e) {
        console.log(`❌ Failed on port ${port}: ${e.message}`);
    } finally {
        await client.end();
    }
}

async function run() {
    await checkPort(5432);
    await checkPort(5433);
}

run();
