import { readFileSync } from "node:fs";

// Rescue workflows first: the main workflows reference them as failureWorkflow.
const FILES = [
  "chaos_checkout_rescue.json",
  "chaos_returns_rescue.json",
  "chaos_checkout.json",
  "chaos_returns.json",
];

let cached = null;

export const loadDefinitions = () => {
  cached ??= FILES.map((file) => JSON.parse(readFileSync(new URL(`../workflows/${file}`, import.meta.url), "utf8")));
  return cached;
};

const definition = (name) => loadDefinitions().find((candidate) => candidate.name === name);

export const WORKFLOWS = {
  checkout: { name: "chaos_checkout", rescue: "chaos_checkout_rescue", outputKey: "order" },
  returns: { name: "chaos_returns", rescue: "chaos_returns_rescue", outputKey: "returnCase" },
};

export const versionOf = (name) => definition(name).version;

export const registerDefinitions = async (conductor) => {
  const definitions = loadDefinitions();
  await conductor.registerWorkflows(definitions);
  return definitions.map(({ name, version }) => ({ name, version }));
};
