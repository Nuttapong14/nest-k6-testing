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
  safeJsonValue,
  scaleStages,
} from './lib/api.js';

// Custom metrics
export let errorRate = new Rate('errors');
export let searchResponseTime = new Trend('search_response_time', true);
export let searchCounter = new Counter('search_requests');

// Test configuration
export let options = {
  stages: scaleStages([
    { duration: '3m', target: 1000 }, // Ramp up to 1000 users
    { duration: '5m', target: 3000 }, // Stay at 3000 users
    { duration: '5m', target: 5000 }, // Ramp up to 5000 users
    { duration: '2m', target: 1000 }, // Scale down to 1000 users
    { duration: '1m', target: 0 }, // Ramp down
  ]),
  thresholds: {
    http_req_duration: ['p(95)<150'],
    http_req_failed: ['rate<0.05'],
    errors: ['rate<0.05'],
  },
  insecureSkipTLSVerify: true,
};

const BASE_URL = getBaseUrl();
const API_PREFIX = getApiPrefix();

const SEARCH_TERMS = [
  'principle',
  'constitution',
  'governance',
  'performance',
  'security',
  'accountability',
  'agile',
  'delivery',
  'quality',
  'innovation',
  'collaboration',
  'continuous',
  'improvement',
];

const CATEGORIES = [
  'performance',
  'security',
  'architecture',
  'reliability',
  'quality',
  // Performance standard endpointType categories
  'authentication',
  'search',
  'payment',
];

const TAGS = [
  'api',
  'latency',
  'optimization',
  'authentication',
  'encryption',
  'testing',
  'scalability',
];

export function setup() {
  const adminEmail = __ENV.ADMIN_EMAIL || DEFAULT_USERS.admin.email;
  const adminPassword = __ENV.ADMIN_PASSWORD || DEFAULT_USERS.admin.password;

  const { accessToken } = mustLogin({
    baseUrl: BASE_URL,
    apiPrefix: API_PREFIX,
    email: adminEmail,
    password: adminPassword,
    label: 'search setup login',
  });

  return {
    baseUrl: BASE_URL,
    apiPrefix: API_PREFIX,
    accessToken,
  };
}

export default function(data) {
  const baseUrl = data.baseUrl;
  const apiPrefix = data.apiPrefix;
  const accessToken = data.accessToken;

  const scenario = Math.random();

  if (scenario < 0.4) performTextSearch(baseUrl, apiPrefix, accessToken);
  else if (scenario < 0.6) performCategorySearch(baseUrl, apiPrefix, accessToken);
  else if (scenario < 0.8) performTagsSearch(baseUrl, apiPrefix, accessToken);
  else performCombinedSearch(baseUrl, apiPrefix, accessToken);

  sleep(0.5);
}

function performTextSearch(baseUrl, apiPrefix, accessToken) {
  const query = SEARCH_TERMS[Math.floor(Math.random() * SEARCH_TERMS.length)];
  const page = Math.floor(Math.random() * 5) + 1;
  const limit = Math.random() > 0.5 ? 10 : 20;

  const url = buildUrl(
    `/items${buildQuery({ query, page, limit })}`,
    baseUrl,
    apiPrefix,
  );

  const res = http.get(url, requestParams(authHeaders(accessToken)));
  searchCounter.add(1);
  searchResponseTime.add(res.timings.duration);

	  const ok = check(res, {
	    'search status is 200': (r) => r.status === 200,
	    'search has data array': (r) => Array.isArray(safeJsonValue(r, 'data')),
	    'search has meta': (r) => safeJsonValue(r, 'meta') !== undefined,
	  });

  errorRate.add(!ok);
}

function performCategorySearch(baseUrl, apiPrefix, accessToken) {
  const category = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];

  const url = buildUrl(`/items${buildQuery({ category })}`, baseUrl, apiPrefix);

  const res = http.get(url, requestParams(authHeaders(accessToken)));
  searchCounter.add(1);
  searchResponseTime.add(res.timings.duration);

	  const ok = check(res, {
	    'category search status is 200': (r) => r.status === 200,
	    'category search has data array': (r) => Array.isArray(safeJsonValue(r, 'data')),
	    'category search has meta': (r) => safeJsonValue(r, 'meta') !== undefined,
	  });

  errorRate.add(!ok);
}

function performTagsSearch(baseUrl, apiPrefix, accessToken) {
  const numTags = Math.floor(Math.random() * 3) + 1;
  const selectedTags = [];

  while (selectedTags.length < numTags) {
    const tag = TAGS[Math.floor(Math.random() * TAGS.length)];
    if (!selectedTags.includes(tag)) selectedTags.push(tag);
  }

  const url = buildUrl(`/items${buildQuery({ tags: selectedTags })}`, baseUrl, apiPrefix);

  const res = http.get(url, requestParams(authHeaders(accessToken)));
  searchCounter.add(1);
  searchResponseTime.add(res.timings.duration);

	  const ok = check(res, {
	    'tags search status is 200': (r) => r.status === 200,
	    'tags search has data array': (r) => Array.isArray(safeJsonValue(r, 'data')),
	    'tags search has meta': (r) => safeJsonValue(r, 'meta') !== undefined,
	  });

  errorRate.add(!ok);
}

function performCombinedSearch(baseUrl, apiPrefix, accessToken) {
  const query = SEARCH_TERMS[Math.floor(Math.random() * SEARCH_TERMS.length)];
  const category = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
  const page = Math.floor(Math.random() * 3) + 1;
  const limit = 10;

  const tags = [];
  const numTags = Math.floor(Math.random() * 2) + 1;
  while (tags.length < numTags) {
    const tag = TAGS[Math.floor(Math.random() * TAGS.length)];
    if (!tags.includes(tag)) tags.push(tag);
  }

  const url = buildUrl(
    `/items${buildQuery({ query, category, tags, page, limit })}`,
    baseUrl,
    apiPrefix,
  );

  const res = http.get(url, requestParams(authHeaders(accessToken)));
  searchCounter.add(1);
  searchResponseTime.add(res.timings.duration);

	  const ok = check(res, {
	    'combined search status is 200': (r) => r.status === 200,
	    'combined search has data array': (r) => Array.isArray(safeJsonValue(r, 'data')),
	    'combined search has meta': (r) => safeJsonValue(r, 'meta') !== undefined,
	  });

  errorRate.add(!ok);
}

export function teardown() {
  console.log('Search load test completed');
}
