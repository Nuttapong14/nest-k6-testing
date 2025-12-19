# Seed Data Migration Guide

## Overview

The seed migration (`1765970827000-SeedInitialData.ts`) populates the database with **28 test records** across 7 main entity tables for API testing and development.

## What's Included

### Summary
- **4 Roles**: admin, editor, viewer, qa
- **5 Users**: Test users with different roles
- **5 User-Role Assignments**: Linking users to their roles
- **5 Principles**: Constitutional principles with metadata
- **3 Performance Standards**: Auth, search, and payment targets
- **3 Governance Rules**: Amendment, compliance, and enforcement rules
- **3 Amendments**: Different statuses (under_review, approved, rejected)

**Total: 28 records**

## Test User Credentials

All test users have the same password: `Test1234!`

| Email | Name | Role | Description |
|-------|------|------|-------------|
| admin@constitution.app | Alice Administrator | admin | Full system access |
| editor@constitution.app | Bob Editor | editor | Can create/edit content |
| viewer@constitution.app | Charlie Viewer | viewer | Read-only access |
| qa@constitution.app | Diana QA Engineer | qa | Testing permissions |
| dev@constitution.app | Evan Developer | editor | Development access |

## Running the Migration

### Apply Seed Data
```bash
npm run migration:run
```

### Remove Seed Data
```bash
npm run migration:revert
```

### Verify Data
```bash
# Check record counts
docker exec constitution-postgres psql -U postgres -d constitution_app -c "
  SELECT COUNT(*) as total_count, 'users' as table_name FROM users
  UNION ALL SELECT COUNT(*), 'roles' FROM roles
  UNION ALL SELECT COUNT(*), 'principles' FROM principles
  ORDER BY table_name;"

# View sample users
docker exec constitution-postgres psql -U postgres -d constitution_app -c "
  SELECT email, name FROM users LIMIT 5;"

# View principles
docker exec constitution-postgres psql -U postgres -d constitution_app -c "
  SELECT slug, title, priority FROM principles ORDER BY priority;"
```

## Data Details

### Roles
1. **admin**: Full permissions including user/role management, amendment approval
2. **editor**: Create and edit content, propose amendments
3. **viewer**: Read-only access to all content
4. **qa**: Testing permissions, performance monitoring, compliance checks

### Principles
1. **api-performance**: API Performance Excellence (priority 1)
   - Tags: api, latency, optimization
   - Category: performance

2. **security-first**: Security First Approach (priority 1)
   - Tags: authentication, encryption, data-protection
   - Category: security

3. **horizontal-scalability**: Horizontal Scalability (priority 2)
   - Tags: scalability, distributed-systems, load-balancing
   - Category: architecture

4. **system-reliability**: System Reliability & Fault Tolerance (priority 1)
   - Tags: availability, fault-tolerance, error-handling
   - Category: reliability

5. **test-automation**: Comprehensive Test Automation (priority 3)
   - Tags: testing, automation, ci-cd
   - Category: quality

### Performance Standards
1. **Authentication**: p95 < 100ms @ 500 users (error rate < 0.1%)
2. **Search**: p95 < 150ms @ 1000 users (error rate < 0.1%)
3. **Payment**: p95 < 200ms @ 200 users (error rate < 0.01%)

### Governance Rules
1. **Security Amendment Approval**: 3 required votes, 5 business day voting period
2. **Performance Monitoring Compliance**: Prometheus metrics, Grafana dashboards
3. **Deployment Rollback Enforcement**: Automatic rollback at >1% error rate

### Amendments
1. **Reduce Authentication Response Time** (under_review)
   - Proposed: 5 days ago
   - Voting ends: in 3 days
   - Target: 100ms → 75ms

2. **Add Code Quality Gate** (approved)
   - Implemented: 2 days ago
   - ESLint and Prettier enforcement

3. **Remove Deprecated API Versioning** (rejected)
   - Proposed: 30 days ago
   - Rejected: 23 days ago

## Testing Endpoints

### Authentication
```bash
# Login as admin
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@constitution.app",
    "password": "Test1234!"
  }'

# Login as editor
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "editor@constitution.app",
    "password": "Test1234!"
  }'
```

### GET Endpoints
```bash
# Get all principles
curl http://localhost:3000/api/constitution/principles

# Get all principles with pagination
curl "http://localhost:3000/api/constitution/principles?page=1&limit=10"

# Get all performance standards
curl http://localhost:3000/api/performance/standards

# Get all governance rules
curl http://localhost:3000/api/governance/rules

# Get all amendments
curl http://localhost:3000/api/governance/amendments
```

### Protected Endpoints (Requires Authentication)
```bash
# Get auth token first
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@constitution.app", "password": "Test1234!"}' \
  | jq -r '.accessToken')

# Use token for protected endpoints
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/auth/profile

# Admin-only endpoint
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/governance/amendments
```

## Use Cases

### Development
- Quickly populate database for local development
- Test authentication flows with different role levels
- Verify pagination and filtering functionality
- Test related entity queries (principles → performance standards)

### Load Testing
- Provide baseline data for k6 load tests
- Test search endpoints with realistic data
- Verify performance against defined standards
- Test concurrent user scenarios

### E2E Testing
- Seed data for automated test suites
- Consistent test data across environments
- Test role-based access control (RBAC)
- Verify amendment voting workflows

## Migration Behavior

### Up Migration
1. Hashes passwords using bcrypt (10 rounds)
2. Generates UUIDs for all entities
3. Inserts roles first and captures auto-generated IDs
4. Creates users with realistic timestamps
5. Links users to roles via user_roles table
6. Creates principles with full metadata
7. Links performance standards to principles
8. Links governance rules to principles
9. Creates amendments with different statuses

### Down Migration
1. Deletes in reverse order to handle foreign keys
2. Uses unique identifiers (emails, slugs, titles)
3. Cascade deletes handle related records
4. Validates complete removal with confirmation message

## Best Practices

1. **Run in Development Only**: This is test data, not for production
2. **Reset Between Tests**: Use `migration:revert` then `migration:run` for clean state
3. **Check Data After Migration**: Verify counts match expected totals (28 records)
4. **Customize as Needed**: Fork migration for project-specific test data
5. **Document Changes**: Update this README if you modify seed data

## Troubleshooting

### Migration Fails
- Check Docker containers are running: `docker ps`
- Verify database exists: `DB_DATABASE=constitution_app`
- Check database connection in `.env` file
- Review migration logs for specific errors

### Data Not Appearing
- Verify migration ran successfully: `npm run migration:show`
- Check database directly with psql commands
- Confirm no application caching issues
- Check entity relationships are correct

### Rollback Issues
- Ensure foreign key cascade deletes are working
- Check no manual data was added that conflicts
- Verify unique constraints (emails, slugs) match seed data
- Review down migration queries for correctness

## Additional Notes

- Password hashing happens during migration, not at runtime
- UUIDs are generated fresh each time migration runs
- Timestamps use relative intervals (NOW() - INTERVAL '5 days')
- All data is realistic and suitable for API documentation
- Role IDs are auto-assigned and mapped dynamically
