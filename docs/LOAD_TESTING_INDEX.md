# Load Testing Documentation Index

Complete guide to understanding and using k6 load testing for the Constitution Application.

## 📚 Documentation Files

### 1. **[K6_QUICK_REFERENCE.md](./K6_QUICK_REFERENCE.md)** - Start Here! ⭐
- **For**: Quick lookups, common commands
- **Best for**: Busy developers, quick questions
- **Read time**: 5 minutes
- **Contents**:
  - Common npm commands for running tests
  - Test overview table
  - Performance targets
  - Quick troubleshooting
  - Metrics interpretation at a glance

### 2. **[K6_LOAD_TESTING.md](./K6_LOAD_TESTING.md)** - Comprehensive Guide
- **For**: In-depth understanding, detailed reference
- **Best for**: Setting up tests, understanding concepts
- **Read time**: 30 minutes
- **Contents**:
  - Complete overview of k6 and load testing
  - Prerequisites and setup instructions
  - Detailed test type descriptions
  - Performance targets explained
  - Monitoring and visualization options
  - Test configuration details
  - Interpreting results
  - Comprehensive troubleshooting
  - Advanced usage patterns

### 3. **[K6_EXAMPLES.md](./K6_EXAMPLES.md)** - Real-World Scenarios
- **For**: Practical examples, specific use cases
- **Best for**: Learning by example, real workflows
- **Read time**: 20 minutes
- **Contents**:
  - 7 detailed real-world scenarios
  - Smoke testing before release
  - Performance regression detection
  - Load testing new features
  - Capacity planning examples
  - Debugging slow endpoints
  - Stress testing procedures
  - CI/CD integration examples
  - Step-by-step walkthroughs

---

## 🚀 Quick Start (5 minutes)

### First Time?

```bash
# 1. Ensure database is running
npm run db:setup

# 2. Start the application
npm run start:dev

# 3. Run quick smoke test (2 minutes)
npm run loadtest:quick

# 4. Check results (look for ✓ marks)
# If you see [PASSED], congratulations! Load testing works.
```

### Next Steps

- Review your results using the [metrics interpretation guide](./K6_QUICK_REFERENCE.md#interpreting-results)
- Try running a specific endpoint test: `npm run loadtest:auth`
- Read the relevant scenario in [K6_EXAMPLES.md](./K6_EXAMPLES.md) that matches your use case

---

## 📋 Test Types Overview

The application includes 9 different load tests. Pick the right one for your needs:

| Test | Best For | Duration | Complexity |
|------|----------|----------|-----------|
| **quick** | Fast sanity check, CI/CD | 2 min | ⭐ |
| **auth** | Authentication bottlenecks | 10 min | ⭐⭐ |
| **search** | Search performance | 8 min | ⭐⭐ |
| **payment** | Payment processing validation | 8 min | ⭐⭐ |
| **constitution** | CRUD operations | 8 min | ⭐⭐ |
| **governance** | Amendments and voting | 8 min | ⭐⭐ |
| **performance** | Metrics collection | 8 min | ⭐⭐ |
| **health** | System health checks | 5 min | ⭐ |
| **mixed** | Realistic user behavior | 20 min | ⭐⭐⭐ |

👉 **Recommendation**: Start with `quick`, then try `mixed` for a comprehensive test.

---

## 🎯 Common Tasks

### "I want to test before deploying"
→ Run [`npm run loadtest:quick`](./K6_QUICK_REFERENCE.md#start-here) (2 minutes)

### "I want to check for performance regression"
→ Follow [Scenario 2: Detect Performance Regression](./K6_EXAMPLES.md#scenario-2-detect-performance-regression)

### "I want to load test a new feature"
→ Follow [Scenario 3: Load Test New Feature](./K6_EXAMPLES.md#scenario-3-load-test-new-feature)

### "I want to understand my current performance"
→ Run [`npm run loadtest:mixed`](./K6_QUICK_REFERENCE.md#common-commands) and review results

### "I want to set up continuous testing"
→ See [Scenario 7: CI/CD Integration](./K6_EXAMPLES.md#scenario-7-cicd-integration)

### "I want to debug a slow endpoint"
→ Follow [Scenario 5: Debugging Slow Endpoint](./K6_EXAMPLES.md#scenario-5-debugging-slow-endpoint)

### "I want to find the breaking point"
→ Follow [Scenario 6: Stress Testing](./K6_EXAMPLES.md#scenario-6-stress-testing)

### "I want to understand test results"
→ See [Interpreting Results](./K6_LOAD_TESTING.md#interpreting-results) in comprehensive guide

---

## 📊 Performance Targets

### Global Targets (All Endpoints)
- **Response Time (p95)**: < 150-200ms
- **Response Time (p99)**: < 300-500ms
- **Error Rate**: < 5-10%

### Endpoint-Specific Targets

| Endpoint | p95 | Error Rate |
|----------|-----|-----------|
| Auth | < 100ms | < 10% |
| Search | < 150ms | < 10% |
| Payment | < 200ms | < 5% |
| Others | < 150ms | < 10% |
| Health | < 50ms | < 1% |

See [Performance Targets](./K6_LOAD_TESTING.md#performance-targets) for detailed explanation.

---

## 🛠️ Common Commands

### Running Tests
```bash
npm run loadtest:quick    # 2-min smoke test
npm run loadtest:auth     # Test authentication
npm run loadtest:mixed    # Realistic workload
npm run loadtest:all      # All tests sequentially
```

### Testing Different Environments
```bash
BASE_URL=http://staging.example.com npm run loadtest:quick
BASE_URL=https://prod.example.com npm run loadtest:quick
```

### Advanced
```bash
npx k6 run tests/k6/auth-load-test.js --verbose
npx k6 run tests/k6/quick-test-all.js --dry-run
npx k6 run tests/k6/mixed-workload-test.js --out json=results.json
```

See [Common Commands](./K6_QUICK_REFERENCE.md#common-commands) for more.

---

## ✅ Troubleshooting Quick Links

| Problem | Solution |
|---------|----------|
| "Connection refused" | [→ Start the app](./K6_QUICK_REFERENCE.md#connection-refused) |
| "High error rate" | [→ Debug errors](./K6_QUICK_REFERENCE.md#high-error-rate-10) |
| "Slow response times" | [→ Optimize](./K6_QUICK_REFERENCE.md#response-times-too-high) |
| "Tests hanging" | [→ Handle hangs](./K6_QUICK_REFERENCE.md#tests-hang) |
| "Port in use" | [→ Free the port](./K6_QUICK_REFERENCE.md#port-already-in-use) |

For more: See [Troubleshooting](./K6_LOAD_TESTING.md#troubleshooting) in comprehensive guide.

---

## 📈 Monitoring & Visualization

### Option 1: Console Output (Default)
```bash
npm run loadtest:quick
# Results printed to console automatically
```

### Option 2: Full Monitoring Stack
```bash
docker-compose -f tests/k6/docker-compose.k6.yml up
# View: http://localhost:3001 (Grafana)
```

### Option 3: JSON Export
```bash
npx k6 run tests/k6/mixed-workload-test.js --out json=results.json
```

See [Monitoring & Visualization](./K6_LOAD_TESTING.md#monitoring--visualization) for details.

---

## 📚 Reading Guide

### If you have 5 minutes
→ Read: [K6_QUICK_REFERENCE.md](./K6_QUICK_REFERENCE.md) "Start Here" section

### If you have 15 minutes
→ Read: [K6_QUICK_REFERENCE.md](./K6_QUICK_REFERENCE.md) complete guide

### If you have 30 minutes
→ Read: Sections 1-7 of [K6_LOAD_TESTING.md](./K6_LOAD_TESTING.md)

### If you have 1 hour
→ Read: All of [K6_LOAD_TESTING.md](./K6_LOAD_TESTING.md)

### If you want examples
→ Read: [K6_EXAMPLES.md](./K6_EXAMPLES.md) and pick a scenario

### If you're setting up CI/CD
→ Go to: [Scenario 7: CI/CD Integration](./K6_EXAMPLES.md#scenario-7-cicd-integration)

---

## 🔧 Test File Structure

Load tests are located in `tests/k6/`:

```
tests/k6/
├── Individual Endpoint Tests
│   ├── auth-load-test.js           # Authentication endpoints
│   ├── constitution-load-test.js   # Constitutional principles
│   ├── search-load-test.js         # Search functionality
│   ├── payment-load-test.js        # Payment processing
│   ├── governance-load-test.js     # Governance operations
│   ├── performance-load-test.js    # Performance metrics
│   └── health-load-test.js         # Health checks
│
├── Composite Tests
│   ├── mixed-workload-test.js      # Realistic scenario (⭐ most useful)
│   └── quick-test-all.js           # 2-minute smoke test (⭐ fastest)
│
├── Monitoring Setup
│   ├── docker-compose.k6.yml       # Full stack with Prometheus + Grafana
│   ├── prometheus.yml              # Metrics collection config
│   └── Dockerfile                  # k6 container definition
│
└── Grafana Dashboards
    ├── dashboards/k6-dashboard.yml
    └── datasources/prometheus.yml
```

---

## 📞 Getting Help

### For Quick Answers
1. Check [K6_QUICK_REFERENCE.md](./K6_QUICK_REFERENCE.md)
2. Look up your issue in [Troubleshooting section](./K6_QUICK_REFERENCE.md#troubleshooting)

### For Understanding Concepts
1. Read relevant section in [K6_LOAD_TESTING.md](./K6_LOAD_TESTING.md)
2. Review example scenario in [K6_EXAMPLES.md](./K6_EXAMPLES.md)

### For Debugging
1. Run with verbose output: `npm run loadtest:auth --verbose`
2. Check application logs: `npm run start:dev 2>&1 | grep ERROR`
3. Follow [Scenario 5](./K6_EXAMPLES.md#scenario-5-debugging-slow-endpoint) for slow endpoints

### For Advanced Topics
1. See [Advanced Usage](./K6_LOAD_TESTING.md#advanced-usage) in comprehensive guide
2. Check [k6 documentation](https://k6.io/docs/)

---

## 🎓 Learning Path

**Week 1: Basics**
- [ ] Run `npm run loadtest:quick` and see results
- [ ] Read [K6_QUICK_REFERENCE.md](./K6_QUICK_REFERENCE.md)
- [ ] Try different endpoints: `npm run loadtest:auth`, `npm run loadtest:search`
- [ ] Understand the [Performance Targets](./K6_LOAD_TESTING.md#performance-targets)

**Week 2: Deeper Understanding**
- [ ] Read [K6_LOAD_TESTING.md](./K6_LOAD_TESTING.md) sections 1-7
- [ ] Run `npm run loadtest:mixed` and analyze results
- [ ] Learn to [interpret results](./K6_LOAD_TESTING.md#interpreting-results)
- [ ] Try a [troubleshooting scenario](./K6_EXAMPLES.md#scenario-5-debugging-slow-endpoint)

**Week 3: Practical Application**
- [ ] Follow [Scenario 1](./K6_EXAMPLES.md#scenario-1-smoke-test-before-release) for pre-deployment testing
- [ ] Implement [Scenario 2](./K6_EXAMPLES.md#scenario-2-detect-performance-regression) for baseline comparison
- [ ] Read [Advanced Usage](./K6_LOAD_TESTING.md#advanced-usage)
- [ ] Set up monitoring with [Grafana](./K6_LOAD_TESTING.md#option-2-full-monitoring-stack-most-complete)

**Week 4: Integration**
- [ ] Follow [Scenario 7](./K6_EXAMPLES.md#scenario-7-cicd-integration) for CI/CD setup
- [ ] Add load tests to your GitHub Actions
- [ ] Create [feature-specific tests](./K6_EXAMPLES.md#scenario-3-load-test-new-feature)
- [ ] Establish baseline metrics for ongoing monitoring

---

## 🏆 Best Practices

✅ **Do**:
- Run smoke test before every commit
- Compare against baseline to detect regressions
- Test new features before releasing
- Include load tests in CI/CD pipeline
- Monitor performance continuously
- Document performance improvements
- Investigate and fix threshold failures

❌ **Don't**:
- Ignore failing load tests
- Assume good performance without testing
- Load test production without explicit approval
- Run multiple tests simultaneously
- Change test parameters without documenting why
- Deploy code that fails load tests

---

## 📞 Quick Reference Links

| Need | Link |
|------|------|
| Quick command list | [K6_QUICK_REFERENCE.md](./K6_QUICK_REFERENCE.md) |
| Comprehensive guide | [K6_LOAD_TESTING.md](./K6_LOAD_TESTING.md) |
| Real examples | [K6_EXAMPLES.md](./K6_EXAMPLES.md) |
| API documentation | [API.md](./API.md) |
| Developer guide | [DEVELOPER.md](./DEVELOPER.md) |
| Deployment guide | [DEPLOYMENT.md](./DEPLOYMENT.md) |
| k6 docs | https://k6.io/docs/ |

---

## 📝 Document Metadata

| Document | Lines | Focus |
|----------|-------|-------|
| K6_QUICK_REFERENCE.md | 274 | Quick lookups, commands |
| K6_LOAD_TESTING.md | 943 | Comprehensive reference |
| K6_EXAMPLES.md | 598 | Real-world scenarios |
| **Total** | **1,815** | Complete load testing guide |

**Version**: 1.0
**Last Updated**: 2024-12-17
**Status**: Ready for production use

---

## 🚀 Ready to Start?

### First Time?
```bash
npm run loadtest:quick
```

### Know what you want to do?
Pick your scenario from [Common Tasks](#-common-tasks) above.

### Want to learn more?
Start with [K6_QUICK_REFERENCE.md](./K6_QUICK_REFERENCE.md) or [K6_EXAMPLES.md](./K6_EXAMPLES.md).

---

**Questions?** See the relevant documentation above or check the [Troubleshooting](./K6_LOAD_TESTING.md#troubleshooting) section.
