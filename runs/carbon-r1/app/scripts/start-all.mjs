import { spawn, execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

const frontendIndex = path.join(rootDir, "frontend", "dist", "index.html");
const backendServerJs = path.join(rootDir, "backend", "dist", "server.js");

if (!fs.existsSync(frontendIndex) || process.env.FORCE_BUILD === "1") {
  console.log("[Chaos Commerce] Building frontend static bundle for serving & GitHub Pages...");
  execSync("npm run build:frontend", { cwd: rootDir, stdio: "inherit" });
}

if (!fs.existsSync(backendServerJs) || process.env.FORCE_BUILD === "1") {
  console.log("[Chaos Commerce] Compiling backend & workers...");
  execSync("npm run build:backend", { cwd: rootDir, stdio: "inherit" });
}

const env = {
  ...process.env,
  PORT: process.env.PORT || "3000",
  CONDUCTOR_SERVER_URL: process.env.CONDUCTOR_SERVER_URL || "http://localhost:8080/api"
};

const child = spawn(process.execPath, [backendServerJs], {
  cwd: rootDir,
  env,
  stdio: "inherit"
});

for (const sig of ["SIGINT", "SIGTERM"]) {
  process.on(sig, () => {
    if (!child.killed) {
      child.kill(sig);
    }
  });
}

child.on("exit", (code) => {
  process.exit(code ?? 0);
});
