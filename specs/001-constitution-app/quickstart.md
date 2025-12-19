# Constitution Application Quickstart Guide

**Version**: 1.0.0
**Target**: nest-k6-testing Project
**Time to Setup**: ~30 minutes

## Prerequisites

- Node.js 20.x+
- Docker & Docker Compose
- k6 for load testing
- Basic knowledge of NestJS and PostgreSQL

## Quick Setup

### 1. Clone and Install Dependencies

```bash
# Clone the repository
git clone <repository-url>
cd nest-k6-testing

# Install dependencies
npm install

# Install development dependencies (optional)
npm install --dev
```

### 2. Configure Environment

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your configuration
vim .env
```

Required environment variables:
```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=password
DB_DATABASE=constitution_app

# Authentication
JWT_SECRET=your-super-secret-jwt-key
JWT_REFRESH_SECRET=your-refresh-secret-key
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=24h

# Application
PORT=3000
NODE_ENV=development
```

### 3. Start PostgreSQL with Docker Compose

```bash
# Start the database
docker-compose up -d postgres

# Wait for database to be ready
docker-compose logs -f postgres
```

### 4. Run Database Migrations

```bash
# Generate initial migration
npm run typeorm migration:generate -- -n InitialSetup

# Run migrations
npm run typeorm migration:run

# Verify database schema
npm run typeorm schema:log
```

### 5. Load Constitution Data

```bash
# Seed initial constitution data
npm run seed:constitution

# Verify data load
npm run constitution:validate
```

### 6. Start Development Server

```bash
# Start the application
npm run start:dev

# Application will be available at
# http://localhost:3000
```

## Verify Installation

### Health Check

```bash
# Check application health
curl http://localhost:3000/health

# Expected response:
{
  "status": "ok",
  "timestamp": "2025-12-17T...",
  "version": "1.0.0"
}
```

### Constitution Access

```bash
# Get all principles
curl http://localhost:3000/api/principles

# Search principles
curl "http://localhost:3000/api/principles/search?query=security"

# Get performance standards
curl http://localhost:3000/api/standards/performance
```

## Load Testing

### Run Basic Tests

```bash
# Install k6 if not already installed
npm install -g k6

# Run authentication load test
k6 run tests/load/authentication-load-test.js

# Run content retrieval test
k6 run tests/load/content-retrieval-load-test.js

# Run performance validation
k6 run tests/load/performance-benchmark.js
```

### Expected Performance Results

```bash
# Target performance metrics:
✅ Authentication: <100ms (95th percentile)
✅ Content Retrieval: <150ms (95th percentile)
✅ Search Operations: <200ms (95th percentile)
✅ Error Rate: <0.1%
```

## Development Workflow

### Adding New Constitution Principles

```bash
# Create new principle
curl -X POST http://localhost:3000/api/principles \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "title": "New Principle",
    "description": "Principle description...",
    "priority": 3,
    "metadata": {
      "category": "development",
      "tags": ["new", "feature"]
    }
  }'
```

### Updating Performance Standards

```bash
# Update performance standard
curl -X PUT http://localhost:3000/api/standards/performance/:id \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "targetResponseTime": 120,
    "metricType": "95th_percentile"
  }'
```

## Architecture Overview

### Key Components

```
src/
├── principles/          # Constitution principles management
├── standards/          # Performance and load standards
├── auth/              # JWT authentication
├── users/             # User management and roles
├── amendments/        # Constitution amendment process
├── compliance/        # Compliance tracking
└── governance/        # Governance rules
```

### Database Schema

The application uses PostgreSQL with TypeORM and includes:

- **Principles**: Core constitution principles with versioning
- **Performance Standards**: API performance metrics and targets
- **Load Test Requirements**: k6 testing configurations
- **Quality Gates**: Compliance checkpoints
- **Governance Rules**: Amendment and compliance rules

## Constitution Principles

### I. REST API First
- All endpoints follow RESTful principles
- OpenAPI/Swagger documentation
- Developer-friendly error messages

### II. Database Integration
- TypeORM for data operations
- Docker Compose for database management
- Version-controlled migrations

### III. Load Testing Discipline
- k6 load tests for all endpoints
- Performance targets defined upfront
- Tests must pass before deployment

### IV. Security by Default
- JWT authentication with refresh tokens
- Input validation at every layer
- Encrypted sensitive data

### V. Testing Coverage
- Unit tests with Jest (>80% coverage)
- Integration tests for all endpoints
- E2E tests for critical journeys

## Troubleshooting

### Common Issues

**Database Connection Error**
```bash
# Check PostgreSQL container
docker-compose ps

# View logs
docker-compose logs postgres

# Restart container
docker-compose restart postgres
```

**Migration Issues**
```bash
# Reset database
npm run typeorm schema:drop

# Recreate migrations
npm run typeorm migration:generate -- -n FreshSetup

# Run migrations again
npm run typeorm migration:run
```

**Authentication Issues**
```bash
# Get JWT token
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@constitution.com",
    "password": "password"
  }'

# Use token in subsequent requests
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/principles
```

## Performance Optimization

### Database Indexes

The application automatically creates indexes for:
- Principle search (full-text search)
- Performance standard queries
- Amendment status tracking
- Compliance check filtering

### Caching Strategy

- Redis for frequent queries (configurable)
- In-memory cache for session data
- Database query optimization

### Load Testing Configuration

```bash
# View k6 configuration
cat tests/load/config.js

# Customize load parameters
# VUS: Virtual Users
# DURATION: Test duration
# TARGETS: Performance thresholds
```

## Next Steps

1. **Explore the API**: Check `/api-docs` for OpenAPI documentation
2. **Customize Principles**: Add your organization's constitution principles
3. **Configure Performance**: Adjust performance standards for your use case
4. **Implement Load Tests**: Create k6 scripts for your specific endpoints
5. **Set up CI/CD**: Integrate load testing into your deployment pipeline

## Support

- **Documentation**: `/docs` directory
- **API Reference**: `/api-docs` (when running)
- **Issues**: GitHub issues for bug reports
- **Performance**: Monitor application metrics with built-in endpoints

---

**Remember**: All changes to the constitution must follow the amendment process defined in the governance rules.