// All runtime configuration comes from environment variables (Lambda env vars in AWS, .env locally).

const DEFAULT_CONDUCTOR_URL = "http://localhost:8080/api";

// Accepts "http://host:8080" or "http://host:8080/api". "/api" is appended only to a bare root.
export function normalizeConductorUrl(raw) {
  const value = String(raw ?? "").trim() || DEFAULT_CONDUCTOR_URL;
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`CONDUCTOR_SERVER_URL is not a valid URL: "${value}"`);
  }
  if (!/^https?:$/.test(url.protocol)) {
    throw new Error(`CONDUCTOR_SERVER_URL must be http(s): "${value}"`);
  }
  const pathname = url.pathname.replace(/\/+$/, "");
  return `${url.origin}${pathname === "" ? "/api" : pathname}`;
}

function intFrom(value, fallback, min, max) {
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

export function loadConfig(env = process.env) {
  const conductorUrl = normalizeConductorUrl(env.CONDUCTOR_SERVER_URL);
  return {
    conductorUrl,
    // Link target for "view this execution in Conductor". Empty string disables the links.
    conductorUiUrl: (env.CONDUCTOR_UI_URL ?? conductorUrl.replace(/\/api$/, "")).trim().replace(/\/+$/, ""),
    // Optional credentials for a secured (Orkes) Conductor. Never logged, never returned by the API.
    conductorAuthKey: env.CONDUCTOR_AUTH_KEY || "",
    conductorAuthSecret: env.CONDUCTOR_AUTH_SECRET || "",
    conductorAuthToken: env.CONDUCTOR_AUTH_TOKEN || "",
    // Conductor runs system tasks inline, so "start workflow" can take a while on a busy server.
    conductorTimeoutMs: intFrom(env.CONDUCTOR_TIMEOUT_MS, 12000, 500, 25000),
    // How long POST /api/checkout waits for the workflow before answering "still processing".
    checkoutWaitMs: intFrom(env.CHECKOUT_WAIT_MS, 8000, 0, 20000),
    corsAllowOrigin: (env.CORS_ALLOW_ORIGIN || "*").trim(),
  };
}
