const { Client } = require('pg');
require('dotenv').config();

async function diagnose() {
    const client = new Client({
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
        database: process.env.DB_NAME || 'mero_jugx',
    });

    try {
        await client.connect();

        // 1. Get apps
        const appsRes = await client.query('SELECT id, name, slug FROM apps');
        console.log('Available Apps:');
        appsRes.rows.forEach(app => console.log(`  - ${app.name} (ID: ${app.id}, Slug: ${app.slug})`));

        const accountingApp = appsRes.rows.find(a => a.slug === 'mero-accounting');

        // 2. Get recent payments
        const paymentsRes = await client.query('SELECT id, amount, status, gateway, payment_type, metadata, created_at FROM payments ORDER BY created_at DESC LIMIT 5');
        console.log('\nRecent Payments:');
        paymentsRes.rows.forEach(p => console.log(`  - ID: ${p.id}, Status: ${p.status}, Amount: ${p.amount}, Type: ${p.payment_type}, Metadata: ${JSON.stringify(p.metadata)}`));

        // 3. Get UserAppAccess for mero-accounting
        if (accountingApp) {
            const accessRes = await client.query('SELECT * FROM user_app_access WHERE app_id = $1', [accountingApp.id]);
            console.log(`\nUser App Access for ${accountingApp.name}:`);
            accessRes.rows.forEach(a => console.log(`  - User: ${a.user_id}, Org: ${a.organization_id}, Active: ${a.is_active}`));
        }

        // 4. Get OrganizationApps
        if (accountingApp) {
            const orgAppsRes = await client.query('SELECT * FROM organization_apps WHERE app_id = $1', [accountingApp.id]);
            console.log(`\nOrganization Subscriptions for ${accountingApp.name}:`);
            orgAppsRes.rows.forEach(oa => console.log(`  - Org: ${oa.organization_id}, Status: ${oa.status}, Expires: ${oa.expires_at}`));
        }

    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await client.end();
    }
}

diagnose();
