import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(backendRoot, "..");
const outDir = path.join(backendRoot, "dist-lambda");

fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

await build({
  entryPoints: [path.join(backendRoot, "src", "lambda.ts")],
  outfile: path.join(outDir, "index.mjs"),
  bundle: true,
  platform: "node",
  target: "node22",
  format: "esm",
  sourcemap: true,
  banner: {
    js: 'import { createRequire } from "node:module"; const require = createRequire(import.meta.url);'
  }
});

// Copy Conductor workflow & task JSON definitions alongside the Lambda bundle so Lambda can self-register if needed
fs.cpSync(path.join(repoRoot, "workflows"), path.join(outDir, "workflows"), { recursive: true });
fs.writeFileSync(
  path.join(outDir, "package.json"),
  JSON.stringify({ type: "module" }, null, 2),
  "utf8"
);

console.log(`[Chaos Commerce] AWS Lambda bundle built at ${outDir}`);
