import { ConfigService } from '@nestjs/config';
import { getTestDatabaseConfig } from './database.config';

// Set test environment variables
process.env.NODE_ENV = 'test';

// Override config for testing
const testConfig = {
  DB_HOST: process.env.TEST_DB_HOST || 'localhost',
  DB_PORT: process.env.TEST_DB_PORT || '5433',
  DB_USERNAME: process.env.TEST_DB_USERNAME || 'test',
  DB_PASSWORD: process.env.TEST_DB_PASSWORD || 'test',
  DB_DATABASE: process.env.TEST_DB_DATABASE || 'constitution_test',
  DB_SSL: 'false',
  JWT_SECRET: 'test-jwt-secret-key-for-testing-only',
  JWT_EXPIRES_IN: '15m',
  JWT_REFRESH_EXPIRES_IN: '7d',
  STRIPE_SECRET_KEY: 'sk_test_mock_key_for_testing',
  STRIPE_WEBHOOK_SECRET: 'whsec_mock_webhook_secret_for_testing',
};

// Set environment variables for tests
Object.entries(testConfig).forEach(([key, value]) => {
  if (!process.env[key]) {
    process.env[key] = value;
  }
});

// Global test timeout
jest.setTimeout(30000);

// Setup and teardown hooks
beforeAll(async () => {
  console.log('🚀 Setting up test environment...');
  console.log('Test database:', testConfig.DB_DATABASE);
});

afterAll(async () => {
  console.log('🧹 Cleaning up test environment...');
});

// Mock console methods to reduce noise in tests
if (process.env.NODE_ENV === 'test') {
  const originalConsole = { ...console };

  beforeAll(() => {
    console.log = jest.fn();
    console.info = jest.fn();
    console.warn = jest.fn();
    console.error = jest.fn();
  });

  afterAll(() => {
    console = originalConsole;
  });
}

// Global test utilities
global.createTestConfig = () => testConfig;
global.getTestDatabaseConfig = () => {
  const configService = new ConfigService();
  Object.entries(testConfig).forEach(([key, value]) => {
    configService.set(key, value);
  });
  return getTestDatabaseConfig(configService);
};