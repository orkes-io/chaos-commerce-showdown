// All backend configuration comes from environment variables, so the same code runs
// locally (scripts/start.js loads .env) and on AWS Lambda (function environment).

const DEFAULT_CONDUCTOR_URL = "http://localhost:8080/api";

const integer = (value, fallback, min, max) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
};

const flag = (value, fallback) => {
  if (value === undefined || value === "") return fallback;
  return ["1", "true", "yes", "on"].includes(String(value).toLowerCase());
};

// Accepts the API base ("https://host/api") or a bare server root ("https://host"),
// in which case /api is appended.
export const normalizeConductorUrl = (value) => {
  const raw = (value || DEFAULT_CONDUCTOR_URL).trim();
  let url;
  try {
    url = new URL(raw);
  } catch {
    throw new Error(`CONDUCTOR_SERVER_URL is not a valid URL: "${raw}"`);
  }
  const path = url.pathname.replace(/\/+$/, "");
  return `${url.origin}${path === "" ? "/api" : path}`;
};

export const loadConfig = (env = process.env) => ({
  conductorUrl: normalizeConductorUrl(env.CONDUCTOR_SERVER_URL),
  conductorAuthKey: env.CONDUCTOR_AUTH_KEY || "",
  conductorAuthSecret: env.CONDUCTOR_AUTH_SECRET || "",
  // Shown to shoppers as a "watch the workflow" link when set. Leave empty to hide it.
  conductorUiUrl: (env.CONDUCTOR_UI_URL || "").replace(/\/+$/, ""),
  allowedOrigins: (env.ALLOWED_ORIGINS || "*")
    .split(",")
    .map((origin) => origin.trim().replace(/\/+$/, ""))
    .filter(Boolean),
  // How long each returns form waits for the customer before the workflow moves on.
  returnStepTimeoutSeconds: integer(env.RETURN_STEP_TIMEOUT_SECONDS, 45, 5, 300),
  // How long POST /api/checkout waits for the workflow before answering "PROCESSING".
  checkoutWaitMs: integer(env.CHECKOUT_WAIT_MS, 8000, 0, 25000),
  // Lets a request fail its workflow on purpose to exercise the rescue workflows.
  allowDisasterDrills: flag(env.ALLOW_DISASTER_DRILLS, false),
});
