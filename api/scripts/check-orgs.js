const { Client } = require('pg');

async function checkOrgs() {
    const client = new Client({
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
        database: process.env.DB_NAME || 'mero_jugx',
    });

    try {
        await client.connect();

        // Find user
        const userRes = await client.query("SELECT id, email FROM users WHERE email = 'owner@blendwit.com'");
        if (userRes.rows.length === 0) {
            console.log("User not found");
            return;
        }
        const user = userRes.rows[0];
        console.log(`User: ${user.email} (ID: ${user.id})`);

        // Check memberships
        const memberRes = await client.query(`
      SELECT m.*, o.name as org_name, o.email as org_email
      FROM organization_members m
      JOIN organizations o ON m.organization_id = o.id
      WHERE m.user_id = $1
    `, [user.id]);

        console.log(`\nFound ${memberRes.rows.length} memberships:`);
        memberRes.rows.forEach(m => {
            console.log(`- Org: ${m.org_name} (${m.org_email}), Status: ${m.status}, Role ID: ${m.role_id}`);
        });

        // Check all organizations
        const allOrgsRes = await client.query("SELECT id, name, email FROM organizations");
        console.log(`\nTotal organizations in DB: ${allOrgsRes.rows.length}`);
        allOrgsRes.rows.forEach(o => {
            console.log(`- ${o.name} (${o.email})`);
        });

    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

checkOrgs();
