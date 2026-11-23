import { getConfig } from "./config.js";
import {
  registerAllDefinitions,
  startBackgroundWorkers,
  stopBackgroundWorkers
} from "./conductor-client.js";

async function main() {
  const cfg = getConfig();
  await registerAllDefinitions();
  await startBackgroundWorkers();
  console.log(
    `[Chaos Commerce] Conductor workers polling ${cfg.conductorServerUrl} (Ctrl+C to stop)`
  );

  const shutdown = async () => {
    await stopBackgroundWorkers();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  console.error("[Chaos Commerce] Worker startup failed:", err.message);
  process.exit(1);
});
