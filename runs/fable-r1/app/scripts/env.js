// Loads KEY=value pairs from .env into process.env without overriding variables
// that are already set, so the shell always wins over the file.
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

export const ROOT = fileURLToPath(new URL("..", import.meta.url));

export const loadEnvFile = (path = `${ROOT}.env`) => {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const match = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/.exec(line);
    if (!match || line.trimStart().startsWith("#")) continue;
    const [, name, raw] = match;
    if (process.env[name] === undefined) process.env[name] = raw.replace(/^(["'])(.*)\1$/, "$2");
  }
};
