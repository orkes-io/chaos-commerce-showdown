import { loadConfig, FRONTEND_DIST_DIR } from "./config.mjs";
import { registerAllWorkflows } from "./registerWorkflows.mjs";
import { startChaosWorkers } from "./workers.mjs";
import { createApp } from "./app.mjs";

export async function startLocalServer(overrides = {}) {
  const config = loadConfig({ ...process.env, ...overrides });

  console.log(`[Chaos Commerce] Registering Conductor tasks & workflows at ${config.conductorServerUrl}...`);
  const registration = await registerAllWorkflows(config);
  console.log(
    `[Chaos Commerce] Registered ${registration.taskCount} tasks and ${registration.workflows.length} workflows (${registration.workflows.join(", ")}).`
  );

  const workerHandle = await startChaosWorkers(config);
  console.log(
    `[Chaos Commerce] Started ${workerHandle.workerCount} Conductor SIMPLE task workers.`
  );

  const app = createApp({
    config,
    serveStatic: true,
    frontendDistDir: FRONTEND_DIST_DIR,
    getWorkerStatus: () => ({
      embedded: true,
      polling: true,
      workerCount: workerHandle.workerCount,
    }),
  });

  const server = await new Promise((resolve, reject) => {
    const srv = app.listen(config.port, "0.0.0.0", () => resolve(srv));
    srv.on("error", reject);
  });

  console.log(`[Chaos Commerce] Storefront & API live at http://localhost:${config.port}`);
  console.log(`[Chaos Commerce] Conductor UI available at ${config.conductorUiUrl}`);

  const stop = async () => {
    await workerHandle.stop();
    await new Promise((resolve) => server.close(resolve));
  };

  return { server, workerHandle, config, stop };
}

const isDirectRun =
  process.argv[1] && process.argv[1].endsWith("server.mjs");

if (isDirectRun) {
  startLocalServer()
    .then(({ stop }) => {
      const handleSignal = async () => {
        console.log("\n[Chaos Commerce] Shutting down gracefully...");
        await stop();
        process.exit(0);
      };
      process.on("SIGINT", handleSignal);
      process.on("SIGTERM", handleSignal);
    })
    .catch((err) => {
      console.error("[Chaos Commerce] Startup failed:", err);
      process.exit(1);
    });
}
