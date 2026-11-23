import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");

function runOrFail(cmd, args, cwd = ROOT) {
  const result = spawnSync(cmd, args, {
    cwd,
    stdio: "inherit",
    env: process.env,
  });
  if (result.status !== 0) {
    throw new Error(`Command "${cmd} ${args.join(" ")}" failed with exit code ${result.status}`);
  }
}

async function main() {
  const backendNodeModules = path.join(ROOT, "backend", "node_modules");
  const frontendNodeModules = path.join(ROOT, "frontend", "node_modules");
  const frontendDistIndex = path.join(ROOT, "frontend", "dist", "index.html");

  if (!fs.existsSync(backendNodeModules)) {
    console.log("[Chaos Commerce] Installing backend dependencies...");
    runOrFail("npm", ["--prefix", "backend", "install"]);
  }

  if (!fs.existsSync(frontendNodeModules)) {
    console.log("[Chaos Commerce] Installing frontend dependencies...");
    runOrFail("npm", ["--prefix", "frontend", "install"]);
  }

  if (!fs.existsSync(frontendDistIndex) || process.env.REBUILD_FRONTEND === "true") {
    console.log("[Chaos Commerce] Building static storefront bundle...");
    runOrFail("npm", ["--prefix", "frontend", "run", "build"]);
  }

  const { startLocalServer } = await import("../backend/src/server.mjs");
  const { stop } = await startLocalServer();

  const handleSignal = async () => {
    console.log("\n[Chaos Commerce] Shutting down storefront & Conductor workers...");
    await stop();
    process.exit(0);
  };

  process.on("SIGINT", handleSignal);
  process.on("SIGTERM", handleSignal);
}

main().catch((err) => {
  console.error("[Chaos Commerce] Launch failed:", err.message);
  process.exit(1);
});
