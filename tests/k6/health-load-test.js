import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import { safeJsonValue, scaleStages, jsonHeaders, requestParams } from './lib/api.js';

// Custom metrics
export let errorRate = new Rate('errors');
export let healthResponseTime = new Trend('health_response_time', true);
export let healthCounter = new Counter('health_requests');
export let uptimeRate = new Rate('uptime');

// Test configuration - lighter load for health endpoints
export let options = {
  stages: scaleStages([
    { duration: '1m', target: 100 }, // Ramp up to 100 users
    { duration: '3m', target: 200 }, // Stay at 200 users
    { duration: '1m', target: 500 }, // Spike to 500 users
    { duration: '1m', target: 0 }, // Ramp down
  ]),
  thresholds: {
    http_req_duration: ['p(95)<100'], // 95% of requests should be below 100ms
    http_req_failed: ['rate<0.01'], // Error rate should be less than 1%
    errors: ['rate<0.01'],
    uptime: ['rate>0.99'], // 99% uptime
  },
  insecureSkipTLSVerify: true,
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const API_PREFIX = __ENV.API_PREFIX || 'api';

export function setup() {
  return {
    baseUrl: BASE_URL,
    apiPrefix: API_PREFIX,
  };
}

export default function(data) {
  const baseUrl = data.baseUrl;
  const apiPrefix = data.apiPrefix;

  // Test different health endpoints with realistic distribution
  const scenario = Math.random();

  if (scenario < 0.3) {
    // 30% - Basic health check (most common)
    basicHealthCheck(baseUrl, apiPrefix);
  } else if (scenario < 0.5) {
    // 20% - Readiness probe (Kubernetes)
    readinessCheck(baseUrl, apiPrefix);
  } else if (scenario < 0.65) {
    // 15% - Liveness probe (Kubernetes)
    livenessCheck(baseUrl, apiPrefix);
  } else if (scenario < 0.8) {
    // 15% - Database health
    databaseHealthCheck(baseUrl, apiPrefix);
  } else if (scenario < 0.9) {
    // 10% - Redis health
    redisHealthCheck(baseUrl, apiPrefix);
  } else if (scenario < 0.95) {
    // 5% - Memory check
    memoryCheck(baseUrl, apiPrefix);
  } else if (scenario < 0.98) {
    // 3% - Metrics
    metricsCheck(baseUrl, apiPrefix);
  } else {
    // 2% - Detailed health
    detailedHealthCheck(baseUrl, apiPrefix);
  }

  sleep(0.5); // Shorter sleep for health checks
}

function basicHealthCheck(baseUrl, apiPrefix) {
  const response = http.get(`${baseUrl}/${apiPrefix}/health`, requestParams(jsonHeaders()));
  healthCounter.add(1);
  healthResponseTime.add(response.timings.duration);

	  let success = check(response, {
	    'health check status is 200': (r) => r.status === 200,
	    'health check response time < 100ms': (r) => r.timings.duration < 100,
	    'health check has status': (r) => safeJsonValue(r, 'status') !== undefined,
	    'health check status is ok': (r) => safeJsonValue(r, 'status') === 'ok',
	  });

  errorRate.add(!success);
  uptimeRate.add(success);
}

function readinessCheck(baseUrl, apiPrefix) {
  const response = http.get(
    `${baseUrl}/${apiPrefix}/health/ready`,
    requestParams(jsonHeaders()),
  );
  healthCounter.add(1);
  healthResponseTime.add(response.timings.duration);

	  let success = check(response, {
	    'readiness status is 200': (r) => r.status === 200,
	    'readiness response time < 100ms': (r) => r.timings.duration < 100,
	    'readiness has status': (r) => safeJsonValue(r, 'status') !== undefined,
	    'readiness has details': (r) => safeJsonValue(r, 'details') !== undefined,
	  });

  errorRate.add(!success);
  uptimeRate.add(success);
}

function livenessCheck(baseUrl, apiPrefix) {
  const response = http.get(
    `${baseUrl}/${apiPrefix}/health/live`,
    requestParams(jsonHeaders()),
  );
  healthCounter.add(1);
  healthResponseTime.add(response.timings.duration);

	  let success = check(response, {
	    'liveness status is 200': (r) => r.status === 200,
	    'liveness response time < 100ms': (r) => r.timings.duration < 100,
	    'liveness has status': (r) => safeJsonValue(r, 'status') !== undefined,
	    'liveness has details': (r) => safeJsonValue(r, 'details') !== undefined,
	  });

  errorRate.add(!success);
  uptimeRate.add(success);
}

function databaseHealthCheck(baseUrl, apiPrefix) {
  const response = http.get(
    `${baseUrl}/${apiPrefix}/health/database`,
    requestParams(jsonHeaders()),
  );
  healthCounter.add(1);
  healthResponseTime.add(response.timings.duration);

	  let success = check(response, {
	    'database health status is 200': (r) => r.status === 200,
	    'database health response time < 100ms': (r) => r.timings.duration < 100,
	    'database health has status': (r) =>
	      safeJsonValue(r, 'status') !== undefined || safeJsonValue(r) !== undefined,
	  });

  errorRate.add(!success);
  uptimeRate.add(success);
}

function redisHealthCheck(baseUrl, apiPrefix) {
  const response = http.get(
    `${baseUrl}/${apiPrefix}/health/redis`,
    requestParams(jsonHeaders()),
  );
  healthCounter.add(1);
  healthResponseTime.add(response.timings.duration);

	  let success = check(response, {
	    'redis health status is 200': (r) => r.status === 200,
	    'redis health response time < 100ms': (r) => r.timings.duration < 100,
	    'redis health has status': (r) =>
	      safeJsonValue(r, 'status') !== undefined || safeJsonValue(r) !== undefined,
	  });

  errorRate.add(!success);
  uptimeRate.add(success);
}

function memoryCheck(baseUrl, apiPrefix) {
  const response = http.get(
    `${baseUrl}/${apiPrefix}/health/memory`,
    requestParams(jsonHeaders()),
  );
  healthCounter.add(1);
  healthResponseTime.add(response.timings.duration);

	  let success = check(response, {
	    'memory check status is 200': (r) => r.status === 200,
	    'memory check response time < 100ms': (r) => r.timings.duration < 100,
	    'memory check has data': (r) => safeJsonValue(r) !== undefined,
	  });

  errorRate.add(!success);
  uptimeRate.add(success);
}

function metricsCheck(baseUrl, apiPrefix) {
  const response = http.get(
    `${baseUrl}/${apiPrefix}/health/metrics`,
    requestParams(jsonHeaders()),
  );
  healthCounter.add(1);
  healthResponseTime.add(response.timings.duration);

	  let success = check(response, {
	    'metrics status is 200': (r) => r.status === 200,
	    'metrics response time < 100ms': (r) => r.timings.duration < 100,
	    'metrics has timestamp': (r) => safeJsonValue(r, 'timestamp') !== undefined,
	    'metrics has uptime': (r) => safeJsonValue(r, 'uptime') !== undefined,
	    'metrics has memory': (r) => safeJsonValue(r, 'memory') !== undefined,
	  });

  errorRate.add(!success);
  uptimeRate.add(success);
}

function detailedHealthCheck(baseUrl, apiPrefix) {
  const response = http.get(
    `${baseUrl}/${apiPrefix}/health/detailed`,
    requestParams(jsonHeaders()),
  );
  healthCounter.add(1);
  healthResponseTime.add(response.timings.duration);

	  let success = check(response, {
	    'detailed health status is 200': (r) => r.status === 200,
	    'detailed health response time < 150ms': (r) => r.timings.duration < 150,
	    'detailed health has data': (r) => safeJsonValue(r) !== undefined,
	  });

  errorRate.add(!success);
  uptimeRate.add(success);
}

export function teardown(data) {
  console.log('Health endpoints load test completed');
}
