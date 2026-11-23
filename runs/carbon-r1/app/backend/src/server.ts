import http from "node:http";
import { handleAppRequest } from "./app.js";
import { config } from "./config.js";
import {
  registerChaosDefinitions,
  startWorkerDaemon,
  stopWorkerDaemon
} from "./conductor.js";

async function readRequestBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

async function main() {
  console.log(`[Chaos Commerce] Connecting to Conductor at ${config.conductorServerUrl} ...`);
  const reg = await registerChaosDefinitions();
  console.log(
    `[Chaos Commerce] Registered ${reg.tasksRegistered.length} tasks & ${reg.workflowsRegistered.length} workflows (${reg.workflowsRegistered.join(", ")})`
  );

  if (config.workerMode === "daemon") {
    await startWorkerDaemon();
    console.log(`[Chaos Commerce] Conductor TaskManager workers polling actively.`);
  }

  const server = http.createServer(async (req, res) => {
    try {
      const host = req.headers.host || `localhost:${config.port}`;
      const parsedUrl = new URL(req.url || "/", `http://${host}`);
      const bodyText =
        req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS"
          ? ""
          : await readRequestBody(req);

      const headersRecord: Record<string, string | undefined> = {};
      for (const [k, v] of Object.entries(req.headers)) {
        headersRecord[k] = Array.isArray(v) ? v.join(", ") : v;
      }

      const appRes = await handleAppRequest({
        method: req.method || "GET",
        path: parsedUrl.pathname,
        query: parsedUrl.searchParams,
        headers: headersRecord,
        bodyText
      });

      res.writeHead(appRes.statusCode, appRes.headers);
      res.end(appRes.body);
    } catch (err: any) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: err?.message || "Internal Chaos Error" }));
    }
  });

  server.listen(config.port, "0.0.0.0", () => {
    console.log(
      `[Chaos Commerce] Storefront & API live at http://localhost:${config.port} (Conductor UI: ${config.conductorUiUrl})`
    );
  });

  const shutdown = async () => {
    console.log("\n[Chaos Commerce] Shutting down workers and HTTP server...");
    await stopWorkerDaemon();
    server.close(() => process.exit(0));
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  console.error("[Chaos Commerce] Fatal startup error:", err);
  process.exit(1);
});
