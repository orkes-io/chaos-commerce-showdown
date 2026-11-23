// One command for local use: registers the workflows with Conductor, then
// serves the storefront and the API together on http://localhost:3000.
//
// The static files come straight from frontend/ (what GitHub Pages serves) and
// /api/* requests go through the real Lambda handler (what AWS runs), so the
// local store exercises the same code as the deployed one.

import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { loadDotEnv, registerWorkflows } from "./register.js";
import { loadConfig } from "../backend/src/config.js";

loadDotEnv();
const port = Number.parseInt(process.env.PORT ?? "3000", 10);
const frontendDir = fileURLToPath(new URL("../frontend/", import.meta.url));

const CONTENT_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
};

let config;
try {
  config = loadConfig();
  // Locally the Conductor UI is served by the Conductor server itself.
  process.env.CONDUCTOR_UI_URL ??= config.conductorUrl.replace(/\/api$/, "");
  console.log(`Conductor: ${config.conductorUrl}`);
  await registerWorkflows({ config });
} catch (error) {
  console.error(`\nCould not register the workflows: ${error.message}`);
  console.error("Check that Conductor is running and that CONDUCTOR_SERVER_URL points at it.");
  process.exit(1);
}

const { handler } = await import("../backend/src/lambda.js");

function readBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    request.on("data", (chunk) => {
      size += chunk.length;
      if (size > 1024 * 1024) request.destroy(new Error("Request body too large"));
      else chunks.push(chunk);
    });
    request.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    request.on("error", reject);
  });
}

async function serveApi(request, response, url) {
  const result = await handler({
    version: "2.0",
    rawPath: url.pathname,
    rawQueryString: url.search.slice(1),
    headers: request.headers,
    requestContext: { http: { method: request.method, path: url.pathname } },
    body: request.method === "POST" ? await readBody(request) : null,
    isBase64Encoded: false,
  });
  response.writeHead(result.statusCode, result.headers);
  response.end(result.body);
}

async function serveStatic(request, response, url) {
  if (request.method !== "GET" && request.method !== "HEAD") {
    response.writeHead(405, { allow: "GET, HEAD" }).end();
    return;
  }
  let relative;
  try {
    relative = normalize(decodeURIComponent(url.pathname));
  } catch {
    relative = sep;
  }
  if (relative.endsWith(sep)) relative += "index.html";
  const file = join(frontendDir, relative);
  let status = 200;
  let content;
  try {
    if (!file.startsWith(frontendDir)) throw new Error("outside frontend/");
    content = await readFile(file);
  } catch {
    // Same behaviour as GitHub Pages: unknown paths get 404.html.
    status = 404;
    content = await readFile(join(frontendDir, "404.html"));
  }
  response.writeHead(status, {
    "content-type": status === 404 ? CONTENT_TYPES[".html"] : (CONTENT_TYPES[extname(file)] ?? "application/octet-stream"),
    "cache-control": "no-cache",
  });
  response.end(request.method === "HEAD" ? undefined : content);
}

const server = createServer((request, response) => {
  const url = new URL(request.url, "http://localhost");
  const serve = url.pathname === "/api" || url.pathname.startsWith("/api/") ? serveApi : serveStatic;
  serve(request, response, url).catch((error) => {
    console.error(error);
    if (!response.headersSent) response.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
    response.end("Internal error");
  });
});

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(`\nPort ${port} is already in use. Stop whatever is using it, or run with PORT=<other port>.`);
  } else {
    console.error(error);
  }
  process.exit(1);
});

server.listen(port, () => {
  console.log(`\nChaos Commerce is open for business: http://localhost:${port}`);
  console.log(`Conductor UI (executions): ${process.env.CONDUCTOR_UI_URL}`);
  console.log("Press Ctrl+C to close the store.");
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 1000).unref();
  });
}
