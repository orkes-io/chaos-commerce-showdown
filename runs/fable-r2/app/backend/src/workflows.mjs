import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const WORKFLOW_DIR = fileURLToPath(new URL('../workflows/', import.meta.url));

// The definitions ship next to the code (also inside the Lambda bundle) so the backend can
// re-register them if it ever finds them missing on the Conductor server.
export function loadWorkflowDefinitions() {
  return readdirSync(WORKFLOW_DIR)
    .filter((file) => file.endsWith('.json'))
    .sort()
    .map((file) => JSON.parse(readFileSync(`${WORKFLOW_DIR}${file}`, 'utf8')));
}

// Idempotent upsert of every definition. Returns the registered names.
export async function registerWorkflows(conductor) {
  const definitions = loadWorkflowDefinitions();
  const result = await conductor.registerWorkflows(definitions);
  const failed = Object.entries(result?.bulkErrorResults ?? {});
  if (failed.length) {
    throw new Error(`Conductor refused workflow definitions: ${failed.map(([name, why]) => `${name}: ${why}`).join('; ')}`);
  }
  return definitions.map((definition) => `${definition.name} v${definition.version}`);
}

export async function missingWorkflows(conductor) {
  const registered = await conductor.listWorkflowVersions();
  return loadWorkflowDefinitions()
    .filter((definition) => !(registered[definition.name] ?? []).some((entry) => entry.version === definition.version))
    .map((definition) => definition.name);
}
