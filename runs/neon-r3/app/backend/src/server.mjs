import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { getConfig } from './config.mjs';
import { handleApiRequest } from './app.mjs';

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
};

function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function serveStaticFile(reqPath, staticDir, res) {
  const decoded = decodeURIComponent(reqPath.split('?')[0]);
  const safeRelative = path.normalize(decoded).replace(/^(\.\.[/\\])+/, '');
  let targetPath = path.join(staticDir, safeRelative === '/' ? 'index.html' : safeRelative);

  if (!targetPath.startsWith(path.resolve(staticDir))) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Forbidden');
    return;
  }

  if (fs.existsSync(targetPath) && fs.statSync(targetPath).isDirectory()) {
    targetPath = path.join(targetPath, 'index.html');
  }

  if (!fs.existsSync(targetPath)) {
    const fallbackIndex = path.join(staticDir, 'index.html');
    if (fs.existsSync(fallbackIndex)) {
      targetPath = fallbackIndex;
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Frontend build not found. Run `npm run build` from the repo root.');
      return;
    }
  }

  const ext = path.extname(targetPath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': contentType });
  fs.createReadStream(targetPath).pipe(res);
}

export function createChaosServer() {
  const config = getConfig();

  const server = http.createServer(async (req, res) => {
    const urlPath = req.url || '/';

    if (urlPath.startsWith('/api/') || urlPath === '/api') {
      try {
        const body = req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS'
          ? ''
          : await readRequestBody(req);
        const result = await handleApiRequest({
          method: req.method,
          path: urlPath,
          headers: req.headers,
          body,
        });
        res.writeHead(result.statusCode, result.headers);
        res.end(result.body);
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: 'Internal server error', detail: err.message }));
      }
      return;
    }

    serveStaticFile(urlPath, config.staticDir, res);
  });

  return { server, config };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { server, config } = createChaosServer();
  server.listen(config.port, config.host, () => {
    console.log(`[chaos-commerce] Storefront & API listening at http://localhost:${config.port}`);
    console.log(`[chaos-commerce] Conductor API configured: ${config.conductorApiUrl}`);
  });
}
