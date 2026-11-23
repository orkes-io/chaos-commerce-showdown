import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

export const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// Loads .env from the project root if present. Variables already set in the environment win.
export function loadDotEnv() {
  const file = path.join(rootDir, ".env");
  if (existsSync(file) && typeof process.loadEnvFile === "function") process.loadEnvFile(file);
}

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Registers both workflow definitions (idempotent upsert) and confirms the server has them.
export async function registerWorkflows(app, { attempts = 30, delayMs = 2000, log = console.log } = {}) {
  const { workflowDefs } = await import("../backend/src/workflows.mjs");
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      await app.ensureWorkflows();
      for (const def of workflowDefs) {
        const found = await app.client.getWorkflowDef(def.name, def.version);
        if (!found) throw new Error(`workflow ${def.name} v${def.version} is missing after registration`);
        log(`  registered workflow ${def.name} v${def.version} (${def.tasks.length} top-level tasks)`);
      }
      return true;
    } catch (error) {
      lastError = error;
      if (attempt < attempts) {
        log(`  Conductor not ready (${error.message}); retrying in ${delayMs / 1000}s [${attempt}/${attempts}]`);
        await sleep(delayMs);
      }
    }
  }
  log(`  could not register workflows: ${lastError?.message}`);
  return false;
}
