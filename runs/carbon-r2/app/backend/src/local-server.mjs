import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { getConfig } from "./config.mjs";
import { handleApiRequest } from "./app.mjs";

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
};

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;
    req.on("data", (chunk) => {
      total += chunk.length;
      if (total > 2 * 1024 * 1024) {
        reject(new Error("Payload too large"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function serveStaticAsset(res, distDir, urlPath) {
  if (!fs.existsSync(distDir)) {
    res.writeHead(503, { "Content-Type": "text/plain; charset=utf-8" });
    res.end(
      "Frontend build not found in frontend/dist. Run `npm start` or `npm run build` first."
    );
    return;
  }

  const safeRel = decodeURIComponent(urlPath.split("?")[0])
    .replace(/^\/+/, "")
    .replace(/\.\./g, "");
  let candidate = path.join(distDir, safeRel || "index.html");

  if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) {
    candidate = path.join(candidate, "index.html");
  }

  if (!fs.existsSync(candidate)) {
    // SPA fallback to index.html
    candidate = path.join(distDir, "index.html");
  }

  const ext = path.extname(candidate).toLowerCase();
  const contentType = MIME_TYPES[ext] || "application/octet-stream";
  const content = fs.readFileSync(candidate);
  res.writeHead(200, { "Content-Type": contentType });
  res.end(content);
}

const config = getConfig();

const server = http.createServer(async (req, res) => {
  const urlObj = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
  const pathname = urlObj.pathname;

  if (pathname === "/api" || pathname.startsWith("/api/")) {
    try {
      const body =
        req.method === "GET" || req.method === "HEAD" ? "" : await readBody(req);
      const apiResp = await handleApiRequest({
        method: req.method,
        pathname,
        headers: req.headers,
        body,
      });
      res.writeHead(apiResp.statusCode, apiResp.headers);
      res.end(apiResp.body);
    } catch (err) {
      res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  serveStaticAsset(res, config.frontendDistDir, pathname);
});

server.listen(config.port, config.host, () => {
  console.log(
    `[Chaos Commerce] Store & API running at http://localhost:${config.port}`
  );
  console.log(
    `[Chaos Commerce] Connected to Conductor API at ${config.conductorApiUrl} (UI: ${config.conductorUiUrl})`
  );
});
