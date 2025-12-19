import { registerAs } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { join } from 'path';

export default registerAs(
  'database',
  (): TypeOrmModuleOptions => ({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 5432,
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_DATABASE || 'constitution_app',
    entities: [join(__dirname, '..', '**', '*.entity{.ts,.js}')],
    migrations: [join(__dirname, '..', 'database', 'migrations', '*{.ts,.js}')],
    synchronize: process.env.NODE_ENV === 'development',
    logging:
      process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
    // Connection pooling configuration
    extra: {
      max: 100, // Maximum number of connections in pool
      connectionTimeoutMillis: 30000, // 30 seconds
      idleTimeoutMillis: 30000, // Close idle connections after 30s
    },
    // Performance settings
    retryAttempts: 3,
    retryDelay: 3000,
    // Cache configuration
    cache: {
      duration: 30000, // 30 seconds
      type: 'redis',
      options: {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT, 10) : 6379,
      },
    },
  }),
);
