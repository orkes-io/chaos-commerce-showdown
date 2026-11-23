import { getConfig } from "./config.js";
import { registerAllDefinitions } from "./conductor-client.js";

async function main() {
  const cfg = getConfig();
  console.log(`[Chaos Commerce] Registering Conductor taskdefs & workflows at ${cfg.conductorServerUrl} ...`);
  const summary = await registerAllDefinitions();
  console.log(
    `[Chaos Commerce] Worker Gate PASSED (${summary.registeredTaskDefs.length} SIMPLE taskdefs verified).`
  );
  for (const wf of summary.registeredWorkflows) {
    console.log(
      `[Chaos Commerce] Registered workflow: ${wf.name} (v${wf.version}) -> ${cfg.conductorUiUrl}/workflowDef/${wf.name}`
    );
  }
}

main().catch((err) => {
  console.error("[Chaos Commerce] Workflow registration failed:", err.message);
  process.exit(1);
});
