const { Client } = require('pg');
const { config } = require('dotenv');
const path = require('path');

config({ path: path.resolve(__dirname, '../.env') });

async function listDbs() {
    const dbConfig = {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
        database: 'postgres', // Connect to default postgres db to list others
    };

    const client = new Client(dbConfig);
    try {
        await client.connect();
        console.log('✅ Connected to postgres server');

        const res = await client.query('SELECT datname FROM pg_database WHERE datistemplate = false');
        console.log('Databases found:', res.rows.map(r => r.datname).join(', '));

        for (const dbName of res.rows.map(r => r.datname)) {
            if (dbName === 'postgres') continue;
            console.log(`\nChecking DB: ${dbName}`);
            const dbClient = new Client({ ...dbConfig, database: dbName });
            try {
                await dbClient.connect();
                const orgs = await dbClient.query("SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'organizations'");
                if (parseInt(orgs.rows[0].count) > 0) {
                    const countRes = await dbClient.query('SELECT COUNT(*) FROM organizations');
                    console.log(`  - Found 'organizations' table with ${countRes.rows[0].count} rows.`);
                    if (parseInt(countRes.rows[0].count) > 0) {
                        const samples = await dbClient.query('SELECT email FROM organizations LIMIT 3');
                        console.log('  - Sample orgs:', samples.rows.map(r => r.email).join(', '));
                    }
                } else {
                    console.log(`  - No 'organizations' table found.`);
                }
            } catch (e) {
                console.log(`  - Error checking ${dbName}: ${e.message}`);
            } finally {
                await dbClient.end();
            }
        }

    } catch (e) {
        console.log(`❌ Failed: ${e.message}`);
    } finally {
        await client.end();
    }
}

listDbs();
