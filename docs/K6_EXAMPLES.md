# K6 Load Testing - Practical Examples

Real-world examples and scenarios for testing the Constitution Application with k6.

## Table of Contents

1. [Scenario 1: Smoke Test Before Release](#scenario-1-smoke-test-before-release)
2. [Scenario 2: Detect Performance Regression](#scenario-2-detect-performance-regression)
3. [Scenario 3: Load Test New Feature](#scenario-3-load-test-new-feature)
4. [Scenario 4: Capacity Planning](#scenario-4-capacity-planning)
5. [Scenario 5: Debugging Slow Endpoint](#scenario-5-debugging-slow-endpoint)
6. [Scenario 6: Stress Testing](#scenario-6-stress-testing)
7. [Scenario 7: CI/CD Integration](#scenario-7-cicd-integration)

---

## Scenario 1: Smoke Test Before Release

**Goal**: Quickly verify the application handles basic load before deploying.

**When**: Before merging to main, before deployment

**Commands**:

```bash
# Start application
npm run start:dev &
PID=$!

# Wait for app to be ready
sleep 5

# Run quick smoke test
npm run loadtest:quick

# Check exit code
if [ $? -eq 0 ]; then
  echo "✓ Smoke test passed - safe to deploy"
  kill $PID
  exit 0
else
  echo "✗ Smoke test failed - do not deploy"
  kill $PID
  exit 1
fi
```

**Expected Output**:

```
✓ auth login ok
✓ constitution list ok
✓ search ok
✓ health check ok

[PASSED] - http_req_duration
[PASSED] - http_req_failed
```

**What to Look For**:
- All checks passing
- All thresholds [PASSED]
- No error rate exceeding 10%

---

## Scenario 2: Detect Performance Regression

**Goal**: Compare current performance against baseline to detect slowdowns.

**When**: After code changes, weekly performance monitoring

### Step 1: Establish Baseline

```bash
# Run baseline test and save results
npm run loadtest:mixed --out json=baseline-$(date +%Y-%m-%d).json

# Record p95 response time
echo "Baseline p95: 125ms"
```

### Step 2: Make Code Changes

```bash
# (Edit some code)
git checkout -b feature/add-caching
npm run lint
npm run test
```

### Step 3: Compare Performance

```bash
# Run same test with new code
npm run loadtest:mixed --out json=current-$(date +%Y-%m-%d).json

# Extract p95 values and compare
# Baseline: 125ms
# Current: 145ms
# Regression: +20ms (+16%)
```

### Custom Comparison Script

```bash
#!/bin/bash
# compare-tests.sh

BASELINE=$1
CURRENT=$2

echo "=== Performance Comparison ==="
echo "Baseline: $BASELINE"
echo "Current:  $CURRENT"
echo ""

# Extract p95 from both
BASELINE_P95=$(jq '.data.result[] | select(.type=="Point" and .metric=="http_req_duration") | .value' $BASELINE | tail -1)
CURRENT_P95=$(jq '.data.result[] | select(.type=="Point" and .metric=="http_req_duration") | .value' $CURRENT | tail -1)

echo "Baseline p95: ${BASELINE_P95}ms"
echo "Current p95:  ${CURRENT_P95}ms"

# Calculate difference
DIFF=$((CURRENT_P95 - BASELINE_P95))
PCT=$((DIFF * 100 / BASELINE_P95))

if [ $DIFF -gt 0 ]; then
  echo "⚠️  Regression: +${DIFF}ms (+${PCT}%)"
  exit 1
else
  echo "✓ Improvement: ${DIFF}ms (${PCT}%)"
  exit 0
fi
```

**Usage**:

```bash
chmod +x compare-tests.sh
./compare-tests.sh baseline.json current.json
```

---

## Scenario 3: Load Test New Feature

**Goal**: Verify new feature performs well under load before releasing.

**Example**: New "Advanced Search" feature

### Step 1: Create Feature-Specific Test

```javascript
// tests/k6/advanced-search-test.js
import http from 'k6/http';
import { check } from 'k6';
import { Trend } from 'k6/metrics';

export let advancedSearchTime = new Trend('advanced_search_duration');

export let options = {
  stages: [
    { duration: '1m', target: 100 },   // Ramp to 100
    { duration: '3m', target: 100 },   // Sustain
    { duration: '1m', target: 0 },     // Ramp down
  ],
  thresholds: {
    'advanced_search_duration': ['p(95)<200'],  // New feature should be fast
    'http_req_failed': ['rate<0.05'],           // Strict on new features
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export default function() {
  const searchPayload = JSON.stringify({
    query: 'constitution',
    filters: {
      category: 'principles',
      dateRange: { from: '2024-01-01', to: '2024-12-31' }
    },
    sort: 'relevance'
  });

  const response = http.post(
    `${BASE_URL}/api/search/advanced`,
    searchPayload,
    { headers: { 'Content-Type': 'application/json' } }
  );

  advancedSearchTime.add(response.timings.duration);

  check(response, {
    'advanced search returns 200': (r) => r.status === 200,
    'advanced search time < 200ms': (r) => r.timings.duration < 200,
    'advanced search has results': (r) => r.json('data') !== undefined,
  });
}
```

### Step 2: Run Feature Test

```bash
# Test new feature in isolation
npx k6 run tests/k6/advanced-search-test.js

# Compare with regular search performance
npm run loadtest:search
```

### Step 3: Verify Results

```
advanced_search_duration.........: avg=85ms    min=12ms   med=78ms   p(95)=156ms ✓
http_req_failed..................: 0.2%                                      ✓
[PASSED] - advanced_search_duration
[PASSED] - http_req_failed
```

---

## Scenario 4: Capacity Planning

**Goal**: Determine how many users the application can handle.

**Approach**: Stress test with increasing load until failure.

### Step 1: Create Stress Test

```javascript
// tests/k6/stress-test.js
import http from 'k6/http';
import { check } from 'k6';
import { Rate } from 'k6/metrics';

export let errorRate = new Rate('errors');

export let options = {
  // Start with low load, increase significantly
  stages: [
    { duration: '2m', target: 100 },
    { duration: '2m', target: 500 },
    { duration: '2m', target: 1000 },
    { duration: '2m', target: 5000 },
    { duration: '2m', target: 10000 },
    { duration: '2m', target: 20000 },  // Push to extremes
    { duration: '1m', target: 0 },
  ],
  thresholds: {
    'http_req_duration': ['p(95)<500'],  // Relaxed thresholds
    'http_req_failed': ['rate<0.2'],     // Allow higher error rate
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export default function() {
  const res = http.get(`${BASE_URL}/api/health`);

  let success = check(res, {
    'status is 200': (r) => r.status === 200,
  });

  errorRate.add(!success);
}
```

### Step 2: Run Stress Test

```bash
# Monitor resource usage simultaneously
# Terminal 1: Run test
npx k6 run tests/k6/stress-test.js

# Terminal 2: Monitor system
watch -n 1 'top -b -n 1 | head -20'

# Terminal 3: Monitor database
watch -n 1 'psql -d constitution_db -c "SELECT count(*) FROM pg_stat_activity;"'
```

### Step 3: Analyze Results

Look for the "breaking point":
- 1000 users: ✓ All requests succeed, p95 = 50ms
- 5000 users: ⚠️ Some slowdown, p95 = 250ms
- 10000 users: ✗ 15% error rate, p95 = 800ms
- 20000 users: ✗ 50% error rate

**Conclusion**: Safe capacity = 5000-10000 users

---

## Scenario 5: Debugging Slow Endpoint

**Goal**: Find why an endpoint is slow and fix it.

**Example**: Search endpoint taking 800ms instead of target 150ms

### Step 1: Isolate the Problem

```bash
# Test search endpoint specifically
npm run loadtest:search --verbose

# Output shows: search_response_time p(95) = 850ms ✗
```

### Step 2: Enable Performance Monitoring

```bash
# Start app with detailed logging
ENABLE_REQUEST_LOGGING=true npm run start:dev
```

### Step 3: Run Test and Capture Logs

```bash
# In one terminal
npm run start:dev > app.log 2>&1

# In another
npm run loadtest:search

# Examine logs for slow requests
grep "search" app.log | grep "duration"
```

### Step 4: Identify Root Cause

```bash
# Check for slow database queries
npm run schema:log

# Typical findings:
# SELECT * FROM principles ORDER BY created_at LIMIT 10
# ^-- Missing index on created_at
```

### Step 5: Implement Fix

```sql
-- Add missing index
CREATE INDEX idx_principles_created_at ON principles(created_at DESC);

-- Verify index works
EXPLAIN ANALYZE
SELECT * FROM principles ORDER BY created_at DESC LIMIT 10;
```

### Step 6: Re-test

```bash
# Run test again
npm run loadtest:search

# Expected improvement:
# search_response_time p(95) = 120ms ✓ (from 850ms)
```

### Step 7: Document Fix

```bash
# Commit the improvement
git add -A
git commit -m "perf: add index on principles.created_at

- Reduces search response time from 850ms to 120ms (p95)
- Resolves performance regression from feature X
- Verified with k6 load test

Test results:
  Before: search_response_time p(95) = 850ms
  After:  search_response_time p(95) = 120ms"
```

---

## Scenario 6: Stress Testing

**Goal**: Test system stability under extreme load and verify graceful degradation.

### Execution

```bash
# Run stress test
npx k6 run tests/k6/stress-test.js

# Monitor during test
# Terminal 2:
watch 'psql -d constitution_db -c "SELECT count(*) FROM pg_stat_activity;"'

# Terminal 3:
top -p $(pgrep -f "node")
```

### Expected Behavior

**At 5000 users**:
- All requests complete
- Error rate < 5%
- p95 response time < 500ms

**At 10000 users**:
- Some slow responses (p95 > 500ms)
- Error rate < 15%
- Database connections approaching limit
- CPU approaching 100%

**At 20000 users**:
- High error rate (30-50%)
- Long response times (>1000ms)
- Database connection pool exhausted
- Clear performance degradation

### What to Validate

```javascript
// Expected results (excerpt from k6 output)
iterations.............: 50000
http_req_duration p(95): 850ms      // Increased from normal 150ms
http_req_failed.......: 25.3%        // Above normal 5%
http_reqs.............: 45200 req/sec // Still processing requests
```

---

## Scenario 7: CI/CD Integration

**Goal**: Automatically run load tests on every merge and fail the build if performance degrades.

### GitHub Actions Workflow

```yaml
# .github/workflows/load-tests.yml
name: Load Tests

on:
  pull_request:
    branches: [main, develop]
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM

jobs:
  smoke-test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15-alpine
        env:
          POSTGRES_DB: test_db
          POSTGRES_USER: test_user
          POSTGRES_PASSWORD: test_pass
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Setup database
        env:
          DATABASE_HOST: localhost
          DATABASE_PORT: 5432
          DATABASE_NAME: test_db
          DATABASE_USER: test_user
          DATABASE_PASSWORD: test_pass
        run: |
          npm run migration:run

      - name: Start application
        env:
          NODE_ENV: test
          DATABASE_HOST: localhost
          DATABASE_PORT: 5432
          DATABASE_NAME: test_db
          DATABASE_USER: test_user
          DATABASE_PASSWORD: test_pass
        run: |
          npm run build
          npm run start:prod &
          sleep 5

      - name: Run smoke test
        env:
          BASE_URL: http://localhost:3000
        run: npm run loadtest:quick

      - name: Run mixed workload test
        env:
          BASE_URL: http://localhost:3000
        if: github.event_name == 'schedule' || contains(github.head_ref, 'perf')
        run: npm run loadtest:mixed

      - name: Upload results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: load-test-results
          path: results/

      - name: Comment PR with results
        if: github.event_name == 'pull_request' && always()
        uses: actions/github-script@v6
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: '✓ Load tests passed - ready for review'
            })
```

### Running in CI

```bash
# CI will automatically:
# 1. Setup database
# 2. Start application
# 3. Run smoke test (2 min)
# 4. Run full mixed test on scheduled runs (20 min)
# 5. Pass/fail the build based on thresholds
```

### Example CI Output

```
Run smoke test
/home/runner/work/_actions/actions/setup-node/v3/lib/setup.js
✓ auth login ok
✓ constitution list ok
...
[PASSED] - http_req_duration
[PASSED] - http_req_failed

Run mixed workload test (scheduled)
[PASSED] - auth_response_time
[PASSED] - search_response_time
[PASSED] - payment_response_time
[PASSED] - http_req_failed

✓ All load tests passed
```

---

## Quick Reference: When to Run What

| Situation | Command | Duration | Frequency |
|-----------|---------|----------|-----------|
| Before commit | `npm run loadtest:quick` | 2 min | Always |
| Before PR | `npm run loadtest:auth` + specific test | 10 min | Always |
| Before merge | `npm run loadtest:mixed` | 20 min | For significant changes |
| Before deploy | `npm run loadtest:quick` | 2 min | Always |
| Daily CI | `npm run loadtest:quick` (+ mixed weekly) | 2-20 min | Daily |
| New feature | Feature-specific test | 5-10 min | Always |
| Performance issue | Targeted test + monitoring | Variable | As needed |
| Capacity planning | Stress test | 15 min | Quarterly |

---

## Tips for Success

1. **Establish baseline** before making changes
2. **Run tests regularly** to catch regressions early
3. **Compare against baseline** to understand impact
4. **Monitor system resources** while running tests
5. **Automate in CI/CD** to catch issues automatically
6. **Document results** for tracking improvement over time
7. **Investigate failures** rather than ignoring them
8. **Optimize incrementally** with measurable improvements

## Next Steps

1. Run `npm run loadtest:quick` to get started
2. Review results and compare against targets
3. Add load tests to your CI/CD pipeline
4. Set up Grafana for continuous monitoring
5. Create feature-specific tests for new endpoints
6. Establish baseline metrics for your application

See [K6_LOAD_TESTING.md](./K6_LOAD_TESTING.md) for comprehensive documentation.
