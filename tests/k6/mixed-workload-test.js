import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import {
  DEFAULT_USERS,
  getBaseUrl,
  getApiPrefix,
  buildUrl,
  buildQuery,
  requestParams,
  authHeaders,
  jsonHeaders,
  mustLogin,
  safeJsonValue,
  scaleStages,
} from './lib/api.js';

// Custom metrics
export let errorRate = new Rate('errors');
export let responseTime = new Trend('mixed_response_time', true);
export let requestCounter = new Counter('total_requests');

// Endpoint-specific metrics
export let authResponseTime = new Trend('auth_response_time', true);
export let searchResponseTime = new Trend('search_response_time', true);
export let paymentResponseTime = new Trend('payment_response_time', true);

export let authCounter = new Counter('auth_requests');
export let searchCounter = new Counter('search_requests');
export let paymentCounter = new Counter('payment_requests');

export let options = {
  stages: scaleStages([
    { duration: '2m', target: 1000 },
    { duration: '3m', target: 3000 },
    { duration: '5m', target: 7000 },
    { duration: '3m', target: 10000 },
    { duration: '2m', target: 3000 },
    { duration: '1m', target: 0 },
  ]),
  thresholds: {
    http_req_duration: ['p(95)<1200'],
    http_req_failed: ['rate<0.05'],
    errors: ['rate<0.05'],
    auth_response_time: ['p(95)<300'],
    search_response_time: ['p(95)<500'],
    payment_response_time: ['p(95)<1200'],
  },
  insecureSkipTLSVerify: true,
};

const BASE_URL = getBaseUrl();
const API_PREFIX = getApiPrefix();

const USERS = [
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

const SEARCH_TERMS = [
  'principle',
  'constitution',
  'governance',
  'performance',
  'security',
  'delivery',
  'quality',
  'innovation',
  'testing',
  'scalability',
];

const PAYMENT_METHODS = ['credit_card', 'debit_card', 'paypal'];
const PAYMENT_AMOUNTS = [9.99, 19.99, 49.99];

export function setup() {
  const { accessToken, refreshToken } = mustLogin({
    baseUrl: BASE_URL,
    apiPrefix: API_PREFIX,
    email: USERS[0].email,
    password: USERS[0].password,
    label: 'mixed workload setup login',
  });

  return {
    baseUrl: BASE_URL,
    apiPrefix: API_PREFIX,
    accessToken,
    refreshToken,
  };
}

export default function(data) {
  const baseUrl = data.baseUrl;
  const apiPrefix = data.apiPrefix;
  const accessToken = data.accessToken;

  const userScenario = Math.random();

  if (userScenario < 0.15) performAuthFlow(baseUrl, apiPrefix);
  else if (userScenario < 0.55) performSearchFlow(baseUrl, apiPrefix, accessToken);
  else if (userScenario < 0.8) performPaymentFlow(baseUrl, apiPrefix, accessToken);
  else performMixedFlow(baseUrl, apiPrefix, accessToken);

  sleep(Math.random() * 2 + 0.5);
}

function performAuthFlow(baseUrl, apiPrefix) {
  const user = USERS[Math.floor(Math.random() * USERS.length)];

  const loginPayload = JSON.stringify({ email: user.email, password: user.password });
  const loginRes = http.post(
    buildUrl('/auth/login', baseUrl, apiPrefix),
    loginPayload,
    requestParams(jsonHeaders()),
  );
  recordRequest('auth', loginRes);

  if (loginRes.status !== 200) return;

  const newAccessToken = safeJsonValue(loginRes, 'accessToken');
  const newRefreshToken = safeJsonValue(loginRes, 'refreshToken');
  if (!newAccessToken) return;

  const profileRes = http.get(
    buildUrl('/auth/profile', baseUrl, apiPrefix),
    requestParams(authHeaders(newAccessToken)),
  );
  recordRequest('auth', profileRes);

  if (Math.random() < 0.3 && newRefreshToken) {
    const refreshPayload = JSON.stringify({ refreshToken: newRefreshToken });
    const refreshRes = http.post(
      buildUrl('/auth/refresh', baseUrl, apiPrefix),
      refreshPayload,
      requestParams(jsonHeaders()),
    );
    recordRequest('auth', refreshRes);
  }
}

function performSearchFlow(baseUrl, apiPrefix, accessToken) {
  const numOps = Math.floor(Math.random() * 3) + 1;

  for (let i = 0; i < numOps; i++) {
    const scenario = Math.random();

    let url;
    if (scenario < 0.6) {
      const query = SEARCH_TERMS[Math.floor(Math.random() * SEARCH_TERMS.length)];
      const page = Math.floor(Math.random() * 3) + 1;
      url = buildUrl(`/items${buildQuery({ query, page, limit: 20 })}`, baseUrl, apiPrefix);
    } else if (scenario < 0.8) {
      url = buildUrl(`/principles${buildQuery({ page: 1, limit: 10 })}`, baseUrl, apiPrefix);
    } else {
      url = buildUrl(`/performance/standards${buildQuery({ page: 1, limit: 10 })}`, baseUrl, apiPrefix);
    }

    const res = http.get(url, requestParams(authHeaders(accessToken)));
    recordRequest('search', res);
    sleep(0.1);
  }
}

function performPaymentFlow(baseUrl, apiPrefix, accessToken) {
  const paymentMethod = PAYMENT_METHODS[Math.floor(Math.random() * PAYMENT_METHODS.length)];
  const amount = PAYMENT_AMOUNTS[Math.floor(Math.random() * PAYMENT_AMOUNTS.length)];

  const payload = JSON.stringify({
    amount,
    currency: 'USD',
    paymentMethod,
    description: `k6 payment ${Date.now()}`,
    receiptEmail: 'buyer@example.com',
  });

  const createRes = http.post(
    buildUrl('/payments', baseUrl, apiPrefix),
    payload,
    requestParams(authHeaders(accessToken)),
  );
  recordRequest('payment', createRes);

  if (createRes.status !== 201) return;

  const paymentId = safeJsonValue(createRes, 'id');
  if (!paymentId) return;

  sleep(0.5);

  const statusRes = http.get(
    buildUrl(`/payments/${encodeURIComponent(paymentId)}`, baseUrl, apiPrefix),
    requestParams(authHeaders(accessToken)),
  );
  recordRequest('payment', statusRes);
}

function performMixedFlow(baseUrl, apiPrefix, accessToken) {
  const query = SEARCH_TERMS[Math.floor(Math.random() * SEARCH_TERMS.length)];
  const searchRes = http.get(
    buildUrl(`/items${buildQuery({ query, limit: 5 })}`, baseUrl, apiPrefix),
    requestParams(authHeaders(accessToken)),
  );
  recordRequest('search', searchRes);

  if (searchRes.status !== 200) return;

  sleep(0.2);

  const paymentMethod = PAYMENT_METHODS[Math.floor(Math.random() * PAYMENT_METHODS.length)];
  const amount = PAYMENT_AMOUNTS[Math.floor(Math.random() * PAYMENT_AMOUNTS.length)];

  const payload = JSON.stringify({
    amount,
    currency: 'USD',
    paymentMethod,
    description: `k6 mixed payment ${Date.now()}`,
  });

  const paymentRes = http.post(
    buildUrl('/payments', baseUrl, apiPrefix),
    payload,
    requestParams(authHeaders(accessToken)),
  );
  recordRequest('payment', paymentRes);
}

function recordRequest(type, res) {
  requestCounter.add(1);
  responseTime.add(res.timings.duration);

  switch (type) {
    case 'auth':
      authCounter.add(1);
      authResponseTime.add(res.timings.duration);
      break;
    case 'search':
      searchCounter.add(1);
      searchResponseTime.add(res.timings.duration);
      break;
    case 'payment':
      paymentCounter.add(1);
      paymentResponseTime.add(res.timings.duration);
      break;
  }

  const ok = check(res, { 'status < 400': (r) => r.status > 0 && r.status < 400 });
  errorRate.add(!ok);
}

export function teardown() {
  console.log('\n=== Mixed Workload Load Test Completed ===\n');
}
