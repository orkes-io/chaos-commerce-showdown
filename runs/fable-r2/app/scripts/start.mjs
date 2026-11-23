#!/usr/bin/env node
// One command for local use: registers the workflows on Conductor, then serves the static
// storefront and the API together on http://localhost:3000 (PORT to change).

import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const FRONTEND_DIR = join(ROOT, 'frontend');
const ENV_FILE = join(ROOT, '.env');
if (existsSync(ENV_FILE)) process.loadEnvFile(ENV_FILE); // real environment variables win

const { MAX_BODY_BYTES, createApp } = await import('../backend/src/app.mjs');

const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
};

const log = (message) => console.log(`[chaos-commerce] ${message}`);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const app = createApp();
const { config, conductor } = app;

async function registerWithRetry({ attempts }) {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const names = await app.registerWorkflows();
      log(`Registered ${names.length} workflows on ${conductor.baseUrl}: ${names.join(', ')}`);
      return true;
    } catch (error) {
      log(`Could not register workflows (attempt ${attempt}/${attempts}): ${error.message}`);
      if (attempt < attempts) await sleep(2000);
    }
  }
  return false;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(Object.assign(new Error('body too large'), { tooLarge: true }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

async function serveStatic(pathname, res, headOnly) {
  let relative;
  try {
    relative = normalize(decodeURIComponent(pathname));
  } catch {
    relative = sep;
  }
  let file = join(FRONTEND_DIR, relative);
  if (file !== FRONTEND_DIR && !file.startsWith(FRONTEND_DIR + sep)) file = FRONTEND_DIR;
  if (!extname(file)) file = join(file, 'index.html');
  try {
    const content = await readFile(file);
    res.writeHead(200, {
      'Content-Type': CONTENT_TYPES[extname(file)] ?? 'application/octet-stream',
      'Cache-Control': 'no-cache',
      'X-Content-Type-Options': 'nosniff',
    });
    res.end(headOnly ? undefined : content);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('404: this page is missing, like most of our inventory.');
  }
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  try {
    if (url.pathname === '/api' || url.pathname.startsWith('/api/')) {
      const body = await readBody(req);
      const response = await app.handle({ method: req.method, path: url.pathname, headers: req.headers, body });
      res.writeHead(response.status, response.headers);
      res.end(response.body);
      return;
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8', Allow: 'GET, HEAD' });
      res.end('Method not allowed.');
      return;
    }
    await serveStatic(url.pathname, res, req.method === 'HEAD');
  } catch (error) {
    if (res.headersSent) {
      res.destroy();
      return;
    }
    const status = error.tooLarge ? 413 : 500;
    res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', Connection: 'close' });
    res.end(JSON.stringify({ error: { code: error.tooLarge ? 'BODY_TOO_LARGE' : 'INTERNAL_ERROR', message: 'That request could not be handled.' } }));
    if (!error.tooLarge) console.error('[chaos-commerce] request failed', error);
  }
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`[chaos-commerce] Port ${config.port} is already in use. Stop whatever is using it or set PORT to another port.`);
  } else {
    console.error('[chaos-commerce] server error', error);
  }
  process.exit(1);
});

log(`Using Conductor at ${conductor.baseUrl}`);
let registered = await registerWithRetry({ attempts: 15 });
if (!registered) {
  log('Conductor is not reachable yet. Starting the store anyway; registration keeps retrying in the background.');
}

server.listen(config.port, () => {
  log(`Store open at http://localhost:${config.port}  (API under /api, health at /api/health)`);
});

// Background upkeep: finish registration if Conductor was down at start, and make sure every
// checkout or return that ended without completing gets its rescue workflow.
let sweeping = false;
const upkeep = setInterval(async () => {
  if (sweeping) return;
  sweeping = true;
  try {
    if (!registered) registered = await registerWithRetry({ attempts: 1 });
    if (registered) {
      const summary = await app.reconcile();
      if (summary.checked > 0) log(`Rescue sweep: ${summary.settled} settled, ${summary.pending} still being rescued`);
    }
  } catch (error) {
    log(`Rescue sweep skipped: ${error.message}`);
  } finally {
    sweeping = false;
  }
}, Math.max(config.reconcileIntervalMs, 1000));
upkeep.unref();

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    log('Closing the store. No refunds.');
    clearInterval(upkeep);
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 2000).unref();
  });
}
