#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const outDir = path.join(rootDir, "dist", "lambda");

fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(path.join(outDir, "src"), { recursive: true });
fs.mkdirSync(path.join(outDir, "workflows"), { recursive: true });

fs.cpSync(path.join(rootDir, "backend", "package.json"), path.join(outDir, "package.json"));
fs.cpSync(path.join(rootDir, "backend", "src"), path.join(outDir, "src"), {
  recursive: true,
});

for (const file of fs.readdirSync(path.join(rootDir, "workflows"))) {
  if (file.endsWith(".json")) {
    fs.cpSync(
      path.join(rootDir, "workflows", file),
      path.join(outDir, "workflows", file)
    );
  }
}

console.log(`[Chaos Commerce] Staged stateless AWS Lambda bundle at ${outDir}`);
