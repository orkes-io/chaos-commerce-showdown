import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

function ensureBuilt() {
  const backendModules = path.join(rootDir, "backend", "node_modules");
  const frontendModules = path.join(rootDir, "frontend", "node_modules");
  const frontendIndex = path.join(rootDir, "frontend", "dist", "index.html");

  if (!fs.existsSync(backendModules)) {
    console.log("[Chaos Commerce] Installing backend dependencies...");
    execSync("npm --prefix backend install", { cwd: rootDir, stdio: "inherit" });
  }
  if (!fs.existsSync(frontendModules)) {
    console.log("[Chaos Commerce] Installing frontend dependencies...");
    execSync("npm --prefix frontend install", { cwd: rootDir, stdio: "inherit" });
  }
  if (!fs.existsSync(frontendIndex) || process.argv.includes("--rebuild")) {
    console.log("[Chaos Commerce] Building static frontend bundle...");
    execSync("npm --prefix frontend run build", { cwd: rootDir, stdio: "inherit" });
  }
  execSync("node scripts/sync-workflows.mjs", { cwd: rootDir, stdio: "inherit" });
}

async function stopPriorChaosInstanceIfRunning(port) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 1200);
    const res = await fetch(`http://127.0.0.1:${port}/api/health`, {
      signal: controller.signal
    });
    clearTimeout(timer);
    if (!res.ok) return;
    const data = await res.json();
    if (
      data?.service === "chaos-commerce" &&
      Number.isInteger(data.pid) &&
      data.pid !== process.pid
    ) {
      console.log(
        `[Chaos Commerce] Gracefully replacing prior Chaos Commerce instance (PID ${data.pid}) on port ${port}...`
      );
      try {
        process.kill(data.pid, "SIGTERM");
      } catch {
        return;
      }
      for (let i = 0; i < 20; i += 1) {
        await new Promise((r) => setTimeout(r, 100));
        try {
          process.kill(data.pid, 0);
        } catch {
          break;
        }
      }
    }
  } catch {
    // Port is free
  }
}

async function main() {
  ensureBuilt();
  const port = Number(process.env.PORT || 3000);
  await stopPriorChaosInstanceIfRunning(port);
  const { startServer } = await import("../backend/src/server.js");
  await startServer();
}

main().catch((err) => {
  console.error("[Chaos Commerce] Startup failed:", err);
  process.exit(1);
});
