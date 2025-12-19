# K6 Load Testing - Quick Reference

Quick lookup guide for common k6 commands and scenarios.

## Start Here

**First time?** Run the 2-minute smoke test:
```bash
npm run loadtest:quick
```

## Common Commands

### Run Tests
```bash
# Smoke test (2 min, 100 users)
npm run loadtest:quick

# Specific endpoints
npm run loadtest:auth        # Authentication
npm run loadtest:search      # Search functionality
npm run loadtest:payment     # Payment processing
npm run loadtest:constitution  # Constitutional principles
npm run loadtest:governance  # Governance rules
npm run loadtest:performance # Performance metrics
npm run loadtest:health      # Health checks

# Realistic mixed workload (20 min, 10K peak users)
npm run loadtest:mixed

# All tests (2 hours)
npm run loadtest:all
```

### Test Against Different Servers
```bash
BASE_URL=http://localhost:3000 npm run loadtest:auth
BASE_URL=https://staging.api.example.com npm run loadtest:auth
BASE_URL=https://prod.api.example.com npm run loadtest:quick  # Quick only!
```

### Direct k6 Commands
```bash
# Run test directly
npx k6 run tests/k6/auth-load-test.js

# Dry run (check for errors without running)
npx k6 run tests/k6/auth-load-test.js --dry-run

# Verbose output (more details)
npx k6 run tests/k6/quick-test-all.js --verbose

# With custom vus and duration
npx k6 run tests/k6/auth-load-test.js --vus 100 --duration 5m

# Export results to JSON
npx k6 run tests/k6/mixed-workload-test.js --out json=results.json
```

## Test Details

| Test | Duration | Peak Users | Best For |
|------|----------|-----------|----------|
| quick | 2 min | 100 | Quick sanity check |
| auth | 10 min | 1,000 | Authentication bottlenecks |
| search | 8 min | 500 | Search performance |
| payment | 8 min | 300 | Payment processing |
| mixed | 20 min | 10,000 | Realistic user behavior |
| all | 2 hours | 10,000+ | Complete suite |

## Interpreting Results

### Good Signs ✓
```
checks.........................: 99.5% ✓
http_req_failed................: 0.5% ✓
http_req_duration p(95)........: 89ms ✓
[PASSED] - http_req_duration
[PASSED] - http_req_failed
```

### Bad Signs ✗
```
checks.........................: 85% ✓ 15% ✗  (failures detected)
http_req_failed................: 12% ✗  (exceeds 10% threshold)
http_req_duration p(95)........: 450ms ✗  (exceeds 150ms target)
[FAILED] - http_req_duration (threshold exceeded)
```

### Key Metrics

| Metric | What It Means | Good Target |
|--------|---------------|------------|
| http_req_duration p(95) | 95% of requests faster than this | < 150-200ms |
| http_req_duration p(99) | 99% of requests faster than this | < 300-500ms |
| http_req_failed | Percent of failed requests | < 5-10% |
| http_reqs | Total requests in test | Measure throughput |
| checks | Assertions that passed | > 95% |
| iterations | User script iterations | Higher = more load |

## Performance Targets by Endpoint

| Endpoint | p95 Target | Error Rate Target |
|----------|-----------|------------------|
| Auth | < 100ms | < 10% |
| Search | < 150ms | < 10% |
| Payment | < 200ms | < 5% |
| Constitution | < 150ms | < 10% |
| Governance | < 150ms | < 10% |
| Health | < 50ms | < 1% |

## Troubleshooting

### "Connection Refused"
```bash
# Start the application
npm run start:dev
# OR
npm run db:setup && npm run migration:run && npm run start:dev
```

### "High Error Rate (>10%)"
```bash
# Check logs
npm run start:dev 2>&1 | grep ERROR

# Check database
npm run schema:log

# Increase memory if needed
NODE_OPTIONS="--max-old-space-size=4096" npm run loadtest:mixed
```

### "Response Times Too High"
1. Check database indexes
2. Look for slow queries in logs
3. Check CPU/memory usage
4. Review recent code changes

### "Tests Hang"
```bash
# Run with timeout
timeout 600 npm run loadtest:auth

# Kill with Ctrl+C and restart
```

### "Port Already in Use"
```bash
# Find process using port 3000
lsof -i :3000

# Kill it
kill -9 <PID>
```

## Performance Optimization Checklist

- [ ] Run baseline test (`npm run loadtest:quick`)
- [ ] Record current p95 response times
- [ ] Run mixed workload test (`npm run loadtest:mixed`)
- [ ] Identify slowest endpoints
- [ ] Add database indexes
- [ ] Enable caching with `@Cacheable()` decorator
- [ ] Optimize slow queries
- [ ] Re-run tests to verify improvements
- [ ] Include in CI/CD pipeline

## Example Workflow

```bash
# 1. Start application
npm run start:dev &

# 2. Run quick smoke test
npm run loadtest:quick

# 3. If successful, run specific endpoint test
npm run loadtest:search

# 4. If that passes, run mixed workload
npm run loadtest:mixed

# 5. Check results and compare with baseline
# (Results printed to console)
```

## Setup for CI/CD

Add to your GitHub Actions workflow:

```yaml
- name: Run Load Tests
  env:
    BASE_URL: http://localhost:3000
  run: npm run loadtest:quick

- name: Run Mixed Workload
  run: npm run loadtest:mixed
```

## Environment Setup

### Prerequisites
```bash
# Check Node.js version
node --version  # Should be v20+

# Check k6
npx k6 version

# Start database
npm run db:setup

# Run migrations
npm run migration:run

# Seed test data
npm run seed:constitution
```

### Create Test Users
Test users are created during seeding:
- admin@example.com / admin123
- editor@example.com / editor123
- user@example.com / user123

## Monitoring (Advanced)

### Start Full Monitoring Stack
```bash
docker-compose -f tests/k6/docker-compose.k6.yml up
# Opens: http://localhost:3001 (Grafana)
# Credentials: admin / admin
```

### View Results
```bash
# Console output (automatic)
npm run loadtest:auth

# JSON export
npx k6 run tests/k6/auth-load-test.js --out json=results.json

# Custom HTML report
npm install k6-html-reporter
k6-html-reporter --input results.json --output report.html
```

## Quick Metrics Extraction

```bash
# Get p95 response time
npx k6 run tests/k6/auth-load-test.js --quiet | grep "p(95)"

# Count total requests
npx k6 run tests/k6/quick-test-all.js --quiet | grep "http_reqs"

# Check error rate
npx k6 run tests/k6/mixed-workload-test.js --quiet | grep "failed"
```

## Related Documentation

- **Full Guide**: `docs/K6_LOAD_TESTING.md`
- **API Docs**: `docs/API.md`
- **Developer Guide**: `docs/DEVELOPER.md`
- **Deployment**: `docs/DEPLOYMENT.md`

## Quick Links

- [k6 Documentation](https://k6.io/docs/)
- [k6 Best Practices](https://k6.io/docs/using-k6/best-practices/)
- [API Endpoints](./API.md)
