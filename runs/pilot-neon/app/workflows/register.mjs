import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function normalizeApiBase(rawUrl) {
  const base = (rawUrl || "http://localhost:8080/api").trim().replace(/\/+$/, "");
  return base.endsWith("/api") ? base : `${base}/api`;
}

async function getAuthHeaders(apiBase) {
  const headers = { "Content-Type": "application/json" };
  const token = process.env.CONDUCTOR_AUTH_TOKEN;
  if (token) {
    headers["X-Authorization"] = token;
    return headers;
  }
  const keyId = process.env.CONDUCTOR_AUTH_KEY;
  const keySecret = process.env.CONDUCTOR_AUTH_SECRET;
  if (keyId && keySecret) {
    const res = await fetch(`${apiBase}/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keyId, keySecret }),
    });
    if (!res.ok) {
      throw new Error(`Conductor token exchange failed (${res.status}): ${await res.text()}`);
    }
    const data = await res.json();
    if (data?.token) {
      headers["X-Authorization"] = data.token;
    }
  }
  return headers;
}

function collectSimpleTasks(tasks, acc = new Set()) {
  if (!Array.isArray(tasks)) return acc;
  for (const t of tasks) {
    if (!t || typeof t !== "object") continue;
    if (t.type === "SIMPLE" && t.name) acc.add(t.name);
    if (Array.isArray(t.forkTasks)) {
      for (const branch of t.forkTasks) collectSimpleTasks(branch, acc);
    }
    if (Array.isArray(t.loopOver)) collectSimpleTasks(t.loopOver, acc);
    if (t.decisionCases && typeof t.decisionCases === "object") {
      for (const branch of Object.values(t.decisionCases)) collectSimpleTasks(branch, acc);
    }
    if (Array.isArray(t.defaultCase)) collectSimpleTasks(t.defaultCase, acc);
  }
  return acc;
}

export async function registerChaosWorkflows({
  serverUrl = process.env.CONDUCTOR_SERVER_URL || "http://localhost:8080/api",
  quiet = false,
} = {}) {
  const apiBase = normalizeApiBase(serverUrl);
  const headers = await getAuthHeaders(apiBase);

  const taskDefs = JSON.parse(
    await readFile(path.join(__dirname, "task-defs.json"), "utf8"),
  );
  const checkoutDef = JSON.parse(
    await readFile(path.join(__dirname, "chaos-checkout.json"), "utf8"),
  );
  const returnDef = JSON.parse(
    await readFile(path.join(__dirname, "chaos-return.json"), "utf8"),
  );

  // 1. Register all SIMPLE task definitions idempotently
  const taskRes = await fetch(`${apiBase}/metadata/taskdefs`, {
    method: "POST",
    headers,
    body: JSON.stringify(taskDefs),
  });
  if (!taskRes.ok) {
    throw new Error(
      `Failed to register task definitions (${taskRes.status}): ${await taskRes.text()}`,
    );
  }

  // 2. Register workflows idempotently via PUT /metadata/workflow
  const wfRes = await fetch(`${apiBase}/metadata/workflow`, {
    method: "PUT",
    headers,
    body: JSON.stringify([checkoutDef, returnDef]),
  });
  if (!wfRes.ok) {
    throw new Error(
      `Failed to register workflows (${wfRes.status}): ${await wfRes.text()}`,
    );
  }

  // 3. Worker gate check: verify every SIMPLE task in both workflows is registered on Conductor
  const listRes = await fetch(`${apiBase}/metadata/taskdefs`, { headers });
  if (!listRes.ok) {
    throw new Error(`Failed to verify task definitions (${listRes.status})`);
  }
  const registeredTasks = await listRes.json();
  const registeredNames = new Set(registeredTasks.map((t) => t.name));

  const requiredSimpleTasks = new Set([
    ...collectSimpleTasks(checkoutDef.tasks),
    ...collectSimpleTasks(returnDef.tasks),
  ]);
  const missing = [...requiredSimpleTasks].filter((name) => !registeredNames.has(name));
  if (missing.length > 0) {
    throw new Error(`Worker gate failed — missing task definitions: ${missing.join(", ")}`);
  }

  if (!quiet) {
    console.log(
      `[conductor] Registered ${taskDefs.length} task definitions and 2 workflows (chaos_checkout v${checkoutDef.version}, chaos_return v${returnDef.version}) at ${apiBase}`,
    );
  }

  return {
    apiBase,
    taskCount: taskDefs.length,
    workflows: [checkoutDef.name, returnDef.name],
    verifiedSimpleTasks: [...requiredSimpleTasks],
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  registerChaosWorkflows().catch((err) => {
    console.error("[conductor] Registration failed:", err.message);
    process.exit(1);
  });
}
