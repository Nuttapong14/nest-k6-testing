import http from 'k6/http';
import { fail } from 'k6';

export const DEFAULT_BASE_URL = 'http://localhost:3000';
export const DEFAULT_API_PREFIX = 'api';

export const DEFAULT_USERS = {
  admin: {
    email: 'admin@constitution.app',
    password: 'Test1234!',
  },
  editor: {
    email: 'editor@constitution.app',
    password: 'Test1234!',
  },
  viewer: {
    email: 'viewer@constitution.app',
    password: 'Test1234!',
  },
};

export function getBaseUrl() {
  return (__ENV.BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, '');
}

export function getApiPrefix() {
  return (__ENV.API_PREFIX || DEFAULT_API_PREFIX)
    .toString()
    .replace(/^\/+|\/+$/g, '');
}

export function buildUrl(path, baseUrl = getBaseUrl(), apiPrefix = getApiPrefix()) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  if (!apiPrefix) return `${baseUrl}${normalizedPath}`;
  return `${baseUrl}/${apiPrefix}${normalizedPath}`;
}

export function buildQuery(query = {}) {
  const parts = [];
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') continue;
    if (Array.isArray(value)) {
      for (const item of value) {
        if (item === undefined || item === null || item === '') continue;
        parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(item))}`);
      }
      continue;
    }
    parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
  }
  return parts.length ? `?${parts.join('&')}` : '';
}

export function jsonHeaders(extra = {}) {
  return {
    'Content-Type': 'application/json',
    ...extra,
  };
}

export function authHeaders(accessToken, extra = {}) {
  return {
    ...jsonHeaders(extra),
    Authorization: `Bearer ${accessToken}`,
  };
}

export function requestParams(headers, extra = {}) {
  const params = { headers, ...extra };
  if (params.timeout === undefined && __ENV.HTTP_TIMEOUT) {
    params.timeout = String(__ENV.HTTP_TIMEOUT);
  }
  return params;
}

export function login({ baseUrl, apiPrefix, email, password }) {
  const url = buildUrl('/auth/login', baseUrl, apiPrefix);
  const payload = JSON.stringify({ email, password });
  const res = http.post(url, payload, requestParams(jsonHeaders()));

  return {
    response: res,
    accessToken: res.status === 200 ? safeJsonValue(res, 'accessToken') || null : null,
    refreshToken: res.status === 200 ? safeJsonValue(res, 'refreshToken') || null : null,
    expiresIn: res.status === 200 ? safeJsonValue(res, 'expiresIn') || null : null,
  };
}

export function mustLogin({ baseUrl, apiPrefix, email, password, label = 'login' }) {
  const { response, accessToken, refreshToken, expiresIn } = login({
    baseUrl,
    apiPrefix,
    email,
    password,
  });

  if (response.status !== 200 || !accessToken) {
    const body = safeJson(response);
    fail(
      `${label} failed (status=${response.status}). Check BASE_URL/API_PREFIX and credentials. Body: ${JSON.stringify(body)}`,
    );
  }

  return { accessToken, refreshToken, expiresIn };
}

export function safeJson(response) {
  if (!response) return null;
  if (response.body === null || response.body === undefined || response.body === '') return response.body;
  try {
    return response.json();
  } catch (_) {
    return response.body;
  }
}

export function safeJsonValue(response, selector) {
  if (!response) return undefined;
  if (response.body === null || response.body === undefined || response.body === '') return undefined;
  try {
    return selector === undefined ? response.json() : response.json(selector);
  } catch (_) {
    return undefined;
  }
}

export function scaleStages(stages) {
  const rawScale = __ENV.STAGE_SCALE !== undefined ? __ENV.STAGE_SCALE : __ENV.VU_SCALE;
  const scale = rawScale === undefined ? 1 : parseFloat(String(rawScale));
  const maxVusRaw = __ENV.MAX_VUS;
  const maxVus = maxVusRaw === undefined ? NaN : parseInt(String(maxVusRaw), 10);
  const minVusRaw = __ENV.MIN_VUS;
  const minVus = minVusRaw === undefined ? NaN : parseInt(String(minVusRaw), 10);

  return (stages || []).map((stage) => {
    const baseTarget = Number(stage.target) || 0;
    let target = baseTarget;
    if (!isNaN(scale) && scale > 0 && scale !== 1) {
      target = Math.round(baseTarget * scale);
    }
    if (!isNaN(maxVus)) target = Math.min(target, maxVus);
    if (!isNaN(minVus)) target = Math.max(target, minVus);
    if (target < 0) target = 0;

    return { ...stage, target };
  });
}
