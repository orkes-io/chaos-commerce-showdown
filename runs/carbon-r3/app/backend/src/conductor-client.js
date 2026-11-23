import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { orkesConductorClient, TaskManager } from "@io-orkes/conductor-javascript";
import { getConfig } from "./config.js";
import { WORKER_HANDLERS, createSdkWorkers } from "./workers.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let cachedJwtToken = null;
let cachedJwtFetchedAt = 0;
let activeTaskManager = null;
let backgroundWorkersStarted = false;
let definitionsRegisteredOnce = false;

function resolveWorkflowsDir() {
  const candidates = [
    path.resolve(__dirname, "../../workflows"),
    path.resolve(__dirname, "../workflows")
  ];
  for (const dir of candidates) {
    if (fs.existsSync(path.join(dir, "chaos_checkout_workflow.json"))) {
      return dir;
    }
  }
  throw new Error("Workflow definitions directory not found.");
}

export function loadLocalDefinitions() {
  const dir = resolveWorkflowsDir();
  const readJson = (file) =>
    JSON.parse(fs.readFileSync(path.join(dir, file), "utf8"));

  return {
    workflowsDir: dir,
    taskDefs: readJson("taskdefs.json"),
    workflows: [
      readJson("chaos_emergency_recovery_workflow.json"),
      readJson("chaos_checkout_workflow.json"),
      readJson("chaos_return_workflow.json")
    ]
  };
}

async function getAuthHeaders() {
  const cfg = getConfig();
  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json"
  };

  if (cfg.conductorAuthToken) {
    headers["X-Authorization"] = cfg.conductorAuthToken;
    return headers;
  }

  if (cfg.conductorAuthKey && cfg.conductorAuthSecret) {
    const now = Date.now();
    if (!cachedJwtToken || now - cachedJwtFetchedAt > 30 * 60 * 1000) {
      const res = await fetch(`${cfg.conductorServerUrl}/token`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          keyId: cfg.conductorAuthKey,
          keySecret: cfg.conductorAuthSecret
        })
      });
      if (!res.ok) {
        throw new Error(`Conductor token exchange failed (${res.status})`);
      }
      const data = await res.json();
      cachedJwtToken = data.token;
      cachedJwtFetchedAt = now;
    }
    if (cachedJwtToken) {
      headers["X-Authorization"] = cachedJwtToken;
    }
  }

  return headers;
}

export async function conductorFetch(apiPath, options = {}) {
  const cfg = getConfig();
  const headers = {
    ...(await getAuthHeaders()),
    ...(options.headers || {})
  };
  const url = `${cfg.conductorServerUrl}${apiPath.startsWith("/") ? apiPath : `/${apiPath}`}`;
  const response = await fetch(url, {
    ...options,
    headers
  });

  const rawText = await response.text();
  let parsed = rawText;
  try {
    parsed = rawText ? JSON.parse(rawText) : null;
  } catch {
    // plain text response (e.g. POST /workflow/{name} returns plain workflowId string)
  }

  if (!response.ok) {
    throw new Error(
      `Conductor API ${options.method || "GET"} ${apiPath} failed (${response.status}): ${rawText.slice(0, 300)}`
    );
  }

  return parsed;
}

function collectSimpleTaskNames(tasks = [], out = new Set()) {
  for (const t of tasks) {
    if (!t) continue;
    if (t.type === "SIMPLE" && t.name) {
      out.add(t.name);
    }
    if (Array.isArray(t.forkTasks)) {
      for (const branch of t.forkTasks) {
        collectSimpleTaskNames(branch, out);
      }
    }
    if (Array.isArray(t.loopOver)) {
      collectSimpleTaskNames(t.loopOver, out);
    }
    if (t.decisionCases && typeof t.decisionCases === "object") {
      for (const branch of Object.values(t.decisionCases)) {
        collectSimpleTaskNames(branch, out);
      }
    }
    if (Array.isArray(t.defaultCase)) {
      collectSimpleTaskNames(t.defaultCase, out);
    }
  }
  return out;
}

export async function registerAllDefinitions() {
  const { taskDefs, workflows } = loadLocalDefinitions();

  await conductorFetch("/metadata/taskdefs", {
    method: "POST",
    body: JSON.stringify(taskDefs)
  });

  await conductorFetch("/metadata/workflow", {
    method: "PUT",
    body: JSON.stringify(workflows)
  });

  // Worker gate check (Conductor Skill Rule 1): verify every SIMPLE task has a registered taskdef + worker handler
  const registeredTasks = await conductorFetch("/metadata/taskdefs");
  const registeredSet = new Set(
    (Array.isArray(registeredTasks) ? registeredTasks : []).map((t) => t.name)
  );

  const requiredSimpleTasks = new Set();
  for (const wf of workflows) {
    collectSimpleTaskNames(wf.tasks, requiredSimpleTasks);
  }

  const missingTaskDefs = [];
  const missingWorkers = [];
  for (const taskName of requiredSimpleTasks) {
    if (!registeredSet.has(taskName)) {
      missingTaskDefs.push(taskName);
    }
    if (typeof WORKER_HANDLERS[taskName] !== "function") {
      missingWorkers.push(taskName);
    }
  }

  if (missingTaskDefs.length > 0 || missingWorkers.length > 0) {
    throw new Error(
      `Worker gate failed! Missing taskdefs: [${missingTaskDefs.join(", ")}], Missing workers: [${missingWorkers.join(", ")}]`
    );
  }

  definitionsRegisteredOnce = true;
  return {
    registeredTaskDefs: [...requiredSimpleTasks],
    registeredWorkflows: workflows.map((w) => ({
      name: w.name,
      version: w.version
    }))
  };
}

export async function ensureDefinitionsRegistered() {
  if (!definitionsRegisteredOnce) {
    await registerAllDefinitions();
  }
}

export async function startBackgroundWorkers() {
  if (backgroundWorkersStarted && activeTaskManager) {
    return activeTaskManager;
  }
  const cfg = getConfig();
  const clientConfig = {
    serverUrl: cfg.conductorServerUrl
  };
  if (cfg.conductorAuthKey && cfg.conductorAuthSecret) {
    clientConfig.keyId = cfg.conductorAuthKey;
    clientConfig.keySecret = cfg.conductorAuthSecret;
  }

  const client = await orkesConductorClient(clientConfig);
  const sdkWorkers = createSdkWorkers();
  const manager = new TaskManager(client, sdkWorkers, {
    options: { concurrency: 5, pollInterval: 100 }
  });
  manager.startPolling();
  activeTaskManager = manager;
  backgroundWorkersStarted = true;
  return manager;
}

export async function stopBackgroundWorkers() {
  if (activeTaskManager) {
    try {
      await activeTaskManager.stopPolling();
    } catch {
      // ignore shutdown race
    }
    activeTaskManager = null;
    backgroundWorkersStarted = false;
  }
}

/**
 * Cooperative inline task drainer used in serverless/AWS Lambda environments
 * (or whenever no dedicated background poller has picked up a queued SIMPLE task yet).
 */
async function drainPendingSimpleTasksForExecution(execution) {
  const tasks = Array.isArray(execution?.tasks) ? execution.tasks : [];
  const scheduledSimpleTasks = tasks.filter(
    (t) =>
      t.status === "SCHEDULED" &&
      typeof WORKER_HANDLERS[t.taskType] === "function"
  );

  for (const pending of scheduledSimpleTasks) {
    try {
      const polled = await conductorFetch(
        `/tasks/poll/${encodeURIComponent(pending.taskType)}?workerid=chaos-lambda-inline-worker`
      );
      if (polled && polled.taskId && WORKER_HANDLERS[polled.taskType]) {
        const outputData = await WORKER_HANDLERS[polled.taskType](
          polled.inputData || {}
        );
        await conductorFetch("/tasks", {
          method: "POST",
          body: JSON.stringify({
            workflowInstanceId: polled.workflowInstanceId,
            taskId: polled.taskId,
            status: "COMPLETED",
            workerId: "chaos-lambda-inline-worker",
            outputData
          })
        });
      }
    } catch {
      // Another active worker may have claimed it simultaneously; safe to continue
    }
  }
}

export function formatExecutionTrace(execution) {
  const cfg = getConfig();
  const tasks = Array.isArray(execution?.tasks) ? execution.tasks : [];
  const startTime = Number(execution?.startTime || 0);
  const endTime = Number(execution?.endTime || Date.now());

  return {
    workflowId: execution.workflowId,
    workflowName: execution.workflowName || execution.workflowType,
    workflowVersion: execution.workflowVersion || 1,
    status: execution.status,
    durationMs: startTime > 0 ? Math.max(1, endTime - startTime) : 0,
    conductorUiExecutionUrl: `${cfg.conductorUiUrl}/execution/${execution.workflowId}`,
    conductorUiDefinitionUrl: `${cfg.conductorUiUrl}/workflowDef/${
      execution.workflowName || execution.workflowType
    }`,
    output: execution.output || {},
    tasks: tasks.map((t) => ({
      taskId: t.taskId,
      taskType: t.taskType,
      taskDefName: t.workflowTask?.name || t.taskDefName || t.taskType,
      referenceTaskName: t.referenceTaskName,
      status: t.status,
      iteration: t.iteration || 0,
      durationMs:
        t.startTime && t.endTime ? Math.max(0, t.endTime - t.startTime) : 0,
      outputData: t.outputData || {}
    }))
  };
}

export async function executeWorkflowGuaranteed(workflowName, inputPayload, timeoutMs = 25000) {
  await ensureDefinitionsRegistered();

  const cfg = getConfig();
  const rawWorkflowId = await conductorFetch(`/workflow/${encodeURIComponent(workflowName)}`, {
    method: "POST",
    body: JSON.stringify(inputPayload || {})
  });

  const workflowId = String(rawWorkflowId || "").replace(/^"+|"+$/g, "").trim();
  if (!workflowId) {
    throw new Error(`Conductor did not return a workflowId for ${workflowName}`);
  }

  const deadline = Date.now() + timeoutMs;
  let pollPass = 0;

  while (Date.now() < deadline) {
    pollPass += 1;
    const execution = await conductorFetch(
      `/workflow/${encodeURIComponent(workflowId)}?includeTasks=true`
    );

    if (execution.status === "COMPLETED") {
      return formatExecutionTrace(execution);
    }

    if (
      execution.status === "FAILED" ||
      execution.status === "TIMED_OUT" ||
      execution.status === "TERMINATED"
    ) {
      throw new Error(
        `Workflow ${workflowName} (${workflowId}) ended with status ${execution.status}: ${
          execution.reasonForIncompletion || "unknown reason"
        }`
      );
    }

    // In AWS Lambda (no persistent daemon) or if a task sits SCHEDULED > 1 poll pass, drain cooperatively
    if (cfg.isLambda || !backgroundWorkersStarted || pollPass >= 2) {
      await drainPendingSimpleTasksForExecution(execution);
    }

    await new Promise((resolve) => setTimeout(resolve, 80));
  }

  throw new Error(`Timed out waiting for Conductor workflow ${workflowName} (${workflowId})`);
}

export async function getConductorStatusSummary() {
  const cfg = getConfig();
  try {
    const workflows = await conductorFetch("/metadata/workflow");
    const wfNames = (Array.isArray(workflows) ? workflows : []).map((w) => w.name);
    return {
      connected: true,
      conductorServerUrl: cfg.conductorServerUrl,
      conductorUiUrl: cfg.conductorUiUrl,
      backgroundWorkersActive: backgroundWorkersStarted,
      serverlessInlineDrainEnabled: true,
      registeredWorkflows: wfNames.filter((n) => n.startsWith("chaos_"))
    };
  } catch (err) {
    return {
      connected: false,
      conductorServerUrl: cfg.conductorServerUrl,
      conductorUiUrl: cfg.conductorUiUrl,
      backgroundWorkersActive: backgroundWorkersStarted,
      error: err.message
    };
  }
}

export async function listChaosExecutions(limit = 15) {
  const cfg = getConfig();
  const query = encodeURIComponent(
    "workflowType IN (chaos_checkout_workflow,chaos_return_workflow)"
  );
  const res = await conductorFetch(
    `/workflow/search?start=0&size=${Number(limit) || 15}&sort=startTime:DESC&query=${query}`
  );
  const hits = Array.isArray(res?.results) ? res.results : [];
  return hits.map((h) => ({
    workflowId: h.workflowId,
    workflowType: h.workflowType,
    status: h.status,
    startTime: h.startTime,
    endTime: h.endTime,
    executionTime: h.executionTime,
    conductorUiExecutionUrl: `${cfg.conductorUiUrl}/execution/${h.workflowId}`
  }));
}

export async function getChaosExecutionById(workflowId) {
  const execution = await conductorFetch(
    `/workflow/${encodeURIComponent(workflowId)}?includeTasks=true`
  );
  return formatExecutionTrace(execution);
}
