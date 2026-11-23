// Registers the task definitions and workflows in ./conductor with the
// configured Conductor server. Upserts, so it is safe to run on every start.
//
//   npm run register

import { readdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { loadConfig } from "../backend/src/config.js";
import { createConductorClient } from "../backend/src/conductor.js";

const DEFINITIONS_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "conductor");

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

export async function loadDefinitions(dir = DEFINITIONS_DIR) {
  const taskDefs = await readJson(join(dir, "taskdefs.json"));
  const workflowFiles = (await readdir(join(dir, "workflows"))).filter((name) => name.endsWith(".json")).sort();
  const workflows = await Promise.all(workflowFiles.map((name) => readJson(join(dir, "workflows", name))));
  return { taskDefs, workflows };
}

// Every SIMPLE task in a workflow needs a registered task definition (for its
// timeouts and retries) and a worker. Returns the names that have neither.
export function simpleTaskNames(workflow) {
  const names = new Set();
  const visit = (tasks) => {
    for (const task of tasks || []) {
      if (task.type === "SIMPLE") names.add(task.name);
      visit(task.loopOver);
      (task.forkTasks || []).forEach(visit);
      Object.values(task.decisionCases || {}).forEach(visit);
      visit(task.defaultCase);
    }
  };
  visit(workflow.tasks);
  return [...names];
}

export async function register(config = loadConfig(), { log = console.log } = {}) {
  const conductor = createConductorClient(config);
  const { taskDefs, workflows } = await loadDefinitions();

  await conductor.registerTaskDefs(taskDefs);
  await conductor.registerWorkflows(workflows);

  const registered = new Set(await conductor.listTaskDefNames());
  for (const workflow of workflows) {
    const missing = simpleTaskNames(workflow).filter((name) => !registered.has(name));
    if (missing.length) {
      throw new Error(`Workflow ${workflow.name} uses SIMPLE tasks with no task definition: ${missing.join(", ")}`);
    }
  }

  log(`[register] ${taskDefs.length} task definitions and ${workflows.map((w) => `${w.name} v${w.version}`).join(", ")} registered at ${config.conductorUrl}`);
  return { taskDefs, workflows };
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  try {
    await register();
  } catch (error) {
    console.error(`[register] failed: ${error.message}`);
    process.exit(1);
  }
}
