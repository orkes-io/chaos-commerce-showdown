#!/usr/bin/env node
// Registers the Chaos Commerce workflows on the configured Conductor server and exits.
// Usage: npm run register        (reads CONDUCTOR_SERVER_URL from the environment or .env)
import { loadDotEnv, registerWorkflows } from "./lib.mjs";

loadDotEnv();
const { createApp } = await import("../backend/src/app.mjs");
const app = createApp();
console.log(`Registering workflows on ${app.config.conductorUrl}`);
const ok = await registerWorkflows(app, { attempts: 5 });
process.exit(ok ? 0 : 1);
