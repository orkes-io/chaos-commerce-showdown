// Builds the registrable workflow definitions in conductor/workflows/ from the
// sources in conductor/src/. A source is a normal Conductor workflow definition
// except that a jq program is written as {"$jq": "file.jq"} and kept in
// conductor/src/jq/, where it can span lines and carry comments.
//
//   node conductor/build.mjs           write conductor/workflows/*.json
//   node conductor/build.mjs --check   exit 1 if those files are out of date

import { readFileSync, readdirSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const srcDir = join(here, "src");
const jqDir = join(srcDir, "jq");
export const outDir = join(here, "workflows");

function loadJq(file) {
  return readFileSync(join(jqDir, file), "utf8")
    .split("\n")
    .filter((line) => !line.trimStart().startsWith("#"))
    .join("\n")
    .trim();
}

function inline(node) {
  if (Array.isArray(node)) return node.map(inline);
  if (node && typeof node === "object") {
    const keys = Object.keys(node);
    if (keys.length === 1 && keys[0] === "$jq") return loadJq(node.$jq);
    return Object.fromEntries(keys.map((key) => [key, inline(node[key])]));
  }
  return node;
}

export function buildWorkflows() {
  return readdirSync(srcDir)
    .filter((file) => file.endsWith(".json"))
    .sort()
    .map((file) => inline(JSON.parse(readFileSync(join(srcDir, file), "utf8"))));
}

export function listTasks(tasks, found = []) {
  for (const task of tasks ?? []) {
    found.push(task);
    listTasks(task.loopOver, found);
    listTasks(task.defaultCase, found);
    for (const branch of Object.values(task.decisionCases ?? {})) listTasks(branch, found);
    for (const branch of task.forkTasks ?? []) listTasks(branch, found);
  }
  return found;
}

const render = (definition) => JSON.stringify(definition, null, 2) + "\n";

export function writeWorkflows() {
  mkdirSync(outDir, { recursive: true });
  const definitions = buildWorkflows();
  for (const definition of definitions) {
    writeFileSync(join(outDir, `${definition.name}.json`), render(definition));
  }
  return definitions;
}

export function staleWorkflows() {
  return buildWorkflows()
    .filter((definition) => {
      const file = join(outDir, `${definition.name}.json`);
      return !existsSync(file) || readFileSync(file, "utf8") !== render(definition);
    })
    .map((definition) => definition.name);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.argv.includes("--check")) {
    const stale = staleWorkflows();
    if (stale.length > 0) {
      console.error(`Out of date: ${stale.join(", ")}. Run "npm run build:workflows".`);
      process.exit(1);
    }
    console.log("conductor/workflows is up to date.");
  } else {
    for (const definition of writeWorkflows()) {
      console.log(`wrote conductor/workflows/${definition.name}.json`);
    }
  }
}
