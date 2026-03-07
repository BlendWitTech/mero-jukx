const { Client } = require('pg');
require('dotenv').config();

async function checkUser(email) {
    const client = new Client({
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
        database: process.env.DB_NAME || 'mero_jugx',
    });

    try {
        await client.connect();
        console.log(`Checking user with email: "${email}"`);

        const res = await client.query('SELECT id, email, "password_hash", status, "email_verified", "is_system_admin" FROM users WHERE email = $1', [email]);

        if (res.rows.length === 0) {
            console.log('User not found with exact email match.');

            // Try case-insensitive search
            const resLower = await client.query('SELECT email FROM users WHERE LOWER(email) = LOWER($1)', [email]);
            if (resLower.rows.length > 0) {
                console.log('Found users with same email but different casing:');
                resLower.rows.forEach(r => console.log(`  - "${r.email}"`));
            } else {
                console.log('No user found even with case-insensitive search.');
            }
        } else {
            const user = res.rows[0];
            console.log('User found:');
            console.log(`  ID: ${user.id}`);
            console.log(`  Email: "${user.email}"`);
            console.log(`  Has Password Hash: ${!!user.password_hash}`);
            console.log(`  Status: ${user.status}`);
            console.log(`  Email Verified: ${user.email_verified}`);
            console.log(`  Is System Admin: ${user.is_system_admin}`);
        }

    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await client.end();
    }
}

// Check with the email the user likely used
checkUser('owner@blendwit.com');
