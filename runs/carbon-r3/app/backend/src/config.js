import path from "node:path";
import os from "node:os";

function normalizeConductorApiUrl(rawUrl) {
  const trimmed = (rawUrl || "http://localhost:8080/api").trim().replace(/\/+$/, "");
  if (trimmed.endsWith("/api")) {
    return trimmed;
  }
  return `${trimmed}/api`;
}

export function getConfig() {
  const conductorServerUrl = normalizeConductorApiUrl(process.env.CONDUCTOR_SERVER_URL);
  const conductorUiUrl = (
    process.env.CONDUCTOR_UI_URL ||
    conductorServerUrl.replace(/\/api$/, "")
  ).replace(/\/+$/, "");

  const defaultTmpRoot = path.join(os.tmpdir(), "chaos-commerce-data");

  return {
    port: Number(process.env.PORT || 3000),
    conductorServerUrl,
    conductorUiUrl,
    conductorAuthKey: process.env.CONDUCTOR_AUTH_KEY || "",
    conductorAuthSecret: process.env.CONDUCTOR_AUTH_SECRET || "",
    conductorAuthToken: process.env.CONDUCTOR_AUTH_TOKEN || "",
    corsOrigin: process.env.CORS_ORIGIN || "*",
    dataDir: process.env.CHAOS_DATA_DIR || path.resolve(defaultTmpRoot),
    isLambda: Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME),
  };
}
