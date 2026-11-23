import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..");

function loadDotEnvIfPresent() {
  const candidates = [
    path.join(process.cwd(), ".env"),
    path.join(repoRoot, ".env"),
  ];
  for (const envPath of candidates) {
    if (!fs.existsSync(envPath)) continue;
    try {
      const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
      for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line || line.startsWith("#")) continue;
        const eqIdx = line.indexOf("=");
        if (eqIdx <= 0) continue;
        const key = line.slice(0, eqIdx).trim();
        let val = line.slice(eqIdx + 1).trim();
        if (
          (val.startsWith('"') && val.endsWith('"')) ||
          (val.startsWith("'") && val.endsWith("'"))
        ) {
          val = val.slice(1, -1);
        }
        if (process.env[key] === undefined) {
          process.env[key] = val;
        }
      }
    } catch {
      // Ignore unreadable .env files in restricted runtimes (e.g. Lambda)
    }
  }
}

loadDotEnvIfPresent();

export function normalizeConductorApiUrl(rawUrl) {
  const fallback = "http://localhost:8080/api";
  const trimmed = (rawUrl || fallback).trim().replace(/\/+$/, "");
  if (trimmed.endsWith("/api")) {
    return trimmed;
  }
  return `${trimmed}/api`;
}

export function deriveConductorUiUrl(apiUrl, explicitUiUrl) {
  if (explicitUiUrl && explicitUiUrl.trim()) {
    return explicitUiUrl.trim().replace(/\/+$/, "");
  }
  return apiUrl.replace(/\/api$/, "");
}

export function getConfig() {
  const conductorApiUrl = normalizeConductorApiUrl(
    process.env.CONDUCTOR_SERVER_URL
  );
  const conductorUiUrl = deriveConductorUiUrl(
    conductorApiUrl,
    process.env.CONDUCTOR_UI_URL
  );
  const isLambda = Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME);
  const dataFilePath =
    process.env.CHAOS_DATA_FILE ||
    (isLambda
      ? "/tmp/chaos-commerce-state.json"
      : path.join(repoRoot, "backend", ".data", "state.json"));

  const localWorkflowsCandidate = path.join(__dirname, "..", "workflows");
  const rootWorkflowsCandidate = path.join(repoRoot, "workflows");
  const defaultWorkflowsDir = fs.existsSync(localWorkflowsCandidate)
    ? localWorkflowsCandidate
    : rootWorkflowsCandidate;

  return {
    port: Number(process.env.PORT || 3000),
    host: process.env.HOST || "0.0.0.0",
    corsOrigin: process.env.CORS_ORIGIN || "*",
    conductorApiUrl,
    conductorUiUrl,
    conductorAuthKey: process.env.CONDUCTOR_AUTH_KEY || "",
    conductorAuthSecret: process.env.CONDUCTOR_AUTH_SECRET || "",
    conductorAuthToken: process.env.CONDUCTOR_AUTH_TOKEN || "",
    checkoutWorkflowName:
      process.env.CHAOS_CHECKOUT_WORKFLOW || "chaos_checkout_workflow",
    returnWorkflowName:
      process.env.CHAOS_RETURN_WORKFLOW || "chaos_return_workflow",
    workflowVersion: Number(process.env.CHAOS_WORKFLOW_VERSION || 1),
    workflowsDir: process.env.CHAOS_WORKFLOWS_DIR || defaultWorkflowsDir,
    frontendDistDir:
      process.env.CHAOS_FRONTEND_DIST ||
      path.join(repoRoot, "frontend", "dist"),
    dataFilePath,
    isLambda,
  };
}
