import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const REPO_ROOT = path.resolve(__dirname, "..", "..");
export const WORKFLOWS_DIR = path.join(REPO_ROOT, "workflows");
export const FRONTEND_DIST_DIR = path.join(REPO_ROOT, "frontend", "dist");

function normalizeConductorApiUrl(raw) {
  const trimmed = (raw || "http://localhost:8080/api").trim().replace(/\/+$/, "");
  if (trimmed.endsWith("/api")) {
    return trimmed;
  }
  return `${trimmed}/api`;
}

function deriveConductorUiUrl(apiUrl, explicitUiUrl) {
  if (explicitUiUrl && explicitUiUrl.trim()) {
    return explicitUiUrl.trim().replace(/\/+$/, "");
  }
  return apiUrl.replace(/\/api$/, "");
}

export function loadConfig(env = process.env) {
  const conductorServerUrl = normalizeConductorApiUrl(env.CONDUCTOR_SERVER_URL);
  const conductorUiUrl = deriveConductorUiUrl(conductorServerUrl, env.CONDUCTOR_UI_URL);
  const port = Number.parseInt(env.PORT || "3000", 10) || 3000;
  const corsOrigin = (env.CORS_ORIGIN || "*").trim();
  const stepDelayMs = Number.parseInt(env.CHAOS_STEP_DELAY_MS ?? "120", 10);

  return {
    conductorServerUrl,
    conductorUiUrl,
    conductorAuthKey: env.CONDUCTOR_AUTH_KEY || "",
    conductorAuthSecret: env.CONDUCTOR_AUTH_SECRET || "",
    port,
    corsOrigin,
    stepDelayMs: Number.isFinite(stepDelayMs) && stepDelayMs >= 0 ? stepDelayMs : 120,
    workflows: {
      checkout: "chaos_checkout_workflow",
      returnFlow: "chaos_return_workflow",
    },
  };
}
