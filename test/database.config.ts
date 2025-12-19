import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';

export const getTestDatabaseConfig = (
  configService: ConfigService,
): TypeOrmModuleOptions => ({
  type: 'postgres',
  host: configService.get('DB_HOST') || 'localhost',
  port: configService.get('DB_PORT') ? parseInt(configService.get('DB_PORT')) : 5433,
  username: configService.get('DB_USERNAME') || 'test',
  password: configService.get('DB_PASSWORD') || 'test',
  database: configService.get('DB_DATABASE') || 'constitution_test',
  entities: [__dirname + '/../src/**/*.entity{.ts,.js}'],
  synchronize: false, // Use migrations in test
  migrationsRun: true,
  migrations: [__dirname + '/../src/**/migrations/*.ts'],
  logging: false, // Disable logging in tests
  dropSchema: true, // Drop schema after each test run
  ssl: configService.get('DB_SSL') === 'true',
  extra: {
    connectionLimit: 10, // Lower connection limit for tests
  },
});

export const createTestDatabase = async (): Promise<void> => {
  // This function could be used to create a test database
  // For now, we rely on the test configuration above
  console.log('Test database configuration ready');
};

export const cleanupTestDatabase = async (): Promise<void> => {
  // This function could be used to cleanup the test database
  // For now, we rely on the dropSchema option
  console.log('Test database cleanup complete');
};