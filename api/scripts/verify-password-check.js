const bcrypt = require('bcrypt');
const { Client } = require('pg');

async function verify() {
    const client = new Client({
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
        database: process.env.DB_NAME || 'mero_jugx',
    });

    try {
        await client.connect();
        const res = await client.query("SELECT password_hash FROM users WHERE email = 'owner@blendwit.com'");
        if (res.rows.length === 0) {
            console.log("User not found");
            return;
        }

        const hash = res.rows[0].password_hash;
        console.log(`Current Hash in DB: ${hash}`);

        const testPasswords = ['Admin@123', 'admin@123', 'password123'];

        for (const pw of testPasswords) {
            const match = await bcrypt.compare(pw, hash);
            console.log(`Comparing with "${pw}": ${match ? 'MATCH' : 'NO MATCH'}`);
        }

    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

verify();
