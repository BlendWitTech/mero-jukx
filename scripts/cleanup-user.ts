import { DataSource } from 'typeorm';
import { config } from 'dotenv';

// Load environment variables
config();

async function cleanup() {
    console.log('🧹 Cleanup User Script');

    const dbConfig = {
        type: 'postgres',
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        username: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
        database: process.env.DB_NAME || 'mero_jugx',
    };

    const dataSource = new DataSource({
        ...dbConfig,
        type: 'postgres',
        ssl: false,
    });

    try {
        await dataSource.initialize();
        console.log('✅ Connected to database.');

        const email = 'owner@blendwit.com';
        const user = await dataSource.query('SELECT * FROM users WHERE email = $1', [email]);

        if (user.length > 0) {
            console.log(`found user ${email}, deleting...`);
            await dataSource.query('DELETE FROM users WHERE email = $1', [email]);
            console.log(`✅ User ${email} deleted successfully.`);
        } else {
            console.log(`ℹ️ User ${email} not found.`);
        }

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        if (dataSource.isInitialized) await dataSource.destroy();
    }
}

cleanup();
