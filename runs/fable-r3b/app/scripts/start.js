// One command for local use: registers the workflows on Conductor, then serves
// the storefront (frontend/) and the API (/api/*) from one process.
// Usage: npm start
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { createApp } from '../backend/src/app.js';
import { loadEnvironment, projectRoot, registerWorkflows } from './registration.js';

const FRONTEND_DIR = path.join(projectRoot, 'frontend');
const MAX_BODY_BYTES = 16 * 1024;
const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

function readBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    request.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(Object.assign(new Error('Request body is too large.'), { status: 413 }));
        request.resume();
        return;
      }
      chunks.push(chunk);
    });
    request.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    request.on('error', reject);
  });
}

async function serveStatic(pathname, response) {
  let relative;
  try {
    relative = decodeURIComponent(pathname);
  } catch {
    relative = null;
  }
  const file = relative === null ? null : path.join(FRONTEND_DIR, relative.endsWith('/') ? `${relative}index.html` : relative);
  if (!file || !file.startsWith(FRONTEND_DIR + path.sep)) {
    response.writeHead(400, { 'content-type': 'text/plain; charset=utf-8' }).end('Bad request');
    return;
  }
  try {
    const content = await readFile(file);
    response.writeHead(200, {
      'content-type': CONTENT_TYPES[path.extname(file)] || 'application/octet-stream',
      'cache-control': 'no-cache',
    }).end(content);
  } catch {
    response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }).end('Not found');
  }
}

async function main() {
  const { config, conductor } = loadEnvironment();
  console.log(`Conductor: ${config.conductorUrl}`);
  await registerWorkflows(conductor);

  const app = createApp({ config, conductor });
  const server = http.createServer(async (request, response) => {
    const { pathname } = new URL(request.url, 'http://localhost');
    try {
      if (pathname === '/api' || pathname.startsWith('/api/')) {
        const result = await app({ method: request.method, path: pathname, body: await readBody(request) });
        response.writeHead(result.status, result.headers).end(result.body);
      } else if (request.method === 'GET' || request.method === 'HEAD') {
        await serveStatic(pathname, response);
      } else {
        response.writeHead(405, { 'content-type': 'text/plain; charset=utf-8' }).end('Method not allowed');
      }
    } catch (error) {
      const status = error.status || 500;
      if (status === 500) console.error(error);
      response.writeHead(status, { 'content-type': 'application/json; charset=utf-8' }).end(JSON.stringify({ error: error.message }));
    }
  });

  server.on('error', (error) => {
    console.error(error.code === 'EADDRINUSE' ? `Port ${config.port} is already in use. Stop whatever is using it, or set PORT.` : error.message);
    process.exit(1);
  });
  server.listen(config.port, () => {
    console.log(`Chaos Commerce is open for business (somehow): http://localhost:${config.port}`);
  });
  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.on(signal, () => {
      server.close(() => process.exit(0));
      server.closeAllConnections();
    });
  }
}

main().catch((error) => {
  console.error(`Could not start Chaos Commerce: ${error.message}`);
  process.exit(1);
});
