import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function resolveWorkflowsDir(): string {
  if (process.env.WORKFLOWS_DIR) return process.env.WORKFLOWS_DIR;
  const bundled = path.resolve(__dirname, "./workflows");
  if (fs.existsSync(bundled)) return bundled;
  return path.resolve(__dirname, "../../workflows");
}

export function normalizeConductorApiUrl(rawUrl?: string): string {
  const trimmed = (rawUrl || "http://localhost:8080/api").trim().replace(/\/+$/, "");
  if (trimmed.endsWith("/api")) {
    return trimmed;
  }
  return `${trimmed}/api`;
}

export function deriveConductorUiUrl(apiUrl: string): string {
  return apiUrl.replace(/\/api\/?$/, "");
}

const conductorServerUrl = normalizeConductorApiUrl(process.env.CONDUCTOR_SERVER_URL);

export const config = {
  port: Number(process.env.PORT || 3000),
  conductorServerUrl,
  conductorUiUrl: process.env.CONDUCTOR_UI_URL || deriveConductorUiUrl(conductorServerUrl),
  conductorAuthKey: process.env.CONDUCTOR_AUTH_KEY || undefined,
  conductorAuthSecret: process.env.CONDUCTOR_AUTH_SECRET || undefined,
  corsOrigin: process.env.CORS_ORIGIN || "*",
  isLambda: Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME),
  workerMode: (
    process.env.WORKER_MODE ||
    (process.env.AWS_LAMBDA_FUNCTION_NAME ? "inline" : "daemon")
  ) as "daemon" | "inline" | "none",
  workflowsDir: resolveWorkflowsDir(),
  frontendDistDir: process.env.FRONTEND_DIST_DIR || path.resolve(__dirname, "../../frontend/dist"),
};
