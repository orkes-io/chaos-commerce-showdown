// All runtime configuration comes from environment variables so the same code
// runs locally (`npm start`), on AWS Lambda and anywhere else.

const DEFAULT_CONDUCTOR_URL = "http://localhost:8080/api";

// Accepts "http://host:8080", "http://host:8080/" or "http://host:8080/api"
// and always returns the API base ending in "/api".
export function normalizeConductorUrl(value) {
  const trimmed = String(value || "").trim().replace(/\/+$/, "");
  if (!trimmed) return DEFAULT_CONDUCTOR_URL;
  const url = new URL(trimmed);
  if (url.pathname === "" || url.pathname === "/") url.pathname = "/api";
  return url.toString().replace(/\/+$/, "");
}

function list(value, fallback) {
  const items = String(value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  return items.length ? items : fallback;
}

function positiveInt(value, fallback) {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : fallback;
}

export function loadConfig(env = process.env) {
  const conductorUrl = normalizeConductorUrl(env.CONDUCTOR_SERVER_URL);
  return {
    conductorUrl,
    // Where humans can look at executions. Only used to build links.
    conductorUiUrl: (env.CONDUCTOR_UI_URL || conductorUrl.replace(/\/api$/, "")).replace(/\/+$/, ""),
    // Only needed for Conductor servers that require auth (Orkes). Never logged.
    conductorAuthKey: env.CONDUCTOR_AUTH_KEY || "",
    conductorAuthSecret: env.CONDUCTOR_AUTH_SECRET || "",
    // Browser origins allowed to call the API, e.g. https://you.github.io
    allowedOrigins: list(env.ALLOWED_ORIGINS, ["*"]),
    port: positiveInt(env.PORT, 3000),
    // How long one scheduled Lambda worker invocation keeps polling.
    workerRunSeconds: positiveInt(env.WORKER_RUN_SECONDS, 58),
  };
}
