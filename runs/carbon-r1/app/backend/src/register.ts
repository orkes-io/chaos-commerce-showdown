import { config } from "./config.js";
import { registerChaosDefinitions } from "./conductor.js";

async function main() {
  console.log(`[Chaos Commerce] Registering tasks & workflows on ${config.conductorServerUrl} ...`);
  const res = await registerChaosDefinitions();
  console.log(`[Chaos Commerce] Registered ${res.tasksRegistered.length} tasks:`, res.tasksRegistered.join(", "));
  console.log(`[Chaos Commerce] Registered ${res.workflowsRegistered.length} workflows:`, res.workflowsRegistered.join(", "));
}

main().catch((err) => {
  console.error("[Chaos Commerce] Workflow registration failed:", err);
  process.exit(1);
});
