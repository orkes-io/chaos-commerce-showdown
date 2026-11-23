import { config } from "./config.js";

let cachedToken = null;
let tokenExpiresAt = 0;

async function getAuthHeaders() {
  if (!config.conductorAuthKey || !config.conductorAuthSecret) {
    return {};
  }
  const now = Date.now();
  if (cachedToken && now < tokenExpiresAt) {
    return { "X-Authorization": cachedToken };
  }

  const res = await fetch(`${config.conductorServerUrl}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      keyId: config.conductorAuthKey,
      keySecret: config.conductorAuthSecret,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Conductor token exchange failed (${res.status}): ${text}`);
  }
  const data = await res.json();
  cachedToken = data.token;
  tokenExpiresAt = now + 45 * 60 * 1000;
  return { "X-Authorization": cachedToken };
}

async function conductorFetch(apiPath, options = {}) {
  const authHeaders = await getAuthHeaders();
  const url = `${config.conductorServerUrl}${apiPath}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...authHeaders,
      ...(options.headers || {}),
    },
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(
      `Conductor API ${options.method || "GET"} ${apiPath} failed (${res.status}): ${text}`
    );
  }
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export async function checkConductorHealth() {
  try {
    const workflows = await conductorFetch("/metadata/workflow");
    const names = Array.isArray(workflows) ? workflows.map((w) => w.name) : [];
    return {
      reachable: true,
      serverUrl: config.conductorServerUrl,
      uiUrl: config.conductorUiUrl,
      registeredWorkflowCount: names.length,
      hasCheckoutWorkflow: names.includes("chaos_checkout"),
      hasReturnWorkflow: names.includes("chaos_return_bureaucracy"),
    };
  } catch (err) {
    return {
      reachable: false,
      serverUrl: config.conductorServerUrl,
      uiUrl: config.conductorUiUrl,
      error: err.message,
    };
  }
}

export async function registerTaskDefinitions(taskDefs) {
  return conductorFetch("/metadata/taskdefs", {
    method: "POST",
    body: JSON.stringify(taskDefs),
  });
}

export async function registerWorkflowDefinitions(workflowDefs) {
  return conductorFetch("/metadata/workflow", {
    method: "PUT",
    body: JSON.stringify(workflowDefs),
  });
}

export async function startWorkflow(workflowName, input, { version = 1, correlationId } = {}) {
  const qs = new URLSearchParams();
  if (version) qs.set("version", String(version));
  if (correlationId) qs.set("correlationId", String(correlationId));
  const suffix = qs.toString() ? `?${qs.toString()}` : "";

  const workflowId = await conductorFetch(`/workflow/${encodeURIComponent(workflowName)}${suffix}`, {
    method: "POST",
    body: JSON.stringify(input),
  });
  return String(workflowId).replace(/^"|"$/g, "").trim();
}

export async function getWorkflowExecution(workflowId) {
  return conductorFetch(
    `/workflow/${encodeURIComponent(workflowId)}?includeTasks=true`
  );
}

const TERMINAL_STATUSES = new Set(["COMPLETED", "FAILED", "TIMED_OUT", "TERMINATED"]);

export async function executeWorkflowAndWait(
  workflowName,
  input,
  { version = 1, correlationId, timeoutMs = config.workflowTimeoutMs } = {}
) {
  const workflowId = await startWorkflow(workflowName, input, {
    version,
    correlationId,
  });

  const deadline = Date.now() + timeoutMs;
  let execution = null;

  while (Date.now() < deadline) {
    execution = await getWorkflowExecution(workflowId);
    if (execution && TERMINAL_STATUSES.has(execution.status)) {
      return execution;
    }
    await new Promise((resolve) => setTimeout(resolve, 150));
  }

  throw new Error(
    `Timed out waiting for Conductor workflow ${workflowName} (${workflowId}) after ${timeoutMs}ms. Last status: ${execution?.status || "UNKNOWN"}`
  );
}

export function formatWorkflowTrace(execution) {
  if (!execution) return null;
  const tasks = Array.isArray(execution.tasks)
    ? execution.tasks.map((t) => ({
        taskId: t.taskId,
        taskType: t.taskType,
        taskDefName: t.taskDefName,
        referenceTaskName: t.referenceTaskName,
        status: t.status,
        iteration: t.iteration || 0,
        startTime: t.startTime,
        endTime: t.endTime,
        durationMs:
          t.startTime && t.endTime && t.endTime >= t.startTime
            ? t.endTime - t.startTime
            : 0,
        outputData: t.outputData || {},
      }))
    : [];

  return {
    workflowId: execution.workflowId,
    workflowName: execution.workflowName || execution.workflowType,
    workflowVersion: execution.workflowVersion,
    status: execution.status,
    correlationId: execution.correlationId,
    startTime: execution.startTime,
    endTime: execution.endTime,
    durationMs:
      execution.startTime && execution.endTime && execution.endTime >= execution.startTime
        ? execution.endTime - execution.startTime
        : 0,
    conductorUiUrl: `${config.conductorUiUrl}/execution/${execution.workflowId}`,
    taskCount: tasks.length,
    tasks,
  };
}
