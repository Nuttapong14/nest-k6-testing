# K6 Load Testing Guide

Comprehensive guide to running load tests on the Constitution Application using k6. This document covers setup, test types, execution, monitoring, and result analysis.

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Quick Start](#quick-start)
4. [Test Types](#test-types)
5. [Running Tests](#running-tests)
6. [Performance Targets](#performance-targets)
7. [Monitoring & Visualization](#monitoring--visualization)
8. [Test Configuration](#test-configuration)
9. [Interpreting Results](#interpreting-results)
10. [Troubleshooting](#troubleshooting)
11. [Advanced Usage](#advanced-usage)

---

## Overview

This project includes a comprehensive load testing suite using [k6](https://k6.io/), a modern open-source load testing tool. k6 tests are written in JavaScript/ES6 and can simulate realistic user behavior across multiple API endpoints.

### Why k6?

- **Developer-friendly**: JavaScript syntax, familiar to most developers
- **Scalable**: Distributed load testing across multiple instances
- **Open-source**: No licensing costs
- **Cloud-ready**: k6 Cloud provides managed SaaS load testing
- **Real metrics**: Measure performance under realistic conditions

### What We Test

The Constitution Application test suite validates:

- **Authentication Flow**: Login, token refresh, access control
- **Data Operations**: CRUD operations on constitutional principles
- **Search Functionality**: Full-text search with filters
- **Governance**: Amendments, voting, compliance checks
- **Payment Processing**: Payment endpoints and webhooks
- **System Health**: Health checks and readiness probes
- **Mixed Workload**: Realistic user behavior patterns

---

## Prerequisites

### Required Software

1. **Node.js** (v20 or higher)
   ```bash
   node --version  # Should be v20.x or higher
   ```

2. **k6** (installed as npm dependency)
   ```bash
   npx k6 version  # Verify k6 is available
   ```

3. **Docker & Docker Compose** (for full monitoring stack)
   ```bash
   docker --version
   docker-compose --version
   ```

4. **Running Application**
   ```bash
   npm run start:dev
   # or
   npm run db:setup && npm run migration:run
   ```

5. **Database & Cache**
   ```bash
   npm run db:setup  # Starts PostgreSQL and Redis
   ```

### Test Users

The tests use pre-configured user accounts. Ensure these users exist:

- **Admin**: `admin@example.com` / `admin123`
- **Editor**: `editor@example.com` / `editor123`
- **User**: `user@example.com` / `user123`

These users are typically created during database initialization. If not present:

```bash
npm run seed:constitution  # Includes user creation
```

---

## Quick Start

### Option 1: Run a Quick Smoke Test (Fastest)

```bash
# 2-minute smoke test with 100 concurrent users
npm run loadtest:quick

# or directly with k6
npx k6 run tests/k6/quick-test-all.js
```

**Duration**: ~2 minutes
**Expected Output**: Pass/fail results with response time metrics

### Option 2: Run Individual Endpoint Tests

```bash
# Test authentication endpoints
npm run loadtest:auth

# Test search functionality
npm run loadtest:search

# Test payment processing
npm run loadtest:payment
```

**Duration**: Each test ~10 minutes
**Peak Users**: 200-1000 depending on test

### Option 3: Run Mixed Workload Test (Most Realistic)

```bash
# Realistic mixed endpoint test with 10K peak users
npm run loadtest:mixed
```

**Duration**: ~20 minutes
**Peak Users**: 10,000
**Realistic**: Simulates real user behavior across all endpoints

### Option 4: Run All Tests

```bash
# Runs all test suites sequentially
npm run loadtest:all
```

**Duration**: ~2 hours
**Comprehensive**: Tests every endpoint and workload pattern

---

## Test Types

### 1. Authentication Test (`auth-load-test.js`)

Tests the authentication system under load.

**What it tests**:
- User login endpoint (`POST /auth/login`)
- Token validation
- Error handling for invalid credentials
- Authentication response times

**Load profile**:
- 2 min ramp to 200 users
- 5 min sustained at 500 users
- 2 min ramp to 1000 users
- 1 min ramp down

**Performance targets**:
- 95th percentile response time: < 100ms
- Error rate: < 10%

**Command**:
```bash
npm run loadtest:auth
# or
npx k6 run tests/k6/auth-load-test.js
```

### 2. Constitution Test (`constitution-load-test.js`)

Tests CRUD operations on constitutional principles.

**What it tests**:
- Retrieve principles list
- Get single principle details
- Create new principles
- Update existing principles
- Delete principles

**Load profile**:
- Similar to auth test
- Balanced between read/write operations

**Performance targets**:
- GET response time (p95): < 150ms
- POST/PUT response time (p95): < 200ms
- Error rate: < 10%

**Command**:
```bash
npm run loadtest:constitution
```

### 3. Search Test (`search-load-test.js`)

Validates full-text search performance under load.

**What it tests**:
- Search with various query terms
- Pagination handling
- Filter application
- Search result accuracy

**Load profile**:
- 100-500 concurrent users
- Multiple search terms simultaneously

**Performance targets**:
- 95th percentile: < 150ms
- Error rate: < 10%

**Command**:
```bash
npm run loadtest:search
```

### 4. Payment Test (`payment-load-test.js`)

Tests payment processing endpoints.

**What it tests**:
- Payment initiation
- Payment status checks
- Webhook handling
- Error scenarios (insufficient funds, invalid cards)

**Load profile**:
- 100-300 concurrent users
- Mixed payment amounts and currencies

**Performance targets**:
- 95th percentile: < 200ms
- Error rate: < 5% (strict for payments)

**Command**:
```bash
npm run loadtest:payment
```

### 5. Governance Test (`governance-load-test.js`)

Tests governance and amendment management.

**What it tests**:
- Amendment proposals
- Voting mechanisms
- Compliance checks
- Amendment retrieval

**Load profile**:
- 100-400 concurrent users

**Performance targets**:
- 95th percentile: < 150ms
- Error rate: < 10%

**Command**:
```bash
npm run loadtest:governance
```

### 6. Performance Test (`performance-load-test.js`)

Tests performance monitoring endpoints.

**What it tests**:
- Performance metrics retrieval
- Metric aggregation
- Historical data queries

**Load profile**:
- 100-500 concurrent users

**Performance targets**:
- 95th percentile: < 150ms
- Error rate: < 10%

**Command**:
```bash
npm run loadtest:performance
```

### 7. Health Test (`health-load-test.js`)

Tests health check endpoints.

**What it tests**:
- System health status
- Database connectivity
- Redis connectivity
- Service readiness

**Load profile**:
- Light load (health checks are typically low-volume)
- 50-100 concurrent users

**Performance targets**:
- 95th percentile: < 50ms
- Error rate: < 1% (critical for health checks)

**Command**:
```bash
npm run loadtest:health
```

### 8. Mixed Workload Test (`mixed-workload-test.js`)

**Most realistic test** - simulates actual user behavior across all endpoints.

**What it tests**:
- All endpoints with realistic traffic distribution
- Auth: 15%
- Constitution: 15%
- Performance: 15%
- Governance: 15%
- Search: 15%
- Payment: 10%

**Load profile** (most aggressive):
- 2 min ramp to 1000 users
- 3 min sustained at 3000 users
- 5 min ramp to 7000 users
- 3 min peak at 10000 users
- 2 min scale down to 3000 users
- 1 min ramp down to 0

**Performance targets**:
- Overall p95: < 200ms
- Auth-specific p95: < 100ms
- Search-specific p95: < 150ms
- Payment-specific p95: < 200ms
- Error rate: < 5%

**Command**:
```bash
npm run loadtest:mixed
```

### 9. Quick Test (`quick-test-all.js`)

**For rapid feedback** - smoke test running 2 minutes total.

**What it tests**:
- All endpoint types (one request each per scenario)
- Basic connectivity
- Response structure validation

**Load profile**:
- 30s ramp to 50 users
- 60s sustained at 100 users
- 30s ramp down

**Performance targets**:
- p95: < 200ms
- Error rate: < 10%

**Command**:
```bash
npm run loadtest:quick
npx k6 run tests/k6/quick-test-all.js
```

---

## Running Tests

### Basic Execution

```bash
# Using npm scripts (recommended)
npm run loadtest:auth
npm run loadtest:mixed
npm run loadtest:all

# Using k6 directly
npx k6 run tests/k6/auth-load-test.js
npx k6 run tests/k6/mixed-workload-test.js
```

### With Custom Base URL

```bash
# Test against staging environment
BASE_URL=https://staging.api.example.com npm run loadtest:auth

# Test against production (use with caution!)
BASE_URL=https://api.example.com npx k6 run tests/k6/quick-test-all.js
```

### With Output Files

```bash
# Save results as JSON for analysis
npx k6 run tests/k6/mixed-workload-test.js \
  --out json=results/mixed-workload-$(date +%s).json

# View results
cat results/*.json | jq '.data.result'
```

### With Prometheus Integration

```bash
# Push metrics to Prometheus
npx k6 run tests/k6/mixed-workload-test.js \
  --out prometheus=http://localhost:9090/api/v1/write
```

### Verbose Output

```bash
# See detailed request/response information
npx k6 run tests/k6/quick-test-all.js --verbose

# Debug mode with even more detail
npx k6 run tests/k6/auth-load-test.js -v
```

### Dry Run (Validate Test Script)

```bash
# Check for syntax errors without running
npx k6 run tests/k6/mixed-workload-test.js --dry-run
```

---

## Performance Targets

### Global Performance Standards

These targets apply across all tests:

| Metric | Target | Details |
|--------|--------|---------|
| **Response Time (p95)** | < 200ms | 95% of requests complete within this time |
| **Response Time (p99)** | < 500ms | 99% of requests complete within this time |
| **Error Rate** | < 5-10% | Varies by test type |
| **Throughput** | 10,000+ req/min | Minimum sustainable throughput |
| **Peak Users** | 10,000 | Application should handle 10K concurrent users |

### Endpoint-Specific Targets

| Endpoint | p95 | p99 | Error Rate |
|----------|-----|-----|-----------|
| Authentication | < 100ms | < 250ms | < 10% |
| Search | < 150ms | < 300ms | < 10% |
| Payment | < 200ms | < 400ms | < 5% |
| Constitution | < 150ms | < 300ms | < 10% |
| Governance | < 150ms | < 300ms | < 10% |
| Performance Metrics | < 150ms | < 300ms | < 10% |
| Health Checks | < 50ms | < 100ms | < 1% |

### When to Investigate

- **p95 > target**: Check for slow database queries or backend processing
- **p99 > 2x p95**: Indicates occasional performance spikes
- **Error rate > 10%**: Check application logs for errors
- **Throughput < target**: May indicate resource bottlenecks

---

## Monitoring & Visualization

### Option 1: Console Output (Simplest)

k6 prints results to console automatically:

```bash
npm run loadtest:auth
```

Output includes:
- Real-time progress
- HTTP response metrics
- Custom metric values
- Pass/fail results
- Threshold violations

### Option 2: Full Monitoring Stack (Most Complete)

For comprehensive monitoring with Grafana dashboards:

```bash
# Start full stack: k6, app, PostgreSQL, Prometheus, Grafana
docker-compose -f tests/k6/docker-compose.k6.yml up

# In another terminal, run tests
npm run loadtest:mixed

# View Grafana: http://localhost:3001
# Default credentials: admin / admin
```

**What you'll see**:
- Real-time request metrics
- Response time distribution
- Error rate visualization
- Custom metric trends
- Resource utilization graphs
- Per-endpoint performance breakdowns

### Option 3: JSON Results Export

```bash
# Export to JSON for custom analysis
npx k6 run tests/k6/mixed-workload-test.js \
  --out json=results.json

# Parse with jq
jq '.data.result | group_by(.name) |
    map({name: .[0].name, avg: (map(.value) | add / length)})' \
    results.json
```

### Option 4: Cloud Results (k6 Cloud)

Register at https://cloud.k6.io and:

```bash
# Initialize cloud integration
npx k6 cloud auth

# Run and upload results
npx k6 cloud run tests/k6/mixed-workload-test.js

# View at: https://app.k6.io
```

---

## Test Configuration

### Understanding Load Stages

Each test defines load stages - the progression of virtual users over time:

```javascript
export let options = {
  stages: [
    { duration: '2m', target: 200 },  // Ramp up to 200 users over 2 min
    { duration: '5m', target: 500 },  // Scale to 500 users, sustain for 5 min
    { duration: '2m', target: 1000 }, // Ramp to 1000 users over 2 min
    { duration: '1m', target: 0 },    // Ramp down to 0 over 1 min
  ],
};
```

**Reading this**:
- Stage 1: Linear increase from current users to 200 users (2 minutes)
- Stage 2: Linear increase from 200 to 500, then sustain at 500 (5 minutes)
- Stage 3: Linear increase from 500 to 1000 (2 minutes)
- Stage 4: Linear decrease from 1000 to 0 (1 minute)
- **Total Duration**: 2 + 5 + 2 + 1 = 10 minutes

### Understanding Thresholds

Thresholds define pass/fail criteria:

```javascript
thresholds: {
  http_req_duration: ['p(95)<100'],     // 95% of requests < 100ms
  http_req_failed: ['rate<0.1'],         // Error rate < 10%
  auth_response_time: ['p(95)<100'],     // Custom metric threshold
}
```

If a threshold fails, k6 exits with non-zero status (useful for CI/CD).

### Custom Metrics

Tests use k6's built-in and custom metrics:

```javascript
// Built-in metrics (automatic)
// - http_req_duration: Request duration in milliseconds
// - http_req_failed: Number of failed requests
// - http_reqs: Total number of requests

// Custom metrics (defined in test)
export let errorRate = new Rate('errors');           // Error rate
export let authResponseTime = new Trend('auth_response_time'); // Response time trends
export let requestCounter = new Counter('total_requests');     // Request count
```

### Setup & Teardown Phases

Tests use k6's lifecycle phases:

```javascript
// Setup runs once before test
export function setup() {
  // Create test data, login, etc.
  return sharedData;  // Passed to each iteration
}

// Default function runs for each VU (virtual user)
export default function(data) {
  // Make requests using data
  // Measures are recorded automatically
}

// Teardown runs once after test
export function teardown(data) {
  // Cleanup, print summary
}
```

---

## Interpreting Results

### Console Output Example

```
     ✓ login status is 200
     ✓ login response time < 100ms
     ✓ login has access token

     checks.........................: 99.5% ✓ 5980 ✗ 30
     data_received..................: 1.2 MB
     data_sent.......................: 890 KB
     dropped_iterations.............: 0
     http_req_blocked...............: avg=5.32ms   min=1.24ms  med=2.98ms  max=145.3ms  p(90)=8.2ms  p(95)=10.5ms
     http_req_connecting............: avg=2.1ms    min=0s      med=0s      max=98.5ms   p(90)=0s     p(95)=0s
     http_req_duration..............: avg=45.23ms  min=8.5ms   med=42.1ms  max=198.3ms  p(90)=89.4ms p(95)=125.3ms
     http_req_failed................: 2.5% ✓ 150 ✗ 5850
     http_req_receiving.............: avg=1.3ms    min=0.2ms   med=1.1ms   max=8.2ms    p(90)=2.1ms  p(95)=3.2ms
     http_req_sending...............: avg=0.8ms    min=0.1ms   med=0.7ms   max=5.1ms    p(90)=1.2ms  p(95)=1.8ms
     http_req_tls_handshaking.......: avg=0s       min=0s      med=0s      max=0s       p(90)=0s     p(95)=0s
     http_req_waiting...............: avg=43.1ms   min=7.9ms   med=40.3ms  max=192.1ms  p(90)=87.2ms p(95)=122.5ms
     http_reqs.......................: 6000        100.85 req/sec
     iteration_duration.............: avg=52.1ms   min=12.3ms  med=48.9ms  max=205.2ms  p(90)=96.3ms p(95)=132.1ms
     iterations......................: 6000        100.85 1/sec
     vus.............................: 1           min=1       max=200
     vus_max..........................: 200

    ✓ performance_threshold_1 [PASSED]
    ✗ error_threshold [FAILED]: 3.2% errors (threshold was 2%)
```

### Key Metrics Explained

| Metric | Meaning | What to Watch |
|--------|---------|---------------|
| **checks** | Validation assertions | Higher ✓ is better. Each ✗ is a failed assertion |
| **http_req_duration** | Time for request+response | p(95) should meet targets |
| **http_req_failed** | Percent of requests with errors | Should be < 5-10% |
| **http_reqs** | Total requests completed | Shows throughput |
| **iterations** | VU script iterations | Each iteration = one user cycle |
| **vus** | Virtual users (concurrent) | Shows when peak is reached |

### Example Analysis

**Good Results**:
- checks: 99%+ ✓
- http_req_duration p(95): < 100ms ✓
- http_req_failed: 0.5% (within threshold) ✓
- All thresholds [PASSED] ✓

**Problematic Results**:
- checks: 85% ✓ (15% failures indicate bugs)
- http_req_duration p(95): 450ms (exceeds 150ms target)
- http_req_failed: 12% (exceeds 10% threshold)
- error_threshold [FAILED]

**Action Items**:
1. Review error logs: `grep ERROR logs/`
2. Check slow queries: `npm run schema:log`
3. Profile database: Check query execution times
4. Check resource usage: CPU, memory, connections
5. Review recent code changes

---

## Troubleshooting

### Test Won't Start

**Error**: `socket: connection refused`

**Solution**:
```bash
# Ensure application is running
npm run start:dev

# Or start database and app
npm run db:setup
npm run migration:run
npm run start:dev
```

### High Error Rate

**Error**: `http_req_failed: 15%` (threshold is 10%)

**Causes & Solutions**:

1. **Database connection limit reached**
   - Check: `psql -d constitution_db -c "SELECT count(*) FROM pg_stat_activity;"`
   - Solution: Increase pool size in `src/config/database.config.ts`

2. **Application out of memory**
   - Check: `npm start` logs for memory errors
   - Solution: Increase Node.js heap: `NODE_OPTIONS="--max-old-space-size=4096" npm run start:dev`

3. **Slow queries timing out**
   - Check: Enable slow query log in PostgreSQL
   - Solution: Add database indexes, optimize queries

4. **Test user doesn't exist**
   - Check: Verify test users are created
   - Solution: `npm run seed:constitution`

### Slow Response Times

**Issue**: `http_req_duration p(95): 450ms` (target is 150ms)

**Diagnosis**:

```bash
# 1. Check database query performance
npm run schema:log

# 2. Enable request logging
ENABLE_REQUEST_LOGGING=true npm run start:dev

# 3. Profile with monitoring
npm run loadtest:auth --verbose
```

**Common Causes**:
- Missing database indexes
- N+1 query problems
- Inefficient sorting/filtering
- Insufficient CPU/RAM

**Solutions**:
- Add indexes: `CREATE INDEX idx_name ON table(column);`
- Optimize queries: Use SELECT * sparingly
- Use caching: `@Cacheable()` decorator
- Increase resources: More CPU cores, more RAM

### Tests Hanging

**Issue**: Test runs but never completes

**Causes**:
1. Infinite loop in test script
2. Deadlock in database
3. Network connectivity issue

**Solution**:
```bash
# Run with timeout
timeout 300 npm run loadtest:auth

# Kill after 5 minutes if still running
```

### Memory Issues

**Error**: `FATAL ERROR: CALL_AND_RETRY_LAST Allocation failed`

**Solution**:
```bash
# Increase Node.js memory
export NODE_OPTIONS="--max-old-space-size=4096"
npm run loadtest:mixed

# Or permanently in .env
NODE_OPTIONS="--max-old-space-size=4096"
```

### Database Locks

**Error**: Tests hang or timeout on CREATE/UPDATE operations

**Solution**:
```bash
# Check for locks
psql -d constitution_db -c "SELECT * FROM pg_locks WHERE NOT granted;"

# Kill blocking session
psql -d constitution_db -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'constitution_db' AND state = 'active';"
```

### Port Already in Use

**Error**: `Error: listen EADDRINUSE: address already in use :::3000`

**Solution**:
```bash
# Find process using port 3000
lsof -i :3000

# Kill it
kill -9 <PID>

# Or use different port
PORT=3001 npm run start:dev
```

---

## Advanced Usage

### Environment-Specific Tests

```bash
# Test different environments
BASE_URL=http://localhost:3000 npm run loadtest:auth      # Local
BASE_URL=https://staging.api.example.com npm run loadtest:auth  # Staging
BASE_URL=https://prod.api.example.com npm run loadtest:quick    # Prod (quick test only!)
```

### Custom Test with k6 CLI

```bash
# Run with custom vus and duration
npx k6 run tests/k6/auth-load-test.js \
  --vus 500 \
  --duration 10m

# Run with custom thresholds
npx k6 run tests/k6/auth-load-test.js \
  --threshold 'http_req_duration{staticAsset:yes}<500' \
  --threshold 'http_req_duration{staticAsset:no}<200'

# Run with stages defined on CLI
npx k6 run tests/k6/quick-test-all.js \
  --stage 1m:10 \
  --stage 3m:100 \
  --stage 1m:0
```

### Distributed Testing

For testing larger scale, k6 Enterprise allows distributed load generation. Contact k6 sales for details.

### Integration with CI/CD

**GitHub Actions Example**:

```yaml
name: Load Tests
on: [push]
jobs:
  load-test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '20'
      - run: npm install
      - run: npm run db:setup
      - run: npm run start:dev &
      - run: npm run loadtest:quick
```

### Performance Optimization Tips

1. **Database Connection Pooling**: Increase in config
2. **Add Caching Layer**: Use Redis `@Cacheable()` decorator
3. **Optimize Queries**: Use database indexes, select specific columns
4. **Rate Limiting**: Consider adjusting for load tests
5. **Vertical Scaling**: More CPU/RAM for the application
6. **Horizontal Scaling**: Multiple application instances

### Generating Custom Reports

```bash
# Export results to JSON
npx k6 run tests/k6/mixed-workload-test.js \
  --out json=results.json

# Parse and generate HTML report
npm install k6-html-reporter

k6-html-reporter --input results.json --output report.html

# Open report
open report.html
```

### Scripting Load Tests

```bash
#!/bin/bash
# run-all-tests.sh

for test in auth constitution search payment governance performance health; do
  echo "Running $test test..."
  npm run loadtest:$test || exit 1
  sleep 5  # Wait between tests
done

echo "All tests completed!"
```

---

## Next Steps

1. **Run your first test**: `npm run loadtest:quick`
2. **Review results**: Check p95 response times and error rates
3. **Set baseline**: Record current performance metrics
4. **Run regularly**: Include in your CI/CD pipeline
5. **Optimize**: Address any thresholds that are failing
6. **Monitor**: Use Grafana for continuous performance tracking
7. **Load test on code changes**: Before merging to main branch

## Resources

- [k6 Documentation](https://k6.io/docs/)
- [k6 Best Practices](https://k6.io/docs/using-k6/best-practices/)
- [k6 Script Examples](https://github.com/k6io/k6/tree/master/samples)
- [NestJS Performance Guide](https://docs.nestjs.com/techniques/performance)
- [PostgreSQL Query Optimization](https://www.postgresql.org/docs/current/performance.html)

## Support

For issues or questions:

1. Check the [Troubleshooting](#troubleshooting) section
2. Review k6 logs: `npm run loadtest:auth 2>&1 | tee loadtest.log`
3. Check application logs: `npm run start:dev 2>&1 | grep ERROR`
4. Open a GitHub issue with test results and environment details
