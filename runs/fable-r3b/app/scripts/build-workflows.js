// Writes the workflow definitions as plain JSON to workflows/definitions/, for
// reading, diffing, or registering by hand (`conductor workflow create <file>`).
// Usage: npm run build:workflows
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { workflowDefinitions } from '../workflows/index.js';

const outputDir = fileURLToPath(new URL('../workflows/definitions/', import.meta.url));
mkdirSync(outputDir, { recursive: true });
for (const definition of workflowDefinitions) {
  const file = `${outputDir}${definition.name}.json`;
  writeFileSync(file, `${JSON.stringify(definition, null, 2)}\n`);
  console.log(`Wrote ${file}`);
}
