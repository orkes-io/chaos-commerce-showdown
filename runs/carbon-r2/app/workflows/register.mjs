#!/usr/bin/env node
import { getConfig } from "../backend/src/config.mjs";
import { registerWorkflows } from "../backend/src/conductor.mjs";

async function main() {
  const config = getConfig();
  console.log(
    `[Chaos Commerce] Registering Conductor workflows against ${config.conductorApiUrl} ...`
  );
  const registered = await registerWorkflows();
  for (const wf of registered) {
    console.log(`  ✓ Registered ${wf.name} (v${wf.version})`);
  }
}

main().catch((err) => {
  console.error(`[Chaos Commerce] Workflow registration failed: ${err.message}`);
  process.exit(1);
});
