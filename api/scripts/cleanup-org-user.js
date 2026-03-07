const { Client } = require('pg');
const { config } = require('dotenv');
const path = require('path');

// Load environment variables from .env file
config({ path: path.resolve(__dirname, '../.env') });

async function cleanup() {
    console.log('🧹 Cleanup Organization and User Script (JS)');

    const client = new Client({
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
        database: process.env.DB_NAME || 'mero_jugx',
    });

    try {
        await client.connect();
        console.log('✅ Connected to database.');

        const email = 'owner@blendwit.com';
        const orgEmail = 'blendwittech@gmail.com';

        // 1. Delete User if exists
        const userRes = await client.query('SELECT * FROM users WHERE email = $1', [email]);
        if (userRes.rows.length > 0) {
            console.log(`found user ${email}, deleting...`);
            await client.query('DELETE FROM users WHERE email = $1', [email]);
            console.log(`✅ User ${email} deleted successfully.`);
        } else {
            console.log(`ℹ️ User ${email} not found.`);
        }

        // 2. Delete Organization if exists
        const orgRes = await client.query('SELECT * FROM organizations WHERE email = $1', [orgEmail]);
        if (orgRes.rows.length > 0) {
            console.log(`found organization ${orgEmail}, deleting...`);
            // Cascade delete might be needed if there are other tables linking to org, 
            // but let's try direct delete first. If foreign key constraints fail, we'll know.
            try {
                await client.query('DELETE FROM organizations WHERE email = $1', [orgEmail]);
                console.log(`✅ Organization ${orgEmail} deleted successfully.`);
            } catch (e) {
                console.error(`❌ Failed to delete organization: ${e.message}`);
                // If manual deletion fails due to FK, we might need a more aggressive cleanup
                // or just advise user to use reset-db (which drops schemas)
            }
        } else {
            console.log(`ℹ️ Organization ${orgEmail} not found.`);
        }

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await client.end();
    }
}

cleanup();
