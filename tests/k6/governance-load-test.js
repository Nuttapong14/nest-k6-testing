import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import {
  DEFAULT_USERS,
  getBaseUrl,
  getApiPrefix,
  buildUrl,
  requestParams,
  authHeaders,
  mustLogin,
  login,
  safeJsonValue,
  scaleStages,
} from './lib/api.js';

// Custom metrics
export let errorRate = new Rate('errors');
export let governanceResponseTime = new Trend('governance_response_time', true);
export let governanceCounter = new Counter('governance_requests');

// Test configuration
export let options = {
  stages: scaleStages([
    { duration: '2m', target: 200 }, // Ramp up to 200 users
    { duration: '5m', target: 500 }, // Stay at 500 users
    { duration: '2m', target: 1000 }, // Ramp up to 1000 users
    { duration: '1m', target: 0 }, // Ramp down
  ]),
  thresholds: {
    http_req_duration: ['p(95)<150'],
    http_req_failed: ['rate<0.1'],
    errors: ['rate<0.1'],
  },
  insecureSkipTLSVerify: true,
};

const BASE_URL = getBaseUrl();
const API_PREFIX = getApiPrefix();

let adminToken = null;
let editorToken = null;

export function setup() {
  const adminEmail = __ENV.ADMIN_EMAIL || DEFAULT_USERS.admin.email;
  const adminPassword = __ENV.ADMIN_PASSWORD || DEFAULT_USERS.admin.password;
  const { accessToken: adminAccessToken } = mustLogin({
    baseUrl: BASE_URL,
    apiPrefix: API_PREFIX,
    email: adminEmail,
    password: adminPassword,
    label: 'governance setup admin login',
  });

  const editorEmail = __ENV.EDITOR_EMAIL || DEFAULT_USERS.editor.email;
  const editorPassword = __ENV.EDITOR_PASSWORD || DEFAULT_USERS.editor.password;
  const editorAccessToken = login({
    baseUrl: BASE_URL,
    apiPrefix: API_PREFIX,
    email: editorEmail,
    password: editorPassword,
  }).accessToken;

  return {
    baseUrl: BASE_URL,
    apiPrefix: API_PREFIX,
    adminToken: adminAccessToken,
    editorToken: editorAccessToken,
  };
}

export default function(data) {
  const baseUrl = data.baseUrl;
  const apiPrefix = data.apiPrefix;
  adminToken = data.adminToken;
  editorToken = data.editorToken;

  const scenario = Math.random();

  if (scenario < 0.45) {
    getAmendments(baseUrl, apiPrefix);
  } else if (scenario < 0.9) {
    getComplianceChecks(baseUrl, apiPrefix);
  } else {
    createAmendment(baseUrl, apiPrefix);
  }

  sleep(1);
}

function getAmendments(baseUrl, apiPrefix) {
  const token = editorToken || adminToken;
  const res = http.get(
    buildUrl('/governance/amendments', baseUrl, apiPrefix),
    requestParams(authHeaders(token)),
  );
  governanceCounter.add(1);
  governanceResponseTime.add(res.timings.duration);

	  const ok = check(res, {
	    'get amendments status is 200': (r) => r.status === 200,
	    'get amendments has message': (r) => typeof safeJsonValue(r, 'message') === 'string',
	  });

  errorRate.add(!ok);
}

function getComplianceChecks(baseUrl, apiPrefix) {
  const token = editorToken || adminToken;
  const res = http.get(
    buildUrl('/governance/compliance', baseUrl, apiPrefix),
    requestParams(authHeaders(token)),
  );
  governanceCounter.add(1);
  governanceResponseTime.add(res.timings.duration);

	  const ok = check(res, {
	    'get compliance status is 200': (r) => r.status === 200,
	    'get compliance has message': (r) => typeof safeJsonValue(r, 'message') === 'string',
	  });

  errorRate.add(!ok);
}

function createAmendment(baseUrl, apiPrefix) {
  const token = editorToken || adminToken;
  const randomId = Math.floor(Math.random() * 100000);

  const payload = JSON.stringify({
    title: `Load Test Amendment ${randomId}`,
    description: `Created during k6 load testing (${randomId})`,
    proposedBy: 'k6',
    status: 'pending',
  });

  const res = http.post(
    buildUrl('/governance/amendments', baseUrl, apiPrefix),
    payload,
    requestParams(authHeaders(token)),
  );
  governanceCounter.add(1);
  governanceResponseTime.add(res.timings.duration);

	  const ok = check(res, {
	    'create amendment status is 201': (r) => r.status === 201,
	    'create amendment has message': (r) => typeof safeJsonValue(r, 'message') === 'string',
	    'create amendment echoes data': (r) => safeJsonValue(r, 'data') !== undefined,
	  });

  errorRate.add(!ok);
}

export function teardown() {
  console.log('Governance load test completed');
}
