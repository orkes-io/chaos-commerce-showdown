// Generates backend/workflows/*.json from the definitions in this directory.
// Run with `npm run build:workflows` after editing a definition.
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { checkout, checkoutRescue } from "./checkout.js";
import { returns, returnsRescue } from "./returns.js";

// Rescue workflows come first: the main workflows name them as failureWorkflow.
export const definitions = [checkoutRescue, returnsRescue, checkout, returns];

export const render = (definition) => JSON.stringify(definition, null, 2) + "\n";

export const outputPath = (definition) =>
  fileURLToPath(new URL(`../${definition.name}.json`, import.meta.url));

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  for (const definition of definitions) {
    writeFileSync(outputPath(definition), render(definition));
    console.log(`wrote ${definition.name}.json`);
  }
}
