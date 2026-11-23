#!/usr/bin/env node
// Registers (creates or updates) the Chaos Commerce workflow definitions on the
// Conductor server named by CONDUCTOR_SERVER_URL. Safe to run repeatedly.
import { loadConfig } from "../backend/src/config.js";
import { ConductorClient } from "../backend/src/conductor.js";
import { registerDefinitions } from "../backend/src/definitions.js";
import { loadEnvFile } from "./env.js";

loadEnvFile();
const config = loadConfig();
const conductor = new ConductorClient({
  baseUrl: config.conductorUrl,
  authKey: config.conductorAuthKey,
  authSecret: config.conductorAuthSecret,
});

try {
  const registered = await registerDefinitions(conductor);
  for (const { name, version } of registered) console.log(`registered ${name} v${version}`);
  console.log(`Workflows are registered on ${config.conductorUrl}`);
} catch (error) {
  console.error(`Could not register workflows: ${error.message}`);
  process.exit(1);
}
