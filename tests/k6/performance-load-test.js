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
  mustLogin,
  login,
  safeJsonValue,
  scaleStages,
} from './lib/api.js';

// Custom metrics
export let errorRate = new Rate('errors');
export let performanceResponseTime = new Trend('performance_response_time', true);
export let performanceCounter = new Counter('performance_requests');

// Test configuration
export let options = {
  stages: scaleStages([
    { duration: '2m', target: 200 }, // Ramp up to 200 users
    { duration: '5m', target: 500 }, // Stay at 500 users
    { duration: '2m', target: 1000 }, // Ramp up to 1000 users
    { duration: '1m', target: 0 }, // Ramp down
  ]),
  thresholds: {
    http_req_duration: ['p(95)<150'], // 95% of requests should be below 150ms
    http_req_failed: ['rate<0.1'], // Error rate should be less than 10%
    errors: ['rate<0.1'],
  },
  insecureSkipTLSVerify: true,
};

const BASE_URL = getBaseUrl();
const API_PREFIX = getApiPrefix();

const ENDPOINT_TYPES = [
  'authentication',
  'search',
  'payment',
  'profile',
  'constitution',
  'governance',
  'load-testing',
];
const METRIC_TYPES = ['95th_percentile', 'average', 'max', 'min'];

let adminToken = null;
let seededStandardIds = [];
let seededPrincipleIds = [];
let createdStandardIds = [];

export function setup() {
  const adminEmail = __ENV.ADMIN_EMAIL || DEFAULT_USERS.admin.email;
  const adminPassword = __ENV.ADMIN_PASSWORD || DEFAULT_USERS.admin.password;

  const { accessToken } = mustLogin({
    baseUrl: BASE_URL,
    apiPrefix: API_PREFIX,
    email: adminEmail,
    password: adminPassword,
    label: 'performance setup admin login',
  });

  const standardsRes = http.get(
    buildUrl(`/performance/standards${buildQuery({ page: 1, limit: 100 })}`, BASE_URL, API_PREFIX),
    requestParams(authHeaders(accessToken)),
  );

	  let standardIds = [];
	  let principleIds = [];
	  if (standardsRes.status === 200) {
	    const data = safeJsonValue(standardsRes, 'data');
	    if (Array.isArray(data)) {
	      standardIds = data.map((s) => s.id).filter(Boolean);
	      principleIds = data.map((s) => s.principleId).filter(Boolean);
	    }
	  }

  // If standards list is empty, pull principles as a fallback for create tests
  if (!principleIds.length) {
    const principlesRes = http.get(
      buildUrl(`/principles${buildQuery({ page: 1, limit: 100 })}`, BASE_URL, API_PREFIX),
      requestParams(authHeaders(accessToken)),
    );
	    if (principlesRes.status === 200) {
	      const data = safeJsonValue(principlesRes, 'data');
	      if (Array.isArray(data)) {
	        principleIds = data.map((p) => p.id).filter(Boolean);
	      }
	    }
	  }

  return {
    baseUrl: BASE_URL,
    apiPrefix: API_PREFIX,
    adminToken: accessToken,
    seededStandardIds: standardIds,
    seededPrincipleIds: [...new Set(principleIds)],
  };
}

export default function(data) {
  const baseUrl = data.baseUrl;
  const apiPrefix = data.apiPrefix;
  adminToken = data.adminToken;
  seededStandardIds = data.seededStandardIds || [];
  seededPrincipleIds = data.seededPrincipleIds || [];

  const scenario = Math.random();

  if (scenario < 0.4) {
    listPerformanceStandards(baseUrl, apiPrefix);
  } else if (scenario < 0.65) {
    getStandardsByEndpoint(baseUrl, apiPrefix);
  } else if (scenario < 0.85) {
    getPerformanceStandard(baseUrl, apiPrefix);
  } else if (scenario < 0.95) {
    getStandardsByPrinciple(baseUrl, apiPrefix);
  } else {
    if (adminToken) adminOperations(baseUrl, apiPrefix);
  }

  sleep(1);
}

function listPerformanceStandards(baseUrl, apiPrefix) {
  const page = Math.floor(Math.random() * 3) + 1;
  const limit = Math.random() > 0.5 ? 10 : 20;
  const endpointType =
    Math.random() > 0.7
      ? ENDPOINT_TYPES[Math.floor(Math.random() * ENDPOINT_TYPES.length)]
      : '';

  const res = http.get(
    buildUrl(
      `/performance/standards${buildQuery({ page, limit, endpointType })}`,
      baseUrl,
      apiPrefix,
    ),
    requestParams(authHeaders(adminToken)),
  );
  performanceCounter.add(1);
  performanceResponseTime.add(res.timings.duration);

	  const ok = check(res, {
	    'list standards status is 200': (r) => r.status === 200,
	    'list standards has data array': (r) => Array.isArray(safeJsonValue(r, 'data')),
	    'list standards has meta': (r) => safeJsonValue(r, 'meta') !== undefined,
	  });

  errorRate.add(!ok);
}

function getStandardsByEndpoint(baseUrl, apiPrefix) {
  const endpointType = ENDPOINT_TYPES[Math.floor(Math.random() * ENDPOINT_TYPES.length)];

  const res = http.get(
    buildUrl(`/performance/standards/by-endpoint/${encodeURIComponent(endpointType)}`, baseUrl, apiPrefix),
    requestParams(authHeaders(adminToken)),
  );
  performanceCounter.add(1);
  performanceResponseTime.add(res.timings.duration);

	  const ok = check(res, {
	    'get by endpoint status is 200': (r) => r.status === 200,
	    'get by endpoint is array': (r) => Array.isArray(safeJsonValue(r)),
	  });

  errorRate.add(!ok);
}

function getPerformanceStandard(baseUrl, apiPrefix) {
  const candidates = createdStandardIds.length ? createdStandardIds : seededStandardIds;
  if (!candidates.length) return;
  const standardId = candidates[Math.floor(Math.random() * candidates.length)];

  const res = http.get(
    buildUrl(`/performance/standards/${encodeURIComponent(standardId)}`, baseUrl, apiPrefix),
    requestParams(authHeaders(adminToken)),
  );
  performanceCounter.add(1);
  performanceResponseTime.add(res.timings.duration);

	  const ok = check(res, {
	    'get standard status is 200': (r) => r.status === 200,
	    'get standard has id': (r) => safeJsonValue(r, 'id') !== undefined,
	    'get standard has endpointType': (r) => safeJsonValue(r, 'endpointType') !== undefined,
	  });

  errorRate.add(!ok);
}

function getStandardsByPrinciple(baseUrl, apiPrefix) {
  if (!seededPrincipleIds.length) return;
  const principleId = seededPrincipleIds[Math.floor(Math.random() * seededPrincipleIds.length)];

  const res = http.get(
    buildUrl(`/performance/standards/principle/${encodeURIComponent(principleId)}`, baseUrl, apiPrefix),
    requestParams(authHeaders(adminToken)),
  );
  performanceCounter.add(1);
  performanceResponseTime.add(res.timings.duration);

	  const ok = check(res, {
	    'get by principle status is 200': (r) => r.status === 200,
	    'get by principle is array': (r) => Array.isArray(safeJsonValue(r)),
	  });

  errorRate.add(!ok);
}

function adminOperations(baseUrl, apiPrefix) {
  const operation = Math.random();
  if (operation < 0.6) createPerformanceStandard(baseUrl, apiPrefix);
  else if (operation < 0.9) updatePerformanceStandard(baseUrl, apiPrefix);
  else deletePerformanceStandard(baseUrl, apiPrefix);
}

function createPerformanceStandard(baseUrl, apiPrefix) {
  if (!seededPrincipleIds.length) return;
  const randomId = Math.floor(Math.random() * 100000);
  const principleId = seededPrincipleIds[Math.floor(Math.random() * seededPrincipleIds.length)];
  const endpointType = ENDPOINT_TYPES[Math.floor(Math.random() * ENDPOINT_TYPES.length)];
  const metricType = METRIC_TYPES[Math.floor(Math.random() * METRIC_TYPES.length)];

  const payload = JSON.stringify({
    principleId,
    name: `Load Test Standard ${randomId}`,
    endpointType,
    targetResponseTime: Math.floor(Math.random() * 450) + 50,
    metricType,
    concurrentUsers: Math.floor(Math.random() * 2000) + 50,
    additionalMetrics: {
      errorRate: 0.1,
      throughput: 1000,
    },
    description: `Created during k6 load testing (${randomId})`,
  });

  const res = http.post(
    buildUrl('/performance/standards', baseUrl, apiPrefix),
    payload,
    requestParams(authHeaders(adminToken)),
  );
  performanceCounter.add(1);
  performanceResponseTime.add(res.timings.duration);

	  const ok = check(res, {
	    'create standard status is 201': (r) => r.status === 201,
	    'create standard has id': (r) => safeJsonValue(r, 'id') !== undefined,
	  });

  errorRate.add(!ok);

	  if (res.status === 201) {
	    const standardId = safeJsonValue(res, 'id');
	    if (standardId && !createdStandardIds.includes(standardId)) {
	      createdStandardIds.push(standardId);
	      if (createdStandardIds.length > 50) createdStandardIds.shift();
	    }
	  }
}

function updatePerformanceStandard(baseUrl, apiPrefix) {
  if (!createdStandardIds.length) return;
  const standardId = createdStandardIds[Math.floor(Math.random() * createdStandardIds.length)];

  const payload = JSON.stringify({
    targetResponseTime: Math.floor(Math.random() * 450) + 50,
    metricType: METRIC_TYPES[Math.floor(Math.random() * METRIC_TYPES.length)],
    description: `Updated during k6 load testing (${Date.now()})`,
  });

  const res = http.put(
    buildUrl(`/performance/standards/${encodeURIComponent(standardId)}`, baseUrl, apiPrefix),
    payload,
    requestParams(authHeaders(adminToken)),
  );
  performanceCounter.add(1);
  performanceResponseTime.add(res.timings.duration);

	  const ok = check(res, {
	    'update standard status is 200': (r) => r.status === 200,
	    'update standard has id': (r) => safeJsonValue(r, 'id') !== undefined,
	  });

  errorRate.add(!ok);
}

function deletePerformanceStandard(baseUrl, apiPrefix) {
  if (!createdStandardIds.length) return;
  const standardId = createdStandardIds.pop();

  const res = http.del(
    buildUrl(`/performance/standards/${encodeURIComponent(standardId)}`, baseUrl, apiPrefix),
    null,
    requestParams(authHeaders(adminToken)),
  );
  performanceCounter.add(1);
  performanceResponseTime.add(res.timings.duration);

  const ok = check(res, {
    'delete standard status is 204': (r) => r.status === 204,
  });

  errorRate.add(!ok);
}

export function teardown() {
  console.log('Performance standards load test completed');
}
