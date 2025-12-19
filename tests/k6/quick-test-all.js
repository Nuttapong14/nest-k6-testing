import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import {
  DEFAULT_USERS,
  getBaseUrl,
  getApiPrefix,
  buildUrl,
  buildQuery,
  requestParams,
  authHeaders,
  mustLogin,
  safeJsonValue,
  scaleStages,
} from './lib/api.js';

// Custom metrics
export let errorRate = new Rate('errors');
export let responseTime = new Trend('response_time', true);
export let requestCounter = new Counter('total_requests');

// Quick test configuration - 2 minutes total
export let options = {
  stages: scaleStages([
    { duration: '30s', target: 50 },
    { duration: '60s', target: 100 },
    { duration: '30s', target: 0 },
  ]),
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.1'],
    errors: ['rate<0.1'],
  },
  insecureSkipTLSVerify: true,
};

const BASE_URL = getBaseUrl();
const API_PREFIX = getApiPrefix();

export function setup() {
  const adminEmail = __ENV.ADMIN_EMAIL || DEFAULT_USERS.admin.email;
  const adminPassword = __ENV.ADMIN_PASSWORD || DEFAULT_USERS.admin.password;
  const { accessToken } = mustLogin({
    baseUrl: BASE_URL,
    apiPrefix: API_PREFIX,
    email: adminEmail,
    password: adminPassword,
    label: 'quick test setup login',
  });

  return {
    baseUrl: BASE_URL,
    apiPrefix: API_PREFIX,
    token: accessToken,
  };
}

export default function(data) {
  const baseUrl = data.baseUrl;
  const apiPrefix = data.apiPrefix;
  const token = data.token;

  const scenario = Math.random();

  if (scenario < 0.2) testAuth(baseUrl, apiPrefix);
  else if (scenario < 0.35) testConstitution(baseUrl, apiPrefix, token);
  else if (scenario < 0.5) testPerformance(baseUrl, apiPrefix, token);
  else if (scenario < 0.65) testGovernance(baseUrl, apiPrefix, token);
  else if (scenario < 0.8) testSearch(baseUrl, apiPrefix, token);
  else testHealth(baseUrl, apiPrefix);

  sleep(0.5);
}

function testAuth(baseUrl, apiPrefix) {
  group('Auth', function () {
    const payload = JSON.stringify({
      email: __ENV.EDITOR_EMAIL || DEFAULT_USERS.editor.email,
      password: __ENV.EDITOR_PASSWORD || DEFAULT_USERS.editor.password,
    });

    const res = http.post(
      buildUrl('/auth/login', baseUrl, apiPrefix),
      payload,
      requestParams({ 'Content-Type': 'application/json' }),
    );
    record(res);

	    const ok = check(res, {
	      'auth login ok': (r) => r.status === 200,
	      'auth has token': (r) => safeJsonValue(r, 'accessToken') !== undefined,
	    });

    errorRate.add(!ok);
  });
}

function testConstitution(baseUrl, apiPrefix, token) {
  group('Constitution', function () {
    const res = http.get(
      buildUrl(`/principles${buildQuery({ page: 1, limit: 10 })}`, baseUrl, apiPrefix),
      requestParams(authHeaders(token)),
    );
    record(res);

	    const ok = check(res, {
	      'principles list ok': (r) => r.status === 200,
	      'principles has data': (r) => Array.isArray(safeJsonValue(r, 'data')),
	    });

    errorRate.add(!ok);
  });
}

function testPerformance(baseUrl, apiPrefix, token) {
  group('Performance', function () {
    const res = http.get(
      buildUrl(`/performance/standards${buildQuery({ page: 1, limit: 10 })}`, baseUrl, apiPrefix),
      requestParams(authHeaders(token)),
    );
    record(res);

	    const ok = check(res, {
	      'performance list ok': (r) => r.status === 200,
	      'performance has data': (r) => Array.isArray(safeJsonValue(r, 'data')),
	    });

    errorRate.add(!ok);
  });
}

function testGovernance(baseUrl, apiPrefix, token) {
  group('Governance', function () {
    const res = http.get(
      buildUrl('/governance/amendments', baseUrl, apiPrefix),
      requestParams(authHeaders(token)),
    );
    record(res);

    const ok = check(res, {
      'governance amendments ok': (r) => r.status === 200,
    });

    errorRate.add(!ok);
  });
}

function testSearch(baseUrl, apiPrefix, token) {
  group('Search', function () {
    const res = http.get(
      buildUrl(`/items${buildQuery({ query: 'quality', page: 1, limit: 10 })}`, baseUrl, apiPrefix),
      requestParams(authHeaders(token)),
    );
    record(res);

	    const ok = check(res, {
	      'search ok': (r) => r.status === 200,
	      'search has data': (r) => Array.isArray(safeJsonValue(r, 'data')),
	    });

    errorRate.add(!ok);
  });
}

function testHealth(baseUrl, apiPrefix) {
  group('Health', function () {
    const res = http.get(buildUrl('/health', baseUrl, apiPrefix));
    record(res);

	    const ok = check(res, {
	      'health ok': (r) => r.status === 200,
	      'health status ok': (r) => safeJsonValue(r, 'status') === 'ok',
	    });

    errorRate.add(!ok);
  });
}

function record(res) {
  requestCounter.add(1);
  responseTime.add(res.timings.duration);
}

export function teardown() {
  console.log('\n=== QUICK API LOAD TEST COMPLETED ===\n');
}
