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
export let constitutionResponseTime = new Trend('constitution_response_time', true);
export let constitutionCounter = new Counter('constitution_requests');

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

// Test data - matches seeded metadata categories/tags
const CATEGORIES = ['performance', 'security', 'architecture', 'reliability', 'quality'];
const TAGS = [
  'api',
  'latency',
  'optimization',
  'authentication',
  'encryption',
  'scalability',
  'testing',
];

let createdPrincipleIds = [];
let adminToken = null;
let editorToken = null;
let seededPrincipleSlugs = [];
let seededPrincipleIds = [];

export function setup() {
  const adminEmail = __ENV.ADMIN_EMAIL || DEFAULT_USERS.admin.email;
  const adminPassword = __ENV.ADMIN_PASSWORD || DEFAULT_USERS.admin.password;

  const { accessToken: adminAccessToken } = mustLogin({
    baseUrl: BASE_URL,
    apiPrefix: API_PREFIX,
    email: adminEmail,
    password: adminPassword,
    label: 'constitution setup admin login',
  });

  const editorEmail = __ENV.EDITOR_EMAIL || DEFAULT_USERS.editor.email;
  const editorPassword = __ENV.EDITOR_PASSWORD || DEFAULT_USERS.editor.password;
  const editorAccessToken = login({
    baseUrl: BASE_URL,
    apiPrefix: API_PREFIX,
    email: editorEmail,
    password: editorPassword,
  }).accessToken;

  // Pull real slugs/ids for stable reads
  const listRes = http.get(
    buildUrl(`/principles${buildQuery({ page: 1, limit: 100 })}`, BASE_URL, API_PREFIX),
    requestParams(authHeaders(adminAccessToken)),
  );

  let principleSlugs = [
    'api-performance',
    'security-first',
    'horizontal-scalability',
    'system-reliability',
    'test-automation',
  ];
  let principleIds = [];

  if (listRes.status === 200) {
    const data = safeJsonValue(listRes, 'data');
    if (Array.isArray(data)) {
      principleSlugs = data.map((p) => p.slug).filter(Boolean);
      principleIds = data.map((p) => p.id).filter(Boolean);
    }
  }

  return {
    baseUrl: BASE_URL,
    apiPrefix: API_PREFIX,
    adminToken: adminAccessToken,
    editorToken: editorAccessToken,
    seededPrincipleSlugs: principleSlugs,
    seededPrincipleIds: principleIds,
  };
}

export default function(data) {
  const baseUrl = data.baseUrl;
  const apiPrefix = data.apiPrefix;
  adminToken = data.adminToken;
  editorToken = data.editorToken;
  seededPrincipleSlugs = data.seededPrincipleSlugs || [];
  seededPrincipleIds = data.seededPrincipleIds || [];

  const scenario = Math.random();

  if (scenario < 0.5) {
    listPrinciples(baseUrl, apiPrefix);
  } else if (scenario < 0.7) {
    getPrincipleBySlug(baseUrl, apiPrefix);
  } else if (scenario < 0.85) {
    searchPrinciples(baseUrl, apiPrefix);
  } else if (scenario < 0.95) {
    getRelatedPrinciples(baseUrl, apiPrefix);
  } else {
    if (adminToken || editorToken) {
      adminOperations(baseUrl, apiPrefix);
    }
  }

  sleep(1);
}

function listPrinciples(baseUrl, apiPrefix) {
  const page = Math.floor(Math.random() * 5) + 1;
  const limit = Math.random() > 0.5 ? 10 : 20;
  const category =
    Math.random() > 0.6 ? CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)] : '';

  const token = editorToken || adminToken;
  const url = buildUrl(
    `/principles${buildQuery({ page, limit, category })}`,
    baseUrl,
    apiPrefix,
  );

  const res = http.get(url, requestParams(authHeaders(token)));
  constitutionCounter.add(1);
  constitutionResponseTime.add(res.timings.duration);

	  const ok = check(res, {
	    'list principles status is 200': (r) => r.status === 200,
	    'list principles has data array': (r) => Array.isArray(safeJsonValue(r, 'data')),
	    'list principles has meta': (r) => safeJsonValue(r, 'meta') !== undefined,
	  });

  errorRate.add(!ok);
}

function getPrincipleBySlug(baseUrl, apiPrefix) {
  if (!seededPrincipleSlugs.length) return;
  const slug = seededPrincipleSlugs[Math.floor(Math.random() * seededPrincipleSlugs.length)];
  const token = editorToken || adminToken;

  const res = http.get(
    buildUrl(`/principles/${encodeURIComponent(slug)}`, baseUrl, apiPrefix),
    requestParams(authHeaders(token)),
  );
  constitutionCounter.add(1);
  constitutionResponseTime.add(res.timings.duration);

	  const ok = check(res, {
	    'get principle status is 200': (r) => r.status === 200,
	    'get principle has id': (r) => safeJsonValue(r, 'id') !== undefined,
	    'get principle has slug': (r) => safeJsonValue(r, 'slug') === slug,
	  });

  errorRate.add(!ok);
}

function searchPrinciples(baseUrl, apiPrefix) {
  const terms = ['performance', 'security', 'testing', 'scalability', 'api'];
  const search = terms[Math.floor(Math.random() * terms.length)];
  const token = editorToken || adminToken;

  const res = http.get(
    buildUrl(`/principles/search${buildQuery({ search, page: 1, limit: 10 })}`, baseUrl, apiPrefix),
    requestParams(authHeaders(token)),
  );
  constitutionCounter.add(1);
  constitutionResponseTime.add(res.timings.duration);

	  const ok = check(res, {
	    'search principles status is 200': (r) => r.status === 200,
	    'search principles has data array': (r) => Array.isArray(safeJsonValue(r, 'data')),
	    'search principles has meta': (r) => safeJsonValue(r, 'meta') !== undefined,
	  });

  errorRate.add(!ok);
}

function getRelatedPrinciples(baseUrl, apiPrefix) {
  if (!seededPrincipleSlugs.length) return;
  const slug = seededPrincipleSlugs[Math.floor(Math.random() * seededPrincipleSlugs.length)];
  const token = editorToken || adminToken;

  const res = http.get(
    buildUrl(`/principles/${encodeURIComponent(slug)}/related`, baseUrl, apiPrefix),
    requestParams(authHeaders(token)),
  );
  constitutionCounter.add(1);
  constitutionResponseTime.add(res.timings.duration);

	  const ok = check(res, {
	    'related principles status is 200': (r) => r.status === 200,
	    'related principles is array': (r) => Array.isArray(safeJsonValue(r)),
	  });

  errorRate.add(!ok);
}

function adminOperations(baseUrl, apiPrefix) {
  const operation = Math.random();
  if (operation < 0.6) createPrinciple(baseUrl, apiPrefix);
  else updatePrinciple(baseUrl, apiPrefix);
}

function createPrinciple(baseUrl, apiPrefix) {
  const randomId = Math.floor(Math.random() * 100000);
  const category = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
  const tag = TAGS[Math.floor(Math.random() * TAGS.length)];
  const token = adminToken || editorToken;

  const payload = JSON.stringify({
    slug: `load-test-principle-${randomId}`,
    title: `Load Test Principle ${randomId}`,
    description: `Created during k6 load testing (${randomId})`,
    priority: Math.floor(Math.random() * 5) + 1,
    metadata: {
      category,
      tags: [tag],
      relatedPrinciples: seededPrincipleIds.slice(0, 1),
      examples: [],
    },
  });

  const res = http.post(
    buildUrl('/principles', baseUrl, apiPrefix),
    payload,
    requestParams(authHeaders(token)),
  );
  constitutionCounter.add(1);
  constitutionResponseTime.add(res.timings.duration);

	  const ok = check(res, {
	    'create principle status is 201': (r) => r.status === 201,
	    'create principle has id': (r) => safeJsonValue(r, 'id') !== undefined,
	  });

  errorRate.add(!ok);

	  if (res.status === 201) {
	    const principleId = safeJsonValue(res, 'id');
	    if (principleId && !createdPrincipleIds.includes(principleId)) {
	      createdPrincipleIds.push(principleId);
	      if (createdPrincipleIds.length > 50) createdPrincipleIds.shift();
	    }
	  }
}

function updatePrinciple(baseUrl, apiPrefix) {
  if (!createdPrincipleIds.length) return;
  const principleId =
    createdPrincipleIds[Math.floor(Math.random() * createdPrincipleIds.length)];
  const category = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
  const token = adminToken || editorToken;

  const payload = JSON.stringify({
    title: `Updated Load Test Principle ${Date.now()}`,
    description: 'Updated during k6 load testing',
    metadata: { category },
  });

  const res = http.put(
    buildUrl(`/principles/${encodeURIComponent(principleId)}`, baseUrl, apiPrefix),
    payload,
    requestParams(authHeaders(token)),
  );
  constitutionCounter.add(1);
  constitutionResponseTime.add(res.timings.duration);

	  const ok = check(res, {
	    'update principle status is 200': (r) => r.status === 200,
	    'update principle has id': (r) => safeJsonValue(r, 'id') !== undefined,
	  });

  errorRate.add(!ok);
}

export function teardown() {
  console.log('Constitution load test completed');
}
