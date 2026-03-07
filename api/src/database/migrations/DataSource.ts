import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import * as path from 'path';

// Load environment variables
// Load environment variables from project root
config({ path: path.join(__dirname, '../../../../.env') });

console.log('DataSource Config:', {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  db: process.env.DB_NAME,
  cwd: process.cwd(),
  envPath: path.join(__dirname, '../../../../.env')
});

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'mero_jugx',
  entities: [
    // core database entities
    path.join(__dirname, '../entities/**/*.entity{.ts,.js}'),
    // marketplace shared mero-board entities (moved under api/marketplace)
    path.join(__dirname, '../../../marketplace/shared/mero-board/entities/**/*.entity{.ts,.js}'),
    // historic path kept for compatibility (if any apps/ folder exists)
    path.join(__dirname, '../../../apps/marketplace/shared/mero-board/backend/entities/**/*.entity{.ts,.js}'),
    // additional marketplace modules
    path.join(__dirname, '../../../marketplace/organization/mero-inventory/src/entities/**/*.entity{.ts,.js}'),
  ],
  migrations: [path.join(__dirname, '**/[0-9]*-*{.ts,.js}')],
  migrationsTableName: 'migrations',
  synchronize: false,
  logging: true,
});
