#!/usr/bin/env node
// The one command: registers the Conductor workflows, then serves the whole store on one port.
//   /api/*      -> the real Lambda handler (backend/src/lambda.mjs), fed API Gateway-shaped events
//   everything else -> the static frontend (frontend/), exactly as GitHub Pages would serve it
import http from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { loadDotEnv, registerWorkflows, rootDir } from "./lib.mjs";

loadDotEnv();
const { createApp } = await import("../backend/src/app.mjs");
const { handler } = await import("../backend/src/lambda.mjs");

const port = Number.parseInt(process.env.PORT ?? "3000", 10) || 3000;
const host = process.env.HOST || undefined;
const frontendDir = path.join(rootDir, "frontend");
const MAX_BODY_BYTES = 256 * 1024;

const CONTENT_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
  ".webmanifest": "application/manifest+json",
};

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(Object.assign(new Error("body too large"), { statusCode: 413 }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

async function serveApi(req, res, url) {
  const body = await readBody(req);
  const result = await handler({
    version: "2.0",
    rawPath: url.pathname,
    rawQueryString: url.search.slice(1),
    headers: req.headers,
    requestContext: { http: { method: req.method, path: url.pathname } },
    body,
    isBase64Encoded: false,
  });
  res.writeHead(result.statusCode, result.headers);
  res.end(req.method === "HEAD" ? undefined : result.body);
}

async function serveStatic(req, res, url) {
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.writeHead(405, { Allow: "GET, HEAD" }).end();
    return;
  }
  let pathname;
  try {
    pathname = decodeURIComponent(url.pathname);
  } catch {
    pathname = "/";
  }
  let file = path.normalize(path.join(frontendDir, pathname));
  if (file !== frontendDir && !file.startsWith(frontendDir + path.sep)) {
    res.writeHead(403).end("Forbidden");
    return;
  }
  try {
    if ((await stat(file)).isDirectory()) file = path.join(file, "index.html");
    const data = await readFile(file);
    res.writeHead(200, {
      "Content-Type": CONTENT_TYPES[path.extname(file).toLowerCase()] ?? "application/octet-stream",
      "Cache-Control": "no-cache",
      "X-Content-Type-Options": "nosniff",
    });
    res.end(req.method === "HEAD" ? undefined : data);
  } catch {
    const notFound = await readFile(path.join(frontendDir, "404.html")).catch(() => "Not found");
    res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
    res.end(req.method === "HEAD" ? undefined : notFound);
  }
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? "/", "http://localhost");
    if (url.pathname === "/api" || url.pathname.startsWith("/api/")) await serveApi(req, res, url);
    else await serveStatic(req, res, url);
  } catch (error) {
    if (!res.headersSent) res.writeHead(error.statusCode ?? 500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: { code: "LOCAL_SERVER_ERROR", message: error.message } }));
  }
});

server.on("error", async (error) => {
  if (error.code !== "EADDRINUSE") {
    console.error(error);
    process.exit(1);
  }
  // Running the command twice is harmless: if the port is held by another copy of this store, say so.
  const running = await fetch(`http://localhost:${port}/api/health`, { signal: AbortSignal.timeout(3000) })
    .then((res) => res.json())
    .catch(() => null);
  if (running?.service === "chaos-commerce-backend") {
    console.log(`\nChaos Commerce is already running at http://localhost:${port} (Conductor: ${running.conductor?.url}).`);
    console.log("The workflows were registered again. To restart the store, stop that process first.");
    process.exit(0);
  }
  console.error(`\nPort ${port} is in use by something else. Stop it, or run: PORT=3001 npm start`);
  process.exit(1);
});

const app = createApp();
console.log("Chaos Commerce");
console.log(`  Conductor API: ${app.config.conductorUrl}`);
console.log("Registering workflows...");
const registered = await registerWorkflows(app, { attempts: 30 });
if (!registered) {
  console.warn("  WARNING: starting anyway. The backend re-registers the workflows on the first checkout or return.");
}

server.listen(port, host, () => {
  console.log(`\nStore:    http://localhost:${port}`);
  console.log(`API:      http://localhost:${port}/api/health`);
  if (app.config.conductorUiUrl) console.log(`Conductor: ${app.config.conductorUiUrl}`);
  console.log("Press Ctrl+C to stop (this never touches the Conductor server).");
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    console.log("\nClosing the store. All sales final.");
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 1500).unref();
  });
}
