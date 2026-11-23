#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function normalizeApiUrl(rawUrl) {
  const trimmed = (rawUrl || 'http://localhost:8080/api').trim().replace(/\/+$/, '');
  return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
}

export function getConductorAuthHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  if (process.env.CONDUCTOR_AUTH_TOKEN) {
    headers['X-Authorization'] = process.env.CONDUCTOR_AUTH_TOKEN;
  }
  return headers;
}

export async function registerWorkflows({ serverUrl } = {}) {
  const apiUrl = normalizeApiUrl(serverUrl || process.env.CONDUCTOR_SERVER_URL);
  const files = ['chaos_checkout_workflow.json', 'chaos_return_workflow.json'];
  const definitions = [];

  for (const file of files) {
    const raw = await fs.readFile(path.join(__dirname, file), 'utf8');
    definitions.push(JSON.parse(raw));
  }

  // PUT /api/metadata/workflow registers or updates definitions idempotently on Conductor OSS & Enterprise
  const res = await fetch(`${apiUrl}/metadata/workflow`, {
    method: 'PUT',
    headers: getConductorAuthHeaders(),
    body: JSON.stringify(definitions),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to register Conductor workflows at ${apiUrl} (${res.status}): ${text}`);
  }

  return definitions.map((d) => ({ name: d.name, version: d.version }));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  registerWorkflows()
    .then((registered) => {
      for (const wf of registered) {
        console.log(`[conductor] Registered workflow: ${wf.name} v${wf.version}`);
      }
    })
    .catch((err) => {
      console.error('[conductor] Workflow registration failed:', err.message);
      process.exit(1);
    });
}
