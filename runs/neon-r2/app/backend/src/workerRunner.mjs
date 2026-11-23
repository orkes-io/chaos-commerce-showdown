import { loadConfig } from "./config.mjs";
import { registerAllWorkflows } from "./registerWorkflows.mjs";
import { startChaosWorkers } from "./workers.mjs";

async function main() {
  const config = loadConfig();
  console.log(`[Chaos Workers] Connecting to Conductor at ${config.conductorServerUrl}`);
  const reg = await registerAllWorkflows(config);
  console.log(
    `[Chaos Workers] Verified ${reg.taskCount} task defs & workflows: ${reg.workflows.join(", ")}`
  );

  const runner = await startChaosWorkers(config);
  console.log(`[Chaos Workers] Polling ${runner.workerCount} SIMPLE task queues...`);

  const shutdown = async () => {
    console.log("[Chaos Workers] Stopping workers...");
    await runner.stop();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  console.error("[Chaos Workers] Fatal error:", err);
  process.exit(1);
});
