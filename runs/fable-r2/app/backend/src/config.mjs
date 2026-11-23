const DEFAULT_CONDUCTOR_URL = 'http://localhost:8080/api';

function positiveInt(value, fallback) {
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

// Accepts the API base (".../api") or a bare server root, which gets "/api" appended.
export function normalizeConductorUrl(raw) {
  const value = String(raw || DEFAULT_CONDUCTOR_URL).trim();
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`CONDUCTOR_SERVER_URL is not a valid URL: "${value}"`);
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error(`CONDUCTOR_SERVER_URL must be http(s): "${value}"`);
  }
  const path = url.pathname.replace(/\/+$/, '');
  return `${url.origin}${path === '' ? '/api' : path}`;
}

// Every setting comes from the environment so the same code runs locally and on AWS Lambda.
export function loadConfig(env = process.env) {
  const origins = String(env.ALLOWED_ORIGINS || '*')
    .split(',')
    .map((origin) => origin.trim().replace(/\/+$/, ''))
    .filter(Boolean);
  return {
    conductorUrl: normalizeConductorUrl(env.CONDUCTOR_SERVER_URL),
    conductorAuthKey: env.CONDUCTOR_AUTH_KEY || '',
    conductorAuthSecret: env.CONDUCTOR_AUTH_SECRET || '',
    conductorAuthToken: env.CONDUCTOR_AUTH_TOKEN || '',
    conductorTimeoutMs: positiveInt(env.CONDUCTOR_TIMEOUT_MS, 8000),
    allowedOrigins: origins.length ? origins : ['*'],
    port: positiveInt(env.PORT, 3000),
    checkoutWaitMs: positiveInt(env.CHECKOUT_WAIT_MS, 10000),
    reconcileIntervalMs: positiveInt(env.RECONCILE_INTERVAL_MS, 15000),
  };
}
