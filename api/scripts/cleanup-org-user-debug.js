const { Client } = require('pg');
const { config } = require('dotenv');
const path = require('path');

// Load environment variables from .env file
const envPath = path.resolve(__dirname, '../.env');
console.log(`Loading .env from: ${envPath}`);
const result = config({ path: envPath });
if (result.error) {
    console.error('Error loading .env file:', result.error);
}

async function debugCleanup() {
    console.log('🔍 Debug Cleanup Script');

    const dbConfig = {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
        database: process.env.DB_NAME || 'mero_jugx',
    };

    console.log('Database Config:', { ...dbConfig, password: '****' });

    const client = new Client(dbConfig);

    try {
        await client.connect();
        console.log('✅ Connected to database.');

        // List tables to ensure we are in the right DB
        const tablesRes = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            LIMIT 5
        `);
        console.log('Tables found:', tablesRes.rows.map(r => r.table_name).join(', '));

        const orgEmail = 'blendwittech@gmail.com';

        // Check for specific organization
        const orgRes = await client.query('SELECT id, name, email FROM organizations WHERE email = $1', [orgEmail]);
        console.log(`Organization query for '${orgEmail}' returned ${orgRes.rows.length} rows.`);

        if (orgRes.rows.length > 0) {
            console.log('Found orgs:', orgRes.rows);
            // Delete it
            console.log(`Deleting organization...`);
            await client.query('DELETE FROM organizations WHERE email = $1', [orgEmail]);
            console.log(`✅ Organization ${orgEmail} deleted successfully.`);
        } else {
            // List ALL organizations to see what's there
            const allOrgs = await client.query('SELECT id, name, email FROM organizations LIMIT 10');
            console.log('First 10 organizations in DB:', allOrgs.rows);
        }

        // Check for user
        const userEmail = 'owner@blendwit.com';
        const userRes = await client.query('SELECT id, email FROM users WHERE email = $1', [userEmail]);
        console.log(`User query for '${userEmail}' returned ${userRes.rows.length} rows.`);

        if (userRes.rows.length > 0) {
            console.log('Found user:', userRes.rows);
            console.log(`Deleting user...`);
            await client.query('DELETE FROM users WHERE email = $1', [userEmail]);
            console.log(`✅ User ${userEmail} deleted successfully.`);
        }

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await client.end();
    }
}

debugCleanup();
