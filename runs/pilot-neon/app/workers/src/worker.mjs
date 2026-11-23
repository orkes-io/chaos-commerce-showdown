import { orkesConductorClient, TaskManager } from "@io-orkes/conductor-javascript";
import { chaosTaskHandlers } from "./handlers.mjs";

function normalizeApiBase(rawUrl) {
  const base = (rawUrl || "http://localhost:8080/api").trim().replace(/\/+$/, "");
  return base.endsWith("/api") ? base : `${base}/api`;
}

export async function startChaosWorkers({
  serverUrl = process.env.CONDUCTOR_SERVER_URL || "http://localhost:8080/api",
  keyId = process.env.CONDUCTOR_AUTH_KEY,
  keySecret = process.env.CONDUCTOR_AUTH_SECRET,
  pollInterval = Number(process.env.CONDUCTOR_WORKER_POLL_INTERVAL || 150),
  concurrency = Number(process.env.CONDUCTOR_WORKER_CONCURRENCY || 4),
} = {}) {
  const apiBase = normalizeApiBase(serverUrl);
  const clientConfig = { serverUrl: apiBase };
  if (keyId && keySecret) {
    clientConfig.keyId = keyId;
    clientConfig.keySecret = keySecret;
  }

  const client = await orkesConductorClient(clientConfig);

  const workerList = Object.entries(chaosTaskHandlers).map(([taskDefName, handler]) => ({
    taskDefName,
    concurrency,
    pollInterval,
    execute: async (task) => {
      try {
        const outputData = await handler(task?.inputData || {}, task);
        return {
          status: "COMPLETED",
          outputData,
        };
      } catch (err) {
        console.error(`[worker:${taskDefName}] Task failed:`, err);
        return {
          status: "FAILED",
          reasonForIncompletion: err?.message || "Unexpected worker chaos",
        };
      }
    },
  }));

  const taskManager = new TaskManager(client, workerList, {
    options: {
      pollInterval,
      concurrency,
    },
    logger: {
      info: () => {},
      debug: () => {},
      error: (...args) => console.error("[conductor-worker]", ...args),
    },
  });

  taskManager.startPolling();
  console.log(
    `[workers] Polling ${workerList.length} Chaos Commerce Conductor tasks against ${apiBase} (interval=${pollInterval}ms, concurrency=${concurrency})`,
  );

  return {
    taskManager,
    workerCount: workerList.length,
    stop: async () => {
      await taskManager.stopPolling();
    },
  };
}

if (process.argv[1] && process.argv[1].endsWith("worker.mjs")) {
  let instance;
  startChaosWorkers()
    .then((started) => {
      instance = started;
    })
    .catch((err) => {
      console.error("[workers] Failed to start:", err);
      process.exit(1);
    });

  const shutdown = async () => {
    if (instance) {
      await instance.stop();
    }
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}
