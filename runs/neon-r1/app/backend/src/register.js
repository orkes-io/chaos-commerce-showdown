import fs from "node:fs";
import path from "node:path";
import { config } from "./config.js";
import {
  registerTaskDefinitions,
  registerWorkflowDefinitions,
} from "./conductorClient.js";

export async function registerAllConductorDefinitions() {
  const taskDefsPath = path.join(config.conductorDir, "task-defs.json");
  const workflowsDir = path.join(config.conductorDir, "workflows");

  const taskDefs = JSON.parse(fs.readFileSync(taskDefsPath, "utf8"));
  const workflowFiles = fs
    .readdirSync(workflowsDir)
    .filter((f) => f.endsWith(".json"))
    .sort();
  const workflowDefs = workflowFiles.map((file) =>
    JSON.parse(fs.readFileSync(path.join(workflowsDir, file), "utf8"))
  );

  await registerTaskDefinitions(taskDefs);
  await registerWorkflowDefinitions(workflowDefs);

  return {
    serverUrl: config.conductorServerUrl,
    taskCount: taskDefs.length,
    taskNames: taskDefs.map((t) => t.name),
    workflowCount: workflowDefs.length,
    workflowNames: workflowDefs.map((w) => `${w.name} (v${w.version})`),
  };
}

const isDirectRun =
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname);

if (isDirectRun) {
  registerAllConductorDefinitions()
    .then((summary) => {
      console.log(
        `[conductor] Registered ${summary.taskCount} task defs and ${summary.workflowCount} workflows on ${summary.serverUrl}`
      );
      console.log(`[conductor] Workflows: ${summary.workflowNames.join(", ")}`);
    })
    .catch((err) => {
      console.error("[conductor] Registration failed:", err.message);
      process.exit(1);
    });
}
