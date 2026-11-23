import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = path.resolve(__dirname, "../..");

// Load root .env if present (safe no-op on AWS Lambda where env vars are injected)
dotenv.config({ path: path.join(REPO_ROOT, ".env") });

function normalizeConductorApiUrl(rawUrl) {
  const trimmed = (rawUrl || "http://localhost:8080/api").trim().replace(/\/+$/, "");
  return trimmed.endsWith("/api") ? trimmed : `${trimmed}/api`;
}

function deriveConductorUiUrl(apiUrl, explicitUiUrl) {
  if (explicitUiUrl && explicitUiUrl.trim()) {
    return explicitUiUrl.trim().replace(/\/+$/, "");
  }
  return apiUrl.replace(/\/api$/, "");
}

const conductorServerUrl = normalizeConductorApiUrl(process.env.CONDUCTOR_SERVER_URL);
const conductorUiUrl = deriveConductorUiUrl(conductorServerUrl, process.env.CONDUCTOR_UI_URL);

export const config = {
  port: Number(process.env.PORT || 3000),
  conductorServerUrl,
  conductorUiUrl,
  conductorAuthKey: process.env.CONDUCTOR_AUTH_KEY || "",
  conductorAuthSecret: process.env.CONDUCTOR_AUTH_SECRET || "",
  corsOrigin: process.env.CORS_ORIGIN || "*",
  isLambda: Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME),
  dataFile: process.env.DATA_FILE || path.join(REPO_ROOT, "data", "chaos-commerce-data.json"),
  conductorDir: path.join(REPO_ROOT, "conductor"),
  frontendDistDir: path.join(REPO_ROOT, "frontend", "dist"),
  workflowTimeoutMs: Number(process.env.WORKFLOW_TIMEOUT_MS || 30000),
};
