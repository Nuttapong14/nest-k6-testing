import http from 'k6/http';
import { check, sleep, fail } from 'k6';
import { Rate, Counter, Trend } from 'k6/metrics';

export let errorRate = new Rate('errors');
export let contentRequests = new Counter('content_requests');
export let getPrinciplesTrend = new Trend('get_principles_response_time');
export let searchPrinciplesTrend = new Trend('search_principles_response_time');
export let getStandardsTrend = new Trend('get_standards_response_time');

// Configuration for authentication
export const authOptions = {
  stages: [
    { duration: '30s', target: 5 },    // Warm up
    { duration: '2m', target: 100 },   // Load test
    { duration: '5m', target: 1000 },  // Stress test
    { duration: '5m', target: 5000 },  // Peak load
    { duration: '5m', target: 1000 },  // Sustain load
    { duration: '2m', target: 0 },     // Cool down
  ],
  thresholds: {
    http_req_duration: ['p(95)<150'],  // 95% of requests must complete within 150ms
    http_req_failed: ['rate<0.001'],   // Less than 0.1% errors
    get_principles_response_time: ['p(95)<150'],
    search_principles_response_time: ['p(95)<200'],
    get_standards_response_time: ['p(95)<150'],
    errors: ['rate<0.01'],             // Less than 1% error rate
  },
  summaryTimeUnit: 'ms',
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000/api';

// Authentication token storage
let authToken = '';

// Setup: Get authentication token
export function setup() {
  console.log('Setting up content retrieval load test...');

  // Get authentication token
  const loginPayload = JSON.stringify({
    email: 'admin@constitution.com',
    password: 'password',
  });

  const loginParams = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const loginResponse = http.post(`${BASE_URL}/auth/login`, loginPayload, loginParams);

  if (loginResponse.status !== 200) {
    console.error('Failed to authenticate:', loginResponse.status, loginResponse.body);
    fail('Authentication setup failed');
  }

  try {
    const body = JSON.parse(loginResponse.body);
    authToken = body.access_token;
    console.log('Successfully obtained authentication token');
  } catch (e) {
    console.error('Failed to parse authentication response:', e);
    fail('Authentication setup failed');
  }

  return {
    authToken: authToken,
  };
}

export default function (data) {
  // Create search queries for realistic workload
  const searchQueries = [
    'security',
    'performance',
    'testing',
    'authentication',
    'database',
    'api',
    'load testing',
    'constitution',
    'principles',
    'standards',
  ];

  // Randomly choose operation type (60% GET principles, 30% search, 10% get standards)
  const operation = Math.random();
  let response;
  let startTime;

  // Add authorization header
  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${data.authToken}`,
    },
  };

  if (operation < 0.6) {
    // Get principles - 60% of traffic
    startTime = Date.now();
    response = http.get(`${BASE_URL}/principles?page=1&limit=20`, params);

    contentRequests.add(1, { type: 'get_principles' });
    getPrinciplesTrend.add(Date.now() - startTime);

    const checks = {
      'status code is 200': (r) => r.status === 200,
      'response time < 150ms': (r) => r.timings.duration < 150,
      'response is valid JSON': (r) => {
        try {
          JSON.parse(r.body);
          return true;
        } catch {
          return false;
        }
      },
      'response has data array': (r) => {
        try {
          const body = JSON.parse(r.body);
          return Array.isArray(body.data);
        } catch {
          return false;
        }
      },
    };

    check(response, checks, {
      'Get Principles Performance': 'get_principles_performance',
      'Get Principles Errors': 'get_principles_errors',
    });

  } else if (operation < 0.9) {
    // Search principles - 30% of traffic
    const query = searchQueries[Math.floor(Math.random() * searchQueries.length)];
    startTime = Date.now();
    response = http.get(`${BASE_URL}/principles/search?query=${encodeURIComponent(query)}&limit=10`, params);

    contentRequests.add(1, { type: 'search_principles' });
    searchPrinciplesTrend.add(Date.now() - startTime);

    const checks = {
      'status code is 200': (r) => r.status === 200,
      'response time < 200ms': (r) => r.timings.duration < 200,
      'response is valid JSON': (r) => {
        try {
          JSON.parse(r.body);
          return true;
        } catch {
          return false;
        }
      },
      'response has search results': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.data && body.total !== undefined;
        } catch {
          return false;
        }
      },
    };

    check(response, checks, {
      'Search Principles Performance': 'search_principles_performance',
      'Search Principles Errors': 'search_principles_errors',
    });

  } else {
    // Get performance standards - 10% of traffic
    startTime = Date.now();
    response = http.get(`${BASE_URL}/standards/performance`, params);

    contentRequests.add(1, { type: 'get_standards' });
    getStandardsTrend.add(Date.now() - startTime);

    const checks = {
      'status code is 200': (r) => r.status === 200,
      'response time < 150ms': (r) => r.timings.duration < 150,
      'response is valid JSON': (r) => {
        try {
          JSON.parse(r.body);
          return true;
        } catch {
          return false;
        }
      },
      'response has standards array': (r) => {
        try {
          const body = JSON.parse(r.body);
          return Array.isArray(body);
        } catch {
          return false;
        }
      },
    };

    check(response, checks, {
      'Get Standards Performance': 'get_standards_performance',
      'Get Standards Errors': 'get_standards_errors',
    });
  }

  // Count errors
  if (response.status !== 200) {
    errorRate.add(1);
    console.error(`Content request failed: ${response.status}`, response.body);
  }

  // Add realistic think time
  sleep(Math.random() * 0.5);
}

export function teardown(data) {
  console.log('Content retrieval load test completed');
  console.log(`Total content requests made: ${contentRequests.values}`);
  console.log(`Peak concurrent users: ${Math.max(...authOptions.stages.map(s => s.target))}`);

  // Print final metrics summary
  console.log('=== Performance Summary ===');
  console.log(`Get Principles avg: ${getPrinciplesTrend.values.mean.toFixed(2)}ms`);
  console.log(`Search Principles avg: ${searchPrinciplesTrend.values.mean.toFixed(2)}ms`);
  console.log(`Get Standards avg: ${getStandardsTrend.values.mean.toFixed(2)}ms`);
}