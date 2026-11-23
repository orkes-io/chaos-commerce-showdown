import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootWorkflows = path.resolve(__dirname, "../workflows");
const backendWorkflows = path.resolve(__dirname, "../backend/workflows");

fs.mkdirSync(backendWorkflows, { recursive: true });
for (const file of fs.readdirSync(rootWorkflows)) {
  if (file.endsWith(".json")) {
    fs.copyFileSync(
      path.join(rootWorkflows, file),
      path.join(backendWorkflows, file)
    );
  }
}
console.log("[sync-workflows] Synced workflow definitions into backend/workflows/");
