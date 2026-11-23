import { registerAllConductorDefinitions } from "./register.js";
import { startChaosWorkers } from "./workers.js";
import { config } from "./config.js";

async function main() {
  console.log(`[workers] Connecting to Conductor at ${config.conductorServerUrl}...`);
  const reg = await registerAllConductorDefinitions();
  console.log(
    `[workers] Registered ${reg.taskCount} tasks and ${reg.workflowCount} workflows.`
  );

  const runner = await startChaosWorkers();
  console.log(`[workers] Polling ${runner.workerCount} Conductor SIMPLE task queues.`);

  const shutdown = async (sig) => {
    console.log(`[workers] Received ${sig}, stopping pollers...`);
    await runner.stop();
    process.exit(0);
  };
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

main().catch((err) => {
  console.error("[workers] Fatal error:", err);
  process.exit(1);
});
