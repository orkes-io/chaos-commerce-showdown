const DEFAULT_CONDUCTOR_URL = 'http://localhost:8080/api';

// Accepts either the API base (".../api") or a bare server root, to which
// "/api" is appended.
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

function positiveInt(raw, fallback, name) {
  if (raw === undefined || raw === '') return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) throw new Error(`${name} must be a positive integer, got "${raw}"`);
  return value;
}

export function loadConfig(env = process.env) {
  return {
    conductorUrl: normalizeConductorUrl(env.CONDUCTOR_SERVER_URL),
    conductorAuthKey: env.CONDUCTOR_AUTH_KEY || '',
    conductorAuthSecret: env.CONDUCTOR_AUTH_SECRET || '',
    allowedOrigin: env.ALLOWED_ORIGIN || '*',
    port: positiveInt(env.PORT, 3000, 'PORT'),
    // How long POST /api/checkout waits for the workflow before answering 202.
    checkoutWaitMs: positiveInt(env.CHECKOUT_WAIT_MS, 12000, 'CHECKOUT_WAIT_MS'),
  };
}
