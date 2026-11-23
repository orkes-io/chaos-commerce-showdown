import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function normalizeApiUrl(raw) {
  const base = (raw || "http://localhost:8080/api").trim().replace(/\/+$/, "");
  return base.endsWith("/api") ? base : `${base}/api`;
}

export function getConfig() {
  const conductorApiUrl = normalizeApiUrl(process.env.CONDUCTOR_SERVER_URL);
  const conductorUiUrl = conductorApiUrl.replace(/\/api$/, "");

  return {
    port: Number(process.env.PORT || 3000),
    host: process.env.HOST || "0.0.0.0",
    conductorApiUrl,
    conductorUiUrl,
    conductorAuthKey: process.env.CONDUCTOR_AUTH_KEY || "",
    conductorAuthSecret: process.env.CONDUCTOR_AUTH_SECRET || "",
    conductorAuthToken: process.env.CONDUCTOR_AUTH_TOKEN || "",
    corsOrigin: process.env.CORS_ORIGIN || "*",
    frontendDistDir:
      process.env.FRONTEND_DIST_DIR ||
      path.resolve(__dirname, "../../frontend/dist"),
    workflowWaitTimeoutMs: Number(process.env.WORKFLOW_WAIT_TIMEOUT_MS || 20000),
  };
}
