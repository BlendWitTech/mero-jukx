import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env.test — must happen before any NestJS module imports
const envPath = path.resolve(__dirname, '../../../../.env.test');
dotenv.config({ path: envPath });

// Ensure we never accidentally run against production DB
if (process.env.DB_NAME && !process.env.DB_NAME.includes('test')) {
  throw new Error(
    `SAFETY CHECK FAILED: DB_NAME is "${process.env.DB_NAME}" — tests must run against a database with "test" in the name. Check your .env.test file.`,
  );
}
