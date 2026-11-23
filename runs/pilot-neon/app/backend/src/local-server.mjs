import http from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getConfig } from "./config.mjs";
import { routeApiRequest } from "./router.mjs";

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
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".txt": "text/plain; charset=utf-8",
};

function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > 2 * 1024 * 1024) {
        reject(new Error("Request body too large"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      if (chunks.length === 0) return resolve(null);
      const raw = Buffer.concat(chunks).toString("utf8");
      try {
        resolve(JSON.parse(raw));
      } catch {
        resolve({ raw });
      }
    });
    req.on("error", reject);
  });
}

async function serveStaticFile(res, distDir, reqPathname) {
  const safePath = path.normalize(decodeURIComponent(reqPathname)).replace(/^(\.\.(\/|\\|$))+/, "");
  let filePath = path.join(distDir, safePath === "/" ? "index.html" : safePath);

  try {
    const fileStat = await stat(filePath);
    if (fileStat.isDirectory()) {
      filePath = path.join(filePath, "index.html");
    }
    const content = await readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      "Content-Type": MIME_TYPES[ext] || "application/octet-stream",
      "Cache-Control": ext === ".html" ? "no-cache" : "public, max-age=3600",
    });
    res.end(content);
    return;
  } catch {
    // SPA fallback to index.html
    try {
      const indexHtml = await readFile(path.join(distDir, "index.html"));
      res.writeHead(200, {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-cache",
      });
      res.end(indexHtml);
    } catch {
      res.writeHead(503, { "Content-Type": "text/plain; charset=utf-8" });
      res.end(
        "Frontend build not found at frontend/dist. Run `npm run build:frontend` or `npm start`.",
      );
    }
  }
}

export function startLocalServer(overrides = {}) {
  const config = { ...getConfig(), ...overrides };

  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

      if (url.pathname.startsWith("/api")) {
        const body =
          req.method === "POST" || req.method === "PUT" || req.method === "PATCH"
            ? await readRequestBody(req)
            : null;

        const query = Object.fromEntries(url.searchParams.entries());
        const apiRes = await routeApiRequest({
          method: req.method,
          pathname: url.pathname,
          query,
          body,
        });

        res.writeHead(apiRes.statusCode, apiRes.headers);
        res.end(apiRes.statusCode === 204 ? undefined : apiRes.body);
        return;
      }

      await serveStaticFile(res, config.frontendDistDir, url.pathname);
    } catch (err) {
      console.error("[server] Unhandled error:", err);
      res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ error: "Internal server chaos", detail: err?.message }));
    }
  });

  return new Promise((resolve, reject) => {
    server.on("error", reject);
    server.listen(config.port, config.host, () => {
      console.log(
        `[server] Chaos Commerce live at http://localhost:${config.port} (Conductor API: ${config.conductorApiUrl})`,
      );
      resolve(server);
    });
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  startLocalServer().catch((err) => {
    console.error("[server] Failed to start:", err);
    process.exit(1);
  });
}
