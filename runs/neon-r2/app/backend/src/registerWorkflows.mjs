import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadConfig, WORKFLOWS_DIR } from "./config.mjs";
import { ConductorApiClient } from "./conductorClient.mjs";

export async function registerAllWorkflows(config = loadConfig()) {
  const client = new ConductorApiClient(config);

  const tasksPath = path.join(WORKFLOWS_DIR, "tasks.json");
  const checkoutPath = path.join(WORKFLOWS_DIR, "chaos_checkout_workflow.json");
  const returnPath = path.join(WORKFLOWS_DIR, "chaos_return_workflow.json");

  const [tasksRaw, checkoutRaw, returnRaw] = await Promise.all([
    fs.readFile(tasksPath, "utf8"),
    fs.readFile(checkoutPath, "utf8"),
    fs.readFile(returnPath, "utf8"),
  ]);

  const taskDefs = JSON.parse(tasksRaw);
  const checkoutDef = JSON.parse(checkoutRaw);
  const returnDef = JSON.parse(returnRaw);

  await client.registerTaskDefs(taskDefs);
  await client.registerWorkflowDefs([checkoutDef, returnDef]);

  return {
    conductorServerUrl: config.conductorServerUrl,
    taskCount: taskDefs.length,
    workflows: [checkoutDef.name, returnDef.name],
  };
}

const isMain =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  registerAllWorkflows()
    .then((result) => {
      console.log(
        `[Chaos Commerce] Registered ${result.taskCount} task definitions and ${result.workflows.length} workflows (${result.workflows.join(", ")}) at ${result.conductorServerUrl}`
      );
    })
    .catch((err) => {
      console.error("[Chaos Commerce] Workflow registration failed:", err.message);
      process.exit(1);
    });
}
