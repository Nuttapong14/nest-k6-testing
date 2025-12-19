import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';
import {
  DEFAULT_USERS,
  getBaseUrl,
  getApiPrefix,
  buildUrl,
  requestParams,
  jsonHeaders,
  authHeaders,
  mustLogin,
  safeJsonValue,
  scaleStages,
} from './lib/api.js';

// Custom metrics
export let errorRate = new Rate('errors');
export let authResponseTime = new Trend('auth_response_time', true);

// Test configuration
export let options = {
  stages: scaleStages([
    { duration: '2m', target: 200 }, // Ramp up to 200 users
    { duration: '5m', target: 500 }, // Stay at 500 users
    { duration: '2m', target: 1000 }, // Ramp up to 1000 users
    { duration: '1m', target: 0 }, // Ramp down
  ]),
  thresholds: {
    http_req_duration: ['p(95)<100'], // 95% of requests should be below 100ms
    http_req_failed: ['rate<0.1'], // Error rate should be less than 10%
    errors: ['rate<0.1'],
  },
  insecureSkipTLSVerify: true,
};

const BASE_URL = getBaseUrl();
const API_PREFIX = getApiPrefix();

// Test data - using credentials from database seed migration
const users = [
  {
    email: __ENV.ADMIN_EMAIL || DEFAULT_USERS.admin.email,
    password: __ENV.ADMIN_PASSWORD || DEFAULT_USERS.admin.password,
  },
  {
    email: __ENV.EDITOR_EMAIL || DEFAULT_USERS.editor.email,
    password: __ENV.EDITOR_PASSWORD || DEFAULT_USERS.editor.password,
  },
  {
    email: __ENV.VIEWER_EMAIL || DEFAULT_USERS.viewer.email,
    password: __ENV.VIEWER_PASSWORD || DEFAULT_USERS.viewer.password,
  },
];

export function setup() {
  // Verify credentials & API routing once before the load test starts.
  mustLogin({
    baseUrl: BASE_URL,
    apiPrefix: API_PREFIX,
    email: users[0].email,
    password: users[0].password,
    label: 'auth setup login',
  });

  return {
    baseUrl: BASE_URL,
    apiPrefix: API_PREFIX,
  };
}

export default function(data) {
  const baseUrl = data.baseUrl;
  const apiPrefix = data.apiPrefix;
  const user = users[Math.floor(Math.random() * users.length)];

  // Test login endpoint
  const loginPayload = JSON.stringify({
    email: user.email,
    password: user.password,
  });

  const loginParams = {
    headers: jsonHeaders(),
  };

  let loginResponse = http.post(
    buildUrl('/auth/login', baseUrl, apiPrefix),
    loginPayload,
    loginParams,
  );

  const loginOk = check(loginResponse, {
    'login status is 200': (r) => r.status === 200,
    'login has access token': (r) => safeJsonValue(r, 'accessToken') !== undefined,
    'login has refresh token': (r) => safeJsonValue(r, 'refreshToken') !== undefined,
  });

  check(loginResponse, {
    'login response time < 100ms': (r) => r.timings.duration < 100,
  });

  errorRate.add(!loginOk);
  authResponseTime.add(loginResponse.timings.duration);

  if (loginOk) {
    const accessToken = safeJsonValue(loginResponse, 'accessToken');
    const refreshToken = safeJsonValue(loginResponse, 'refreshToken');

    // Test protected profile endpoint
    const profileParams = requestParams(authHeaders(accessToken));

    let profileResponse = http.get(buildUrl('/auth/profile', baseUrl, apiPrefix), profileParams);

    let profileSuccess = check(profileResponse, {
      'profile status is 200': (r) => r.status === 200,
      'profile response time < 100ms': (r) => r.timings.duration < 100,
      'profile has user email': (r) => safeJsonValue(r, 'email') !== undefined,
    });

    errorRate.add(!profileSuccess);
    authResponseTime.add(profileResponse.timings.duration);

    // Test token refresh
    const refreshPayload = JSON.stringify({
      refreshToken: refreshToken,
    });

    const refreshParams = {
      headers: jsonHeaders(),
    };

    let refreshResponse = http.post(
      buildUrl('/auth/refresh', baseUrl, apiPrefix),
      refreshPayload,
      refreshParams,
    );

    let refreshSuccess = check(refreshResponse, {
      'refresh status is 200': (r) => r.status === 200,
      'refresh response time < 100ms': (r) => r.timings.duration < 100,
      'refresh has new access token': (r) => safeJsonValue(r, 'accessToken') !== undefined,
    });

    errorRate.add(!refreshSuccess);
    authResponseTime.add(refreshResponse.timings.duration);
  }

  sleep(1);
}

export function teardown() {
  console.log('Auth load test completed');
}
