import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getConfig } from "./config.js";
import { handleApiRequest } from "./app.js";
import {
  registerAllDefinitions,
  startBackgroundWorkers,
  stopBackgroundWorkers
} from "./conductor-client.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const frontendDistDir = path.resolve(__dirname, "../../frontend/dist");

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2"
};

function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > 2 * 1024 * 1024) {
        reject(new Error("Request payload too large"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8");
      if (!raw) {
        resolve(null);
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch {
        resolve({});
      }
    });
    req.on("error", reject);
  });
}

function serveStaticFrontend(reqUrl, res) {
  let relPath = decodeURIComponent(reqUrl.pathname || "/");
  if (relPath === "/") {
    relPath = "/index.html";
  }

  const safeTarget = path.resolve(frontendDistDir, `.${relPath}`);
  if (!safeTarget.startsWith(frontendDistDir)) {
    res.writeHead(403, { "Content-Type": "text/plain" });
    res.end("Forbidden");
    return;
  }

  let fileToServe = safeTarget;
  if (!fs.existsSync(fileToServe) || fs.statSync(fileToServe).isDirectory()) {
    fileToServe = path.join(frontendDistDir, "index.html");
  }

  if (!fs.existsSync(fileToServe)) {
    res.writeHead(503, { "Content-Type": "text/plain; charset=utf-8" });
    res.end(
      "Frontend assets not built yet. Run `npm run build` or `npm start` from repository root."
    );
    return;
  }

  const ext = path.extname(fileToServe).toLowerCase();
  const contentType = MIME_TYPES[ext] || "application/octet-stream";
  res.writeHead(200, { "Content-Type": contentType });
  fs.createReadStream(fileToServe).pipe(res);
}

export async function startServer() {
  const cfg = getConfig();

  const reg = await registerAllDefinitions();
  console.log(
    `[Chaos Commerce] Registered ${reg.registeredWorkflows.length} Conductor workflows & ${reg.registeredTaskDefs.length} task definitions on ${cfg.conductorServerUrl}`
  );

  await startBackgroundWorkers();
  console.log(`[Chaos Commerce] Conductor background workers active.`);

  const server = http.createServer(async (req, res) => {
    try {
      const reqUrl = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

      if (reqUrl.pathname.startsWith("/api/") || reqUrl.pathname === "/api") {
        const body =
          req.method === "POST" || req.method === "PUT"
            ? await readRequestBody(req)
            : null;
        const query = Object.fromEntries(reqUrl.searchParams.entries());
        const response = await handleApiRequest({
          method: req.method,
          pathname: reqUrl.pathname,
          query,
          body
        });
        res.writeHead(response.statusCode, response.headers);
        res.end(response.body);
        return;
      }

      serveStaticFrontend(reqUrl, res);
    } catch (err) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: false, error: err.message }));
    }
  });

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(cfg.port, "0.0.0.0", resolve);
  });

  console.log(
    `[Chaos Commerce] Storefront & API live at http://localhost:${cfg.port} (Conductor UI: ${cfg.conductorUiUrl})`
  );

  const shutdown = async () => {
    server.close();
    await stopBackgroundWorkers();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  return server;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  startServer().catch((err) => {
    console.error("[Chaos Commerce] Failed to start server:", err);
    process.exit(1);
  });
}
