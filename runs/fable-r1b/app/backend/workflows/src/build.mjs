// Generates the Conductor workflow JSON in backend/workflows/ from the readable sources in this folder.
// Run: npm run build:workflows        Check only: node backend/workflows/src/build.mjs --check
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { chaosCheckout } from "./checkout.mjs";
import { chaosReturns } from "./returns.mjs";

const outDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const check = process.argv.includes("--check");
let stale = false;

for (const def of [chaosCheckout, chaosReturns]) {
  const file = path.join(outDir, `${def.name}.json`);
  const json = JSON.stringify(def, null, 2) + "\n";
  if (check) {
    let current = "";
    try {
      current = readFileSync(file, "utf8");
    } catch {}
    if (current !== json) {
      stale = true;
      console.error(`STALE: ${path.relative(process.cwd(), file)} (run npm run build:workflows)`);
    }
  } else {
    writeFileSync(file, json);
    console.log(`wrote ${path.relative(process.cwd(), file)}`);
  }
}

if (stale) process.exit(1);
