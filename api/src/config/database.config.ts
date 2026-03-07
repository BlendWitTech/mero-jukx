import { Injectable } from '@nestjs/common';
import { TypeOrmOptionsFactory, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import * as path from 'path';

@Injectable()
export class DatabaseConfig implements TypeOrmOptionsFactory {
  constructor(private configService: ConfigService) { }

  createTypeOrmOptions(): TypeOrmModuleOptions {
    return {
      type: 'postgres',
      host: this.configService.get<string>('DB_HOST', 'localhost'),
      port: this.configService.get<number>('DB_PORT', 5432),
      username: this.configService.get<string>('DB_USER', 'postgres'),
      password: this.configService.get<string>('DB_PASSWORD', 'postgres'),
      database: this.configService.get<string>('DB_NAME', 'mero_jugx'),
      entities: [
        path.join(__dirname, '../database/entities/**/*.entity{.ts,.js}'),
        path.join(__dirname, '../../marketplace/**/entities/**/*.entity{.ts,.js}')
      ],
      migrations: [__dirname + '/../database/migrations/**/[0-9]*-*.ts'],
      migrationsTableName: 'migrations',
      synchronize: false, // Always false when using migrations to avoid conflicts
      logging: this.configService.get<boolean>('DB_LOGGING', true),
      migrationsRun: false,
      autoLoadEntities: true,
      // Connection pooling for better performance
      extra: {
        max: this.configService.get<number>('DB_POOL_MAX', 20), // Maximum pool size
        min: this.configService.get<number>('DB_POOL_MIN', 5), // Minimum pool size
        idleTimeoutMillis: this.configService.get<number>('DB_POOL_IDLE_TIMEOUT', 30000), // 30 seconds
        connectionTimeoutMillis: this.configService.get<number>('DB_POOL_CONNECTION_TIMEOUT', 2000), // 2 seconds
        // Statement timeout (prevent long-running queries)
        statement_timeout: this.configService.get<number>('DB_STATEMENT_TIMEOUT', 30000), // 30 seconds
        // Query timeout
        query_timeout: this.configService.get<number>('DB_QUERY_TIMEOUT', 30000), // 30 seconds
        // Application name for monitoring
        application_name: 'mero-jugx-api',
      },
      // Enable query result caching (optional, can be enabled per query)
      // Note: Cache is disabled by default, enable per query using cache: true
      // cache: {
      //   type: 'redis',
      //   options: {
      //     host: this.configService.get<string>('REDIS_HOST', 'localhost'),
      //     port: this.configService.get<number>('REDIS_PORT', 6379),
      //     password: this.configService.get<string>('REDIS_PASSWORD', ''),
      //   },
      //   duration: this.configService.get<number>('DB_CACHE_DURATION', 30000), // 30 seconds
      //   ignoreErrors: true, // Don't fail if Redis is unavailable
      // },
    };
  }
}
