import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

export let errorRate = new Rate('errors');
export let searchRequests = new Counter('search_requests');
export let searchTrend = new Trend('search_response_time');
export let searchTrendLarge = new Trend('search_large_response_time');

// Advanced search performance test with multiple query patterns
export const options = {
  stages: [
    { duration: '30s', target: 10 },   // Warm up
    { duration: '2m', target: 100 },   // Light load
    { duration: '3m', target: 500 },   // Medium load
    { duration: '5m', target: 2000 },  // Heavy load
    { duration: '3m', target: 500 },   // Reduce load
    { duration: '2m', target: 0 },    // Cool down
  ],
  thresholds: {
    http_req_duration: [
      'p(90)<200',  // 90% of requests under 200ms
      'p(95)<250',  // 95% of requests under 250ms
      'p(99)<350',  // 99% of requests under 350ms
    ],
    http_req_failed: ['rate<0.001'],   // Less than 0.1% errors
    search_response_time: ['p(95)<200'],
    search_large_response_time: ['p(95)<300'],
    errors: ['rate<0.01'],             // Less than 1% error rate
  },
  summaryTimeUnit: 'ms',
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000/api';

// Authentication setup
let authToken = '';

// Test data - realistic search queries
const searchQueries = {
  simple: [
    'api',
    'test',
    'auth',
    'db',
    'perf',
    'load',
    'security',
  ],
  medium: [
    'performance testing',
    'authentication system',
    'database integration',
    'load testing k6',
    'constitution principles',
    'rest api design',
    'jwt tokens',
  ],
  complex: [
    'authentication performance standards',
    'load testing for search endpoints',
    'constitution amendment process',
    'quality gates compliance check',
    'performance metrics monitoring',
    'api response time optimization',
    'concurrent user testing',
  ],
  edge: [
    '',
    'a',
    'verylongsearchquerythatexceedstypicalusagepatternsbuttestslimit',
    'special!@#$%^&*()characters',
    '1234567890numbers',
    'multiple spaces    between   words',
    'ünïcødé chärs',
  ],
  longTail: [
    'how to implement load testing with k6 for authentication endpoints',
    'constitution principles for software development best practices',
    'performance standards for rest api design patterns',
    'quality gates and compliance verification process',
    'database integration with typeorm and postgres',
  ],
};

export function setup() {
  console.log('Setting up search performance test...');

  // Authenticate
  const loginPayload = JSON.stringify({
    email: 'admin@constitution.com',
    password: 'password',
  });

  const loginResponse = http.post(
    `${BASE_URL}/auth/login`,
    loginPayload,
    {
      headers: { 'Content-Type': 'application/json' },
    }
  );

  if (loginResponse.status !== 200) {
    fail(`Authentication failed: ${loginResponse.status}`);
  }

  const body = JSON.parse(loginResponse.body);
  authToken = body.access_token;

  // Pre-load some data by making initial search requests
  console.log('Pre-loading search data...');
  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`,
    },
  };

  // Make several search requests to ensure data is cached
  for (const query of ['api', 'performance', 'constitution']) {
    http.get(`${BASE_URL}/principles/search?query=${encodeURIComponent(query)}`, params);
    sleep(0.1);
  }

  return { authToken };
}

export default function (data) {
  // Choose query type based on distribution
  const queryType = Math.random();
  let query;
  let limit;
  let response;
  let startTime;

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${data.authToken}`,
    },
  };

  if (queryType < 0.5) {
    // Simple queries - 50%
    query = searchQueries.simple[Math.floor(Math.random() * searchQueries.simple.length)];
    limit = 10;
  } else if (queryType < 0.8) {
    // Medium queries - 30%
    query = searchQueries.medium[Math.floor(Math.random() * searchQueries.medium.length)];
    limit = 20;
  } else if (queryType < 0.95) {
    // Complex queries - 15%
    query = searchQueries.complex[Math.floor(Math.random() * searchQueries.complex.length)];
    limit = 30;
  } else {
    // Edge cases - 5%
    query = searchQueries.edge[Math.floor(Math.random() * searchQueries.edge.length)];
    limit = Math.random() > 0.5 ? 50 : 10;
  }

  // Build search URL
  const searchUrl = `${BASE_URL}/principles/search?query=${encodeURIComponent(query)}&limit=${limit}`;

  startTime = Date.now();
  response = http.get(searchUrl, params);
  const responseTime = Date.now() - startTime;

  // Record metrics
  searchRequests.add(1, { query_type: query.length > 50 ? 'long' : 'short' });

  if (limit > 20) {
    searchTrendLarge.add(responseTime);
  } else {
    searchTrend.add(responseTime);
  }

  // Detailed checks based on query type
  const baseChecks = {
    'status code is 200': (r) => r.status === 200,
    'response is valid JSON': (r) => {
      try {
        JSON.parse(r.body);
        return true;
      } catch {
        return false;
      }
    },
  };

  // Add query-specific checks
  const queryChecks = {
    'response has search results structure': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.data !== undefined && body.total !== undefined;
      } catch {
        return false;
      }
    },
    'response data is array': (r) => {
      try {
        const body = JSON.parse(r.body);
        return Array.isArray(body.data);
      } catch {
        return false;
      }
    },
    'response has pagination info': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.pagination && body.pagination.page !== undefined;
      } catch {
        return false;
      }
    },
  };

  // Response time checks based on query complexity
  const performanceChecks = {};
  if (query.length > 50) {
    performanceChecks['long query response time < 300ms'] = (r) => r.timings.duration < 300;
  } else {
    performanceChecks['response time < 200ms'] = (r) => r.timings.duration < 200;
  }

  // Final combined checks
  const allChecks = {
    ...baseChecks,
    ...queryChecks,
    ...performanceChecks,
  };

  check(response, allChecks, {
    'Search Performance': 'search_performance',
    'Search Errors': 'search_errors',
  });

  // Count errors
  if (response.status !== 200) {
    errorRate.add(1);
    console.error(`Search failed for query "${query}": ${response.status}`);
  }

  // Simulate user behavior after search
  if (Math.random() < 0.3) {
    // 30% of users click on first result
    try {
      const body = JSON.parse(response.body);
      if (body.data && body.data.length > 0) {
        const principleId = body.data[0].id;
        http.get(`${BASE_URL}/principles/${principleId}`, params);
        sleep(0.2);
      }
    } catch (e) {
      // Ignore errors in navigation
    }
  }

  // Vary think time based on query complexity
  const thinkTime = query.length > 50 ? 1.0 : 0.5;
  sleep(thinkTime);
}

export function teardown(data) {
  console.log('Search performance test completed');

  // Summary statistics
  console.log('=== Search Performance Summary ===');
  console.log(`Total searches: ${searchRequests.values}`);
  console.log(`Average response time (all): ${searchTrend.values.mean.toFixed(2)}ms`);
  console.log(`Average response time (large results): ${searchTrendLarge.values.mean.toFixed(2)}ms`);
  console.log(`P95 response time (all): ${searchTrend.values.p95.toFixed(2)}ms`);
  console.log(`P99 response time (all): ${searchTrend.values.p99.toFixed(2)}ms`);

  if (errorRate.values.length > 0) {
    console.log(`Error rate: ${(errorRate.current * 100).toFixed(2)}%`);
  }
}