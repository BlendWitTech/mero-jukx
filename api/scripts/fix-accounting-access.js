const { Client } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function fix() {
    const client = new Client({
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
        database: process.env.DB_NAME || 'mero_jugx',
    });

    try {
        await client.connect();

        // 1. Get all organizations with active Mero Accounting
        const apps = await client.query("SELECT id FROM apps WHERE slug = 'mero-accounting'");
        if (apps.rows.length === 0) {
            console.log('App mero-accounting not found');
            return;
        }
        const appId = apps.rows[0].id;
        console.log(`Mero Accounting App ID: ${appId}`);

        const orgRes = await client.query("SELECT organization_id FROM organization_apps WHERE (status = 'active' OR status = 'pending_payment') AND app_id = $1", [appId]);
        console.log(`\nFound ${orgRes.rows.length} active/trialing Mero Accounting subscriptions.`);

        for (const org of orgRes.rows) {
            const orgId = org.organization_id;
            console.log(`\nProcessing Org: ${orgId}`);

            const members = await client.query("SELECT user_id, role_id FROM organization_members WHERE organization_id = $1 AND status = 'active'", [orgId]);
            console.log(`  Org has ${members.rows.length} active members.`);

            for (const member of members.rows) {
                const userId = member.user_id;
                const roleId = member.role_id;
                const memberId = member.id || null;

                // Get user email for clarity
                const userRes = await client.query("SELECT email FROM users WHERE id = $1", [userId]);
                const email = userRes.rows[0]?.email || 'Unknown';

                // Check and grant access
                const accessExists = await client.query("SELECT id FROM user_app_access WHERE user_id = $1 AND organization_id = $2 AND app_id = $3", [userId, orgId, appId]);

                if (accessExists.rows.length === 0) {
                    console.log(`  Granting access to ${email} (ID: ${userId})`);
                    // Use the first member as the granter (self if it's the only one)
                    const granterId = members.rows[0].user_id;
                    await client.query("INSERT INTO user_app_access (id, user_id, organization_id, app_id, is_active, role_id, granted_by, member_id) VALUES (gen_random_uuid(), $1, $2, $3, true, $4, $5, $6)", [userId, orgId, appId, roleId, granterId, memberId]);
                } else {
                    console.log(`  ${email} (ID: ${userId}) already has access.`);
                }
            }
        }

    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await client.end();
    }
}

fix();
