import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { loadConfig } from '../backend/src/config.js';
import { ConductorClient } from '../backend/src/conductor.js';

export const projectRoot = fileURLToPath(new URL('..', import.meta.url));

// Reads .env (if present) before anything looks at process.env. Variables
// already set in the environment win over the file.
export function loadEnvironment() {
  const envFile = `${projectRoot}.env`;
  if (existsSync(envFile)) process.loadEnvFile(envFile);
  const config = loadConfig();
  const conductor = new ConductorClient({
    baseUrl: config.conductorUrl,
    authKey: config.conductorAuthKey,
    authSecret: config.conductorAuthSecret,
  });
  return { config, conductor };
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Upserts both workflow definitions and confirms the server has them. Retries
// for a while if Conductor is not answering yet; it never starts or stops it.
export async function registerWorkflows(conductor, { attempts = 10, delayMs = 3000, log = console.log } = {}) {
  // Imported here so WORKFLOW_OWNER_EMAIL from .env is already in place.
  const { workflowDefinitions } = await import('../workflows/index.js');
  for (let attempt = 1; ; attempt++) {
    try {
      await conductor.registerWorkflows(workflowDefinitions);
      break;
    } catch (error) {
      if (!error.unavailable || attempt >= attempts) throw error;
      log(`Conductor is not answering yet (attempt ${attempt}/${attempts}): ${error.message}`);
      await sleep(delayMs);
    }
  }
  for (const definition of workflowDefinitions) {
    const registered = await conductor.getWorkflowDefinition(definition.name);
    if (!registered) throw new Error(`Conductor accepted ${definition.name} but does not list it afterwards.`);
    log(`Registered workflow ${definition.name} v${registered.version} (${registered.tasks.length} top-level tasks)`);
  }
}
