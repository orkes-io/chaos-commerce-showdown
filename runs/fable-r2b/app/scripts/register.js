// Registers the Chaos Commerce workflow definitions with Conductor.
// Safe to run repeatedly: existing definitions are updated in place.
//
//   npm run register                  uses CONDUCTOR_SERVER_URL (or .env, or the local default)

import { existsSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { listTasks, writeWorkflows } from "../conductor/build.mjs";
import { loadConfig } from "../backend/src/config.js";
import { createConductorClient } from "../backend/src/conductor.js";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export function loadDotEnv() {
  const file = new URL("../.env", import.meta.url);
  if (existsSync(file)) process.loadEnvFile(file);
}

export async function registerWorkflows({ config = loadConfig(), log = console.log, waitSeconds = 30 } = {}) {
  const conductor = createConductorClient({
    baseUrl: config.conductorUrl,
    authKey: config.conductorAuthKey,
    authSecret: config.conductorAuthSecret,
    authToken: config.conductorAuthToken,
  });
  const definitions = writeWorkflows();

  // A SIMPLE task waits for a worker process. The store ships none, so a
  // workflow that used one without a registered task definition would hang.
  const workerTasks = [...new Set(definitions.flatMap((d) => listTasks(d.tasks)).filter((t) => t.type === "SIMPLE").map((t) => t.name))];

  const deadline = Date.now() + waitSeconds * 1000;
  for (;;) {
    try {
      if (workerTasks.length > 0) {
        const known = new Set((await conductor.listTaskDefinitions()).map((definition) => definition.name));
        const unknown = workerTasks.filter((name) => !known.has(name));
        if (unknown.length > 0) {
          throw new Error(`Worker tasks without a task definition (the workflows would hang): ${unknown.join(", ")}`);
        }
      }
      await conductor.registerWorkflows(definitions);
      break;
    } catch (error) {
      if (!error.unavailable || Date.now() > deadline) throw error;
      log(`Waiting for Conductor at ${config.conductorUrl} ...`);
      await sleep(2000);
    }
  }
  for (const definition of definitions) {
    log(`Registered workflow ${definition.name} v${definition.version} (${listTasks(definition.tasks).length} tasks)`);
  }
  log(`Worker tasks needed: ${workerTasks.length === 0 ? "none (system tasks only)" : workerTasks.join(", ")}`);
  return definitions;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  loadDotEnv();
  try {
    const config = loadConfig();
    console.log(`Conductor: ${config.conductorUrl}`);
    await registerWorkflows({ config });
  } catch (error) {
    console.error(`Could not register the workflows: ${error.message}`);
    process.exit(1);
  }
}
