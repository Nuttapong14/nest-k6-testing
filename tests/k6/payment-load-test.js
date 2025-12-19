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
  safeJsonValue,
  scaleStages,
} from './lib/api.js';

// Custom metrics
export let errorRate = new Rate('errors');
export let paymentResponseTime = new Trend('payment_response_time', true);
export let paymentCounter = new Counter('payment_requests');
export let paymentSuccessRate = new Rate('payment_success');

// Test configuration
export let options = {
  stages: scaleStages([
    { duration: '2m', target: 500 }, // Ramp up to 500 users
    { duration: '3m', target: 1000 }, // Stay at 1000 users
    { duration: '3m', target: 2000 }, // Ramp up to 2000 users
    { duration: '2m', target: 500 }, // Scale down
  ]),
  thresholds: {
    http_req_duration: ['p(95)<1200'],
    http_req_failed: ['rate<0.05'],
    errors: ['rate<0.05'],
    payment_success: ['rate>0.95'],
  },
  insecureSkipTLSVerify: true,
};

const BASE_URL = getBaseUrl();
const API_PREFIX = getApiPrefix();

const PAYMENT_METHODS = ['credit_card', 'debit_card', 'paypal'];
const AMOUNTS = [
  { value: 9.99, currency: 'USD' },
  { value: 19.99, currency: 'USD' },
  { value: 49.99, currency: 'USD' },
  { value: 99.99, currency: 'USD' },
];

let createdPaymentIds = [];

export function setup() {
  const adminEmail = __ENV.ADMIN_EMAIL || DEFAULT_USERS.admin.email;
  const adminPassword = __ENV.ADMIN_PASSWORD || DEFAULT_USERS.admin.password;

  const { accessToken } = mustLogin({
    baseUrl: BASE_URL,
    apiPrefix: API_PREFIX,
    email: adminEmail,
    password: adminPassword,
    label: 'payment setup login',
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

  createPayment(baseUrl, apiPrefix, accessToken);

  if (Math.random() < 0.3 && createdPaymentIds.length > 0) {
    const paymentId = createdPaymentIds[Math.floor(Math.random() * createdPaymentIds.length)];
    checkPaymentStatus(baseUrl, apiPrefix, accessToken, paymentId);
  }

  sleep(1);
}

function createPayment(baseUrl, apiPrefix, accessToken) {
  const paymentMethod = PAYMENT_METHODS[Math.floor(Math.random() * PAYMENT_METHODS.length)];
  const amount = AMOUNTS[Math.floor(Math.random() * AMOUNTS.length)];
  const randomId = Math.floor(Math.random() * 100000);

  const payload = JSON.stringify({
    amount: amount.value,
    currency: amount.currency,
    paymentMethod,
    description: `k6 payment test ${randomId}`,
    receiptEmail: 'buyer@example.com',
    metadata: { orderId: `ORD-${randomId}`, source: 'k6' },
  });

  const res = http.post(
    buildUrl('/payments', baseUrl, apiPrefix),
    payload,
    requestParams({
      ...authHeaders(accessToken, { 'Idempotency-Key': generateIdempotencyKey() }),
    }),
  );
  paymentCounter.add(1);
  paymentResponseTime.add(res.timings.duration);

	  const ok = check(res, {
	    'payment creation status is 201': (r) => r.status === 201,
	    'payment response has id': (r) => typeof safeJsonValue(r, 'id') === 'string',
	    'payment response has status': (r) => typeof safeJsonValue(r, 'status') === 'string',
	    'payment method matches': (r) => safeJsonValue(r, 'paymentMethod') === paymentMethod,
	    'payment amount matches': (r) =>
	      Math.abs(Number(safeJsonValue(r, 'amount')) - amount.value) < 0.0001,
	  });

  errorRate.add(!ok);

	  if (res.status === 201) {
	    paymentSuccessRate.add(true);
	    const paymentId = safeJsonValue(res, 'id');
	    if (paymentId && !createdPaymentIds.includes(paymentId)) {
	      createdPaymentIds.push(paymentId);
	      if (createdPaymentIds.length > 100) createdPaymentIds.shift();
	    }
	  } else {
    paymentSuccessRate.add(false);
  }
}

function checkPaymentStatus(baseUrl, apiPrefix, accessToken, paymentId) {
  const res = http.get(
    buildUrl(`/payments/${encodeURIComponent(paymentId)}`, baseUrl, apiPrefix),
    requestParams(authHeaders(accessToken)),
  );
  paymentCounter.add(1);
  paymentResponseTime.add(res.timings.duration);

	  const ok = check(res, {
	    'payment status check status is 200': (r) => r.status === 200,
	    'payment status id matches': (r) => safeJsonValue(r, 'id') === paymentId,
	    'payment status is valid': (r) =>
	      ['pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded'].includes(
	        safeJsonValue(r, 'status'),
	      ),
	  });

  errorRate.add(!ok);
}

function generateIdempotencyKey() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function teardown() {
  console.log('Payment load test completed');
}
