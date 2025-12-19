import http from 'k6/http';
import { check, sleep, fail } from 'k6';
import { Rate, Counter, Trend } from 'k6/metrics';

export let errorRate = new Rate('errors');
export let authRequests = new Counter('authentication_requests');
export let authTrend = new Trend('authentication_response_time');

// Custom metrics
export const options = {
  stages: [
    { duration: '1m', target: 10 },   // Warm up
    { duration: '5m', target: 100 },  // Load test
    { duration: '10m', target: 1000 }, // Stress test
    { duration: '5m', target: 5000 }, // Peak load
    { duration: '10m', target: 1000 }, // Sustain load
    { duration: '5m', target: 0 },    // Cool down
  ],
  thresholds: {
    http_req_duration: ['p(95)<100'],  // 95% of requests must complete within 100ms
    http_req_failed: ['rate<0.001'],   // Less than 0.1% errors
    authentication_response_time: ['p(95)<100'],
    errors: ['rate<0.01'],             // Less than 1% error rate
  },
  summaryTimeUnit: 'ms',
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000/api';

// Test data configuration
const TEST_USERS = 50; // Number of unique users to simulate
const USER_PASSWORD = 'Password123!';

// User credentials pool
const userCredentials = [];

// Initialize test users
for (let i = 0; i < TEST_USERS; i++) {
  userCredentials.push({
    email: `testuser${i}@constitution.com`,
    password: USER_PASSWORD,
  });
}

export function setup() {
  console.log('Setting up authentication load test...');

  // Pre-create test users (if API supports it)
  // This is a placeholder - in real implementation, you'd need to create users first
  console.log(`Initialized ${TEST_USERS} test users`);

  return {
    userCount: TEST_USERS,
  };
}

export default function (data) {
  const userIndex = Math.floor(Math.random() * data.userCount);
  const credentials = userCredentials[userIndex];

  // Make authentication request
  const payload = JSON.stringify({
    email: credentials.email,
    password: credentials.password,
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const startTime = Date.now();
  const response = http.post(`${BASE_URL}/auth/login`, payload, params);
  const endTime = Date.now();

  // Record metrics
  authRequests.add(1);
  authTrend.add(endTime - startTime);

  const checks = {
    'status code is 200': (r) => r.status === 200,
    'response time < 100ms': (r) => r.timings.duration < 100,
    'response contains access token': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.access_token && body.access_token.length > 0;
      } catch {
        return false;
      }
    },
    'response contains refresh token': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.refresh_token && body.refresh_token.length > 0;
      } catch {
        return false;
      }
    },
    'response format is valid': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.access_token && body.expires_in && body.refresh_token;
      } catch {
        return false;
      }
    },
  };

  const result = check(response, checks, {
    'Authentication Performance': 'authentication_performance',
    'Authentication Errors': 'authentication_errors',
  });

  // Count errors
  if (!result) {
    errorRate.add(1);
    console.error(`Authentication failed for user ${userIndex}:`, response.status, response.body);
  }

  // Add VU-specific sleep for realistic behavior
  sleep(0.1);
}

export function teardown(data) {
  console.log('Authentication load test completed');
  console.log(`Total users simulated: ${data.userCount}`);
  console.log(`Peak concurrent users: ${Math.max(...options.stages.map(s => s.target))}`);
}