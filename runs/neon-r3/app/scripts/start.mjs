#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { getConfig } from '../backend/src/config.mjs';
import { registerWorkflows } from '../workflows/register.mjs';
import { createChaosServer } from '../backend/src/server.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const frontendDir = path.join(repoRoot, 'frontend');
const distIndex = path.join(frontendDir, 'dist', 'index.html');

function getLatestMtimeMs(dir) {
  let latest = 0;
  if (!fs.existsSync(dir)) return latest;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      latest = Math.max(latest, getLatestMtimeMs(full));
    } else {
      latest = Math.max(latest, fs.statSync(full).mtimeMs);
    }
  }
  return latest;
}

function ensureFrontendBuilt() {
  const nodeModulesDir = path.join(frontendDir, 'node_modules');
  if (!fs.existsSync(nodeModulesDir)) {
    console.log('[chaos-commerce] Installing frontend dependencies...');
    execFileSync('npm', ['--prefix', frontendDir, 'install'], { stdio: 'inherit' });
  }

  const needsBuild =
    !fs.existsSync(distIndex) ||
    getLatestMtimeMs(path.join(frontendDir, 'src')) > fs.statSync(distIndex).mtimeMs ||
    getLatestMtimeMs(path.join(frontendDir, 'public')) > fs.statSync(distIndex).mtimeMs;

  if (needsBuild) {
    console.log('[chaos-commerce] Building static frontend (GitHub Pages bundle)...');
    execFileSync('npm', ['--prefix', frontendDir, 'run', 'build'], { stdio: 'inherit' });
  } else {
    console.log('[chaos-commerce] Frontend build is up to date.');
  }
}

async function main() {
  const config = getConfig();

  console.log(`[chaos-commerce] Connecting to Conductor at ${config.conductorApiUrl}...`);
  const registered = await registerWorkflows({ serverUrl: config.conductorApiUrl });
  for (const wf of registered) {
    console.log(`[chaos-commerce] Registered Conductor workflow: ${wf.name} v${wf.version}`);
  }

  ensureFrontendBuilt();

  const { server } = createChaosServer();
  server.listen(config.port, config.host, () => {
    console.log('');
    console.log('==============================================================');
    console.log(`  CHAOS COMMERCE™ IS LIVE AT: http://localhost:${config.port}`);
    console.log(`  Conductor API:              ${config.conductorApiUrl}`);
    console.log(`  Conductor UI:               ${config.conductorUiUrl}`);
    console.log('  AI APIs called at runtime:  NONE (100% deterministic)');
    console.log('==============================================================');
    console.log('');
  });
}

main().catch((err) => {
  console.error('[chaos-commerce] Startup failed:', err.message);
  process.exit(1);
});
