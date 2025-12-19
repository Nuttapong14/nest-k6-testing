# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Constitution Application - A NestJS-based API for managing constitutional principles, performance standards, governance rules, and payment processing. Features JWT authentication, PostgreSQL with TypeORM, Redis caching, and k6 load testing.

## Common Commands

### Development
```bash
# Install dependencies
npm install

# Start development server with hot reload
npm run start:dev

# Build for production
npm run build

# Start production server
npm run start:prod
```

### Testing
```bash
# Run all unit tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm run test -- path/to/file.spec.ts

# Run e2e tests
npm run test:e2e

# Run with coverage (requires 80% threshold)
npm run test:cov
```

### Database & Migrations
```bash
# Start PostgreSQL and Redis via Docker
npm run db:setup

# Generate a new migration based on entity changes
npm run typeorm:generate src/database/migrations/MigrationName

# Run pending migrations
npm run migration:run

# Revert last migration
npm run migration:revert

# Show migration status
npm run migration:show

# Drop all tables and rerun migrations
npm run db:reset
```

### Load Testing with k6
```bash
# Run individual load tests
npm run loadtest:auth
npm run loadtest:search
npm run loadtest:payment

# Run mixed workload test
npm run loadtest:mixed
```

### Code Quality
```bash
# Lint and auto-fix
npm run lint

# Format code
npm run format
```

## Architecture

### Module Structure
The application follows NestJS modular architecture with clear separation of concerns:

- **AuthModule**: JWT authentication with refresh tokens, role-based access control (RBAC), and user management
- **ConstitutionModule**: Constitutional principles with versioning support and related principle discovery
- **PerformanceModule**: Performance monitoring and metrics collection
- **GovernanceModule**: Governance rules, amendments, compliance checks, and voting system
- **SearchModule**: Full-text search with database indexing
- **PaymentModule**: Payment processing with webhook support
- **CommonModule**: Shared services (caching, health checks, query optimization)

### Key Services

**CacheService** (`src/common/services/cache.service.ts`):
- Redis-backed caching with tag-based invalidation
- Decorators: `@Cacheable()` and `@CacheInvalidator()`
- Methods: `get`, `set`, `del`, `getOrSet`, `invalidateByTag`, `warmUp`
- Connection pooling and automatic reconnection

**QueryOptimizerService** (`src/common/services/query-optimizer.service.ts`):
- Database query optimization and monitoring
- Slow query logging and analysis

**PerformanceLoggerService** (`src/common/services/performance-logger.service.ts`):
- Request/response performance tracking
- Metrics collection for monitoring

### Database Layer

**TypeORM Configuration** (`src/config/database.config.ts`):
- Connection pooling (max 100 connections, 30s timeout)
- Redis query caching (30s duration)
- Auto-synchronize in development only
- Migrations located in `src/database/migrations/`

**Entity Relationships**:
- `User` ↔ `UserRole` ↔ `Role` (many-to-many through join table)
- `Principle` → `PrincipleVersion` (one-to-many with versioning)
- `Amendment` → `AmendmentVote` (one-to-many)
- `ComplianceCheck` → `ComplianceIssue` (one-to-many)

### Authentication Flow

1. **Registration**: `/auth/register` → Creates user with bcrypt-hashed password
2. **Login**: `/auth/login` → Returns access token (15m) + refresh token (7d)
3. **Token Refresh**: `/auth/refresh` → Validates refresh token, issues new access token
4. **Protected Routes**: `@UseGuards(JwtAuthGuard)` + optional `@Roles()` decorator

JWT Strategies:
- `JwtStrategy`: Validates access tokens (15m expiry)
- `RefreshTokenStrategy`: Validates refresh tokens (7d expiry)

### Security Features

- **Global Validation**: `ValidationPipe` with `whitelist: true` and `forbidNonWhitelisted: true`
- **Global Exception Filter**: `HttpExceptionFilter` for standardized error responses
- **CORS**: Configurable origins via `CORS_ORIGIN` environment variable
- **Helmet**: Security headers (configured in main.ts)
- **Rate Limiting**: `@nestjs/throttler` (5 req/min for auth, 100 req/min for others)
- **Input Sanitization**: `SanitizationPipe` for HTML/SQL injection prevention

### Performance Targets

As defined in load tests (`tests/k6/`):
- **Authentication**: p95 < 100ms
- **Search**: p95 < 150ms
- **Payments**: p95 < 200ms
- **Error Rate**: < 10%

Load test stages:
1. Ramp up to 200 users (2m)
2. Sustained 500 users (5m)
3. Peak 1000 users (2m)
4. Ramp down (1m)

## API Documentation

Swagger/OpenAPI documentation available at `/api-docs` in development mode.

Tags: Authentication, Constitution, Performance, Governance, Search, Payments, Health

## Environment Configuration

Copy `.env.example` to `.env` and configure:

**Required**:
- `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_DATABASE`
- `JWT_SECRET`, `JWT_REFRESH_SECRET` (change in production!)
- `PORT`, `NODE_ENV`, `API_PREFIX`

**Optional**:
- `REDIS_HOST`, `REDIS_PORT` (defaults to localhost:6379)
- `CORS_ORIGIN` (comma-separated list)
- `RATE_LIMIT_TTL`, `RATE_LIMIT_MAX`
- `ENABLE_PERFORMANCE_MONITORING`, `ENABLE_REQUEST_LOGGING`

## Docker Services

`docker-compose.yml` provides:
- **PostgreSQL 15**: Port 5432, with healthchecks and persistent volume
- **Redis 7**: Port 6379, for caching
- **Postgres Exporter**: Port 9187, for Prometheus metrics

Network: `constitution-network` (bridge driver)

## Development Workflow

1. Start Docker services: `npm run db:setup`
2. Run migrations: `npm run migration:run`
3. Start dev server: `npm run start:dev`
4. Access Swagger docs: http://localhost:3000/api-docs
5. Run tests: `npm run test` and `npm run test:e2e`
6. Run load tests: `npm run loadtest:mixed`

## Important Patterns

### Creating New Entities
1. Define entity class with `@Entity()` decorator in `src/<module>/entities/`
2. Add relationships using TypeORM decorators
3. Generate migration: `npm run typeorm:generate src/database/migrations/EntityName`
4. Run migration: `npm run migration:run`

### Adding Cached Endpoints
```typescript
@Get()
@Cacheable({ ttl: 300, tags: ['resource'] })
async findAll() { ... }

@Post()
@CacheInvalidator({ tags: ['resource'] })
async create() { ... }
```

### Role-Based Access Control
```typescript
@Get()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'editor')
async adminOnly() { ... }
```

### Public Routes
```typescript
@Get()
@Public()
async publicEndpoint() { ... }
```

## Test Coverage Requirements

Global thresholds set at 80% for:
- Branches
- Functions
- Lines
- Statements

Coverage reports generated in `coverage/` directory.
