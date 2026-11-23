import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import express from "express";
import { config, REPO_ROOT } from "./config.js";
import { createApp } from "./app.js";
import { registerAllConductorDefinitions } from "./register.js";
import { startChaosWorkers } from "./workers.js";

function ensureFrontendBuilt() {
  const indexPath = path.join(config.frontendDistDir, "index.html");
  if (fs.existsSync(indexPath)) {
    return;
  }
  console.log("[startup] frontend/dist not found — building frontend bundle...");
  execSync("npm run build:frontend", {
    cwd: REPO_ROOT,
    stdio: "inherit",
  });
}

async function main() {
  console.log("============================================================");
  console.log("  CHAOS COMMERCE — Starting Local Full-Stack Storefront");
  console.log("============================================================");
  console.log(`[config] Conductor API URL : ${config.conductorServerUrl}`);
  console.log(`[config] Conductor UI URL  : ${config.conductorUiUrl}`);
  console.log(`[config] Storefront Port   : ${config.port}`);

  // 1. Ensure static frontend bundle exists
  ensureFrontendBuilt();

  // 2. Register Conductor task definitions and workflows
  console.log("[startup] Registering Conductor task definitions and workflows...");
  const reg = await registerAllConductorDefinitions();
  console.log(
    `[startup] Registered ${reg.taskCount} tasks & ${reg.workflowCount} workflows (${reg.workflowNames.join(", ")})`
  );

  // 3. Start Conductor task workers
  console.log("[startup] Starting Conductor SIMPLE task workers...");
  const workerRunner = await startChaosWorkers();
  console.log(
    `[startup] ${workerRunner.workerCount} workers polling ${config.conductorServerUrl}`
  );

  // 4. Mount Express API + static GitHub Pages frontend bundle on port 3000
  const app = createApp();
  app.use(express.static(config.frontendDistDir));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api/")) return next();
    res.sendFile(path.join(config.frontendDistDir, "index.html"));
  });

  const server = app.listen(config.port, () => {
    console.log("------------------------------------------------------------");
    console.log(`  Storefront live at : http://localhost:${config.port}`);
    console.log(`  Backend API at     : http://localhost:${config.port}/api/health`);
    console.log(`  Conductor UI at    : ${config.conductorUiUrl}`);
    console.log("------------------------------------------------------------");
  });

  const shutdown = async (signal) => {
    console.log(`\n[shutdown] Received ${signal}. Stopping workers and HTTP server (leaving Conductor untouched)...`);
    try {
      await workerRunner.stop();
    } catch (err) {
      console.warn("[shutdown] Worker stop warning:", err.message);
    }
    server.close(() => {
      console.log("[shutdown] Cleanly stopped.");
      process.exit(0);
    });
    setTimeout(() => process.exit(0), 3000).unref();
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

main().catch((err) => {
  console.error("[startup] Fatal error:", err);
  process.exit(1);
});
