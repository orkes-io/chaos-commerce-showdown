#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

export CONDUCTOR_SERVER_URL="${CONDUCTOR_SERVER_URL:-http://localhost:8080/api}"
export PORT="${PORT:-3000}"

# Stop any prior Chaos Commerce local-server instance on PORT (never touches Conductor on 8080)
pkill -f "backend/src/local-server.mjs" 2>/dev/null || true

if [ ! -d "$ROOT_DIR/frontend/node_modules" ]; then
  echo "[Chaos Commerce] Installing frontend dependencies..."
  (cd "$ROOT_DIR/frontend" && npm install)
fi

echo "[Chaos Commerce] Registering Conductor workflows on ${CONDUCTOR_SERVER_URL}..."
node "$ROOT_DIR/workflows/register.mjs"

echo "[Chaos Commerce] Building static frontend for GitHub Pages / local serving..."
(cd "$ROOT_DIR/frontend" && npm run build)

echo "[Chaos Commerce] Starting unified store & API at http://localhost:${PORT}..."
exec node "$ROOT_DIR/backend/src/local-server.mjs"
