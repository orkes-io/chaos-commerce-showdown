// All backend configuration comes from environment variables, both locally
// (optionally via a .env file loaded by scripts/start.js) and on AWS Lambda.

export const DEFAULT_CONDUCTOR_URL = "http://localhost:8080/api";

// Accepts the API base ("http://host:8080/api") or a bare server root
// ("http://host:8080"), which gets "/api" appended.
export function normaliseConductorUrl(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  let url;
  try {
    url = new URL(raw);
  } catch {
    throw new Error(`CONDUCTOR_SERVER_URL is not a valid URL: ${raw}`);
  }
  const path = url.pathname.replace(/\/+$/, "");
  return `${url.origin}${path === "" ? "/api" : path}`;
}

function boundedInt(value, fallback, min, max) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

export function loadConfig(env = process.env) {
  const onLambda = Boolean(env.AWS_LAMBDA_FUNCTION_NAME);
  const conductorUrl =
    normaliseConductorUrl(env.CONDUCTOR_SERVER_URL) || (onLambda ? "" : DEFAULT_CONDUCTOR_URL);
  const allowedOrigins = String(env.ALLOWED_ORIGINS ?? "*")
    .split(",")
    .map((origin) => origin.trim().replace(/\/+$/, ""))
    .filter(Boolean);
  return {
    conductorUrl,
    conductorAuthKey: env.CONDUCTOR_AUTH_KEY || "",
    conductorAuthSecret: env.CONDUCTOR_AUTH_SECRET || "",
    conductorAuthToken: env.CONDUCTOR_AUTH_TOKEN || "",
    conductorUiUrl: String(env.CONDUCTOR_UI_URL ?? "").trim().replace(/\/+$/, ""),
    allowedOrigins: allowedOrigins.length > 0 ? allowedOrigins : ["*"],
    oathWindowSeconds: boundedInt(env.OATH_WINDOW_SECONDS, 60, 5, 600),
    checkPauseSeconds: boundedInt(env.CHECK_PAUSE_SECONDS, 1, 1, 5),
  };
}
