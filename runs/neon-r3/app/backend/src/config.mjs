import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..');

function loadDotEnvIfPresent() {
  // Never overwrite existing environment variables (important for AWS Lambda & CI)
  const candidates = [path.join(repoRoot, '.env'), path.join(__dirname, '..', '.env')];
  for (const envPath of candidates) {
    if (!fs.existsSync(envPath)) continue;
    const content = fs.readFileSync(envPath, 'utf8');
    for (const rawLine of content.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) continue;
      const eq = line.indexOf('=');
      if (eq <= 0) continue;
      const key = line.slice(0, eq).trim();
      let val = line.slice(eq + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!(key in process.env)) {
        process.env[key] = val;
      }
    }
  }
}

loadDotEnvIfPresent();

export function normalizeConductorApiUrl(rawUrl) {
  const fallback = 'http://localhost:8080/api';
  const cleaned = (rawUrl || fallback).trim().replace(/\/+$/, '');
  return cleaned.endsWith('/api') ? cleaned : `${cleaned}/api`;
}

export function deriveConductorUiUrl(apiUrl, explicitUiUrl) {
  if (explicitUiUrl && explicitUiUrl.trim()) {
    return explicitUiUrl.trim().replace(/\/+$/, '');
  }
  return apiUrl.replace(/\/api$/, '');
}

export function getConfig() {
  const conductorApiUrl = normalizeConductorApiUrl(process.env.CONDUCTOR_SERVER_URL);
  const conductorUiUrl = deriveConductorUiUrl(conductorApiUrl, process.env.CONDUCTOR_UI_URL);
  const isLambda = Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME);

  return {
    port: Number(process.env.PORT) || 3000,
    host: process.env.HOST || '0.0.0.0',
    conductorApiUrl,
    conductorUiUrl,
    conductorAuthToken: process.env.CONDUCTOR_AUTH_TOKEN || '',
    conductorAuthKey: process.env.CONDUCTOR_AUTH_KEY || '',
    conductorAuthSecret: process.env.CONDUCTOR_AUTH_SECRET || '',
    corsOrigin: process.env.CORS_ORIGIN || '*',
    staticDir: process.env.STATIC_DIR || path.join(repoRoot, 'frontend', 'dist'),
    dataDir: isLambda ? '/tmp/chaos-commerce-data' : path.join(repoRoot, 'backend', '.data'),
    isLambda,
  };
}
