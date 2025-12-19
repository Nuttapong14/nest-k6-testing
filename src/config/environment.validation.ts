import { plainToClass, Transform } from 'class-transformer';
import { IsString, IsNumber, IsOptional, IsBoolean, IsUrl, IsEnum, Min, Max, ValidateIf } from 'class-validator';

export enum Environment {
  DEVELOPMENT = 'development',
  STAGING = 'staging',
  PRODUCTION = 'production',
  TEST = 'test',
}

export class EnvironmentVariables {
  @IsEnum(Environment)
  NODE_ENV: Environment = Environment.DEVELOPMENT;

  @IsNumber()
  @Min(3000)
  @Max(9999)
  @Transform(({ value }) => parseInt(value))
  PORT: number = 3000;

  // Database Configuration
  @IsString()
  DB_HOST: string = 'localhost';

  @IsNumber()
  @Min(1)
  @Max(65535)
  @Transform(({ value }) => parseInt(value))
  DB_PORT: number = 5432;

  @IsString()
  DB_USERNAME: string = 'postgres';

  @IsString()
  DB_PASSWORD: string;

  @IsString()
  DB_DATABASE: string = 'constitution_app';

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(1000)
  @Transform(({ value }) => parseInt(value))
  DB_MAX_CONNECTIONS?: number = 100;

  // JWT Configuration
  @IsString()
  JWT_ACCESS_SECRET: string;

  @IsOptional()
  @IsString()
  JWT_ACCESS_EXPIRES_IN: string = '15m';

  @IsString()
  JWT_REFRESH_SECRET: string;

  @IsOptional()
  @IsString()
  JWT_REFRESH_EXPIRES_IN: string = '7d';

  @IsOptional()
  @IsString()
  JWT_ISSUER: string = 'constitution-app';

  @IsOptional()
  @IsString()
  JWT_AUDIENCE: string = 'constitution-app-users';

  // Redis Configuration
  @IsOptional()
  @IsString()
  REDIS_HOST: string = 'localhost';

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(65535)
  @Transform(({ value }) => parseInt(value))
  REDIS_PORT: number = 6379;

  @IsOptional()
  @IsString()
  REDIS_PASSWORD?: string;

  // CORS Configuration
  @IsOptional()
  @IsString()
  ALLOWED_ORIGINS?: string = 'http://localhost:3000,http://localhost:3001';

  // Security Configuration
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  ENABLE_API_KEY_AUTH?: boolean = false;

  // API Configuration
  @IsOptional()
  @IsString()
  API_PREFIX: string = 'api/v1';

  @IsOptional()
  @IsString()
  API_TITLE: string = 'Constitution App API';

  @IsOptional()
  @IsString()
  API_DESCRIPTION: string = 'API for Constitution Application';

  @IsOptional()
  @IsString()
  API_VERSION: string = '1.0.0';

  // Logging Configuration
  @IsOptional()
  @IsEnum(['error', 'warn', 'info', 'debug', 'verbose'])
  LOG_LEVEL: 'error' | 'warn' | 'info' | 'debug' | 'verbose' = 'info';

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  LOG_TO_FILE?: boolean = false;

  @IsOptional()
  @IsString()
  LOG_FILE_PATH?: string = './logs';

  // File Upload Configuration
  @IsOptional()
  @IsNumber()
  @Min(1024)
  @Max(10485760) // 10MB
  @Transform(({ value }) => parseInt(value))
  MAX_FILE_SIZE?: number = 5242880; // 5MB

  // Rate Limiting Configuration
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Transform(({ value }) => parseInt(value))
  RATE_LIMIT_TTL?: number = 900; // 15 minutes

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Transform(({ value }) => parseInt(value))
  RATE_LIMIT_MAX?: number = 1000;

  // Monitoring Configuration
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  ENABLE_METRICS?: boolean = false;

  @IsOptional()
  @IsString()
  METRICS_PATH?: string = '/metrics';

  // External Services
  @IsOptional()
  @IsUrl()
  PAYMENT_WEBHOOK_URL?: string;

  @IsOptional()
  @IsString()
  PAYMENT_API_KEY?: string;

  @IsOptional()
  @IsString()
  EMAIL_SERVICE_API_KEY?: string;

  @IsOptional()
  @IsUrl()
  EMAIL_SERVICE_URL?: string;

  // Feature Flags
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  ENABLE_CACHE?: boolean = true;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  ENABLE_SEARCH_INDEXING?: boolean = true;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  ENABLE_PERFORMANCE_MONITORING?: boolean = true;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  ENABLE_AUDIT_LOGGING?: boolean = false;

  // SSL Configuration
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  ENABLE_SSL?: boolean = false;

  @IsOptional()
  @IsString()
  SSL_CERT_PATH?: string;

  @IsOptional()
  @IsString()
  SSL_KEY_PATH?: string;

  // Backup Configuration
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  ENABLE_AUTO_BACKUP?: boolean = false;

  @IsOptional()
  @IsString()
  BACKUP_SCHEDULE?: string = '0 2 * * *'; // Daily at 2 AM

  @IsOptional()
  @IsString()
  BACKUP_PATH?: string = './backups';

  // Development/Testing Only
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  SWAGGER_ENABLED?: boolean = true;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  DEBUG_QUERIES?: boolean = false;

  @ValidateIf(o => o.NODE_ENV === Environment.TEST)
  @IsOptional()
  @IsString()
  TEST_DATABASE_URL?: string;
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToClass(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  // Custom validations
  const errors: string[] = [];

  // Ensure JWT secrets are provided in production
  if (validatedConfig.NODE_ENV === Environment.PRODUCTION) {
    if (!validatedConfig.JWT_ACCESS_SECRET || validatedConfig.JWT_ACCESS_SECRET.length < 32) {
      errors.push('JWT_ACCESS_SECRET must be at least 32 characters in production');
    }
    if (!validatedConfig.JWT_REFRESH_SECRET || validatedConfig.JWT_REFRESH_SECRET.length < 32) {
      errors.push('JWT_REFRESH_SECRET must be at least 32 characters in production');
    }
  }

  // Ensure database password is provided
  if (!validatedConfig.DB_PASSWORD) {
    errors.push('DB_PASSWORD is required');
  }

  // Check database URL format if provided
  if (validatedConfig.TEST_DATABASE_URL && !validatedConfig.TEST_DATABASE_URL.startsWith('postgres://')) {
    errors.push('TEST_DATABASE_URL must be a valid PostgreSQL connection string');
  }

  if (errors.length > 0) {
    throw new Error(`Configuration validation error: \n${errors.join('\n')}`);
  }

  return validatedConfig;
}