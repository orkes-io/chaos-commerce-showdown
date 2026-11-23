import fs from "node:fs";
import path from "node:path";
import { orkesConductorClient, TaskManager } from "@io-orkes/conductor-javascript";
import { config } from "./config.js";
import { CHAOS_WORKER_HANDLERS, createSdkWorkers } from "./workers.js";

let cachedToken: { token: string; expiresAt: number } | null = null;
let activeTaskManager: TaskManager | null = null;

async function getAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json"
  };

  if (process.env.CONDUCTOR_AUTH_TOKEN) {
    headers["X-Authorization"] = process.env.CONDUCTOR_AUTH_TOKEN;
    return headers;
  }

  if (config.conductorAuthKey && config.conductorAuthSecret) {
    const now = Date.now();
    if (cachedToken && cachedToken.expiresAt > now + 30_000) {
      headers["X-Authorization"] = cachedToken.token;
      return headers;
    }
    const resp = await fetch(`${config.conductorServerUrl}/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        keyId: config.conductorAuthKey,
        keySecret: config.conductorAuthSecret
      })
    });
    if (resp.ok) {
      const data = (await resp.json()) as { token?: string };
      if (data.token) {
        cachedToken = { token: data.token, expiresAt: now + 30 * 60 * 1000 };
        headers["X-Authorization"] = data.token;
      }
    }
  }

  return headers;
}

export async function conductorFetch(
  endpointPath: string,
  init: RequestInit = {}
): Promise<Response> {
  const baseHeaders = await getAuthHeaders();
  const mergedHeaders = {
    ...baseHeaders,
    ...((init.headers as Record<string, string>) || {})
  };
  const url = `${config.conductorServerUrl}${
    endpointPath.startsWith("/") ? endpointPath : `/${endpointPath}`
  }`;
  return fetch(url, { ...init, headers: mergedHeaders });
}

export async function checkConductorHealth(): Promise<{
  reachable: boolean;
  serverUrl: string;
  uiUrl: string;
  registeredWorkflows: string[];
  registeredTasks: string[];
  workerDaemonRunning: boolean;
  workerMode: string;
}> {
  try {
    const [wfResp, taskResp] = await Promise.all([
      conductorFetch("/metadata/workflow"),
      conductorFetch("/metadata/taskdefs")
    ]);
    if (!wfResp.ok) {
      return {
        reachable: false,
        serverUrl: config.conductorServerUrl,
        uiUrl: config.conductorUiUrl,
        registeredWorkflows: [],
        registeredTasks: [],
        workerDaemonRunning: Boolean(activeTaskManager),
        workerMode: config.workerMode
      };
    }
    const workflows = (await wfResp.json()) as Array<{ name: string }>;
    const tasks = taskResp.ok ? ((await taskResp.json()) as Array<{ name: string }>) : [];
    return {
      reachable: true,
      serverUrl: config.conductorServerUrl,
      uiUrl: config.conductorUiUrl,
      registeredWorkflows: workflows.map((w) => w.name),
      registeredTasks: tasks.map((t) => t.name),
      workerDaemonRunning: Boolean(activeTaskManager),
      workerMode: config.workerMode
    };
  } catch {
    return {
      reachable: false,
      serverUrl: config.conductorServerUrl,
      uiUrl: config.conductorUiUrl,
      registeredWorkflows: [],
      registeredTasks: [],
      workerDaemonRunning: Boolean(activeTaskManager),
      workerMode: config.workerMode
    };
  }
}

export async function registerChaosDefinitions(workflowsDir = config.workflowsDir): Promise<{
  tasksRegistered: string[];
  workflowsRegistered: string[];
}> {
  const tasksPath = path.join(workflowsDir, "tasks", "chaos_tasks.json");
  const checkoutPath = path.join(workflowsDir, "chaos_checkout_workflow.json");
  const returnPath = path.join(workflowsDir, "chaos_return_workflow.json");

  const taskDefs = JSON.parse(fs.readFileSync(tasksPath, "utf8")) as Array<{ name: string }>;
  const checkoutWf = JSON.parse(fs.readFileSync(checkoutPath, "utf8")) as { name: string };
  const returnWf = JSON.parse(fs.readFileSync(returnPath, "utf8")) as { name: string };

  // Register task definitions (POST creates/upserts array in Conductor)
  const taskResp = await conductorFetch("/metadata/taskdefs", {
    method: "POST",
    body: JSON.stringify(taskDefs)
  });
  if (!taskResp.ok && taskResp.status !== 409) {
    // Fallback to per-task PUT if server rejects already-existing POST batch
    for (const td of taskDefs) {
      await conductorFetch("/metadata/taskdefs", {
        method: "PUT",
        body: JSON.stringify(td)
      });
    }
  }

  // PUT /metadata/workflow idempotently registers or updates array of workflow definitions
  const wfPutResp = await conductorFetch("/metadata/workflow", {
    method: "PUT",
    body: JSON.stringify([checkoutWf, returnWf])
  });
  if (!wfPutResp.ok) {
    for (const wf of [checkoutWf, returnWf]) {
      const postResp = await conductorFetch("/metadata/workflow?overwrite=true", {
        method: "POST",
        body: JSON.stringify(wf)
      });
      if (!postResp.ok) {
        const errText = await postResp.text();
        throw new Error(`Failed to register workflow ${wf.name}: ${postResp.status} ${errText}`);
      }
    }
  }

  return {
    tasksRegistered: taskDefs.map((t) => t.name),
    workflowsRegistered: [checkoutWf.name, returnWf.name]
  };
}

export async function startWorkerDaemon(): Promise<void> {
  if (activeTaskManager) return;

  const clientConfig: Record<string, string | undefined> = {
    serverUrl: config.conductorServerUrl
  };
  if (config.conductorAuthKey && config.conductorAuthSecret) {
    clientConfig.keyId = config.conductorAuthKey;
    clientConfig.keySecret = config.conductorAuthSecret;
  }

  const client = await orkesConductorClient(clientConfig);
  const workers = createSdkWorkers();
  activeTaskManager = new TaskManager(client, workers, {
    options: { concurrency: 5, pollInterval: 100 }
  });
  activeTaskManager.startPolling();
}

export async function stopWorkerDaemon(): Promise<void> {
  if (!activeTaskManager) return;
  await activeTaskManager.stopPolling();
  activeTaskManager = null;
}

/**
 * Serverless worker drain helper for AWS Lambda deployments where no persistent daemon process exists.
 * Polls each Chaos Commerce SIMPLE task queue once and completes any scheduled task immediately.
 */
export async function drainWorkerQueuesOnce(workerId = "chaos-lambda-worker"): Promise<number> {
  let processed = 0;
  for (const [taskType, handler] of Object.entries(CHAOS_WORKER_HANDLERS)) {
    const pollResp = await conductorFetch(
      `/tasks/poll/${encodeURIComponent(taskType)}?workerid=${encodeURIComponent(workerId)}`
    );
    if (pollResp.status === 204 || !pollResp.ok) {
      continue;
    }
    const text = await pollResp.text();
    if (!text || !text.trim()) continue;
    const task = JSON.parse(text) as {
      taskId?: string;
      workflowInstanceId?: string;
      inputData?: Record<string, unknown>;
    };
    if (!task.taskId || !task.workflowInstanceId) continue;

    const outputData = await handler(task.inputData || {}, task.taskId);
    const updateResp = await conductorFetch("/tasks", {
      method: "POST",
      body: JSON.stringify({
        taskId: task.taskId,
        workflowInstanceId: task.workflowInstanceId,
        workerId,
        status: "COMPLETED",
        outputData
      })
    });
    if (updateResp.ok) {
      processed += 1;
    }
  }
  return processed;
}

export interface TaskTraceSummary {
  taskId: string;
  taskType: string;
  referenceTaskName: string;
  taskDefName: string;
  status: string;
  iteration: number;
  startTime: number;
  endTime: number;
  durationMs: number;
  outputPreview: Record<string, unknown>;
}

export interface WorkflowExecutionTrace {
  workflowId: string;
  workflowName: string;
  status: string;
  correlationId?: string;
  startTime: number;
  endTime: number;
  durationMs: number;
  conductorExecutionUrl: string;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  tasks: TaskTraceSummary[];
}

function formatExecutionTrace(raw: any): WorkflowExecutionTrace {
  const startTime = Number(raw.startTime || Date.now());
  const endTime = Number(raw.endTime || Date.now());
  const tasks: TaskTraceSummary[] = Array.isArray(raw.tasks)
    ? raw.tasks.map((t: any) => {
        const tStart = Number(t.startTime || startTime);
        const tEnd = Number(t.endTime || tStart);
        return {
          taskId: String(t.taskId || ""),
          taskType: String(t.taskType || ""),
          referenceTaskName: String(t.referenceTaskName || ""),
          taskDefName: String(t.taskDefName || t.taskType || ""),
          status: String(t.status || ""),
          iteration: Number(t.iteration || 0),
          startTime: tStart,
          endTime: tEnd,
          durationMs: Math.max(0, tEnd - tStart),
          outputPreview: (t.outputData as Record<string, unknown>) || {}
        };
      })
    : [];

  return {
    workflowId: String(raw.workflowId || ""),
    workflowName: String(raw.workflowName || raw.workflowType || ""),
    status: String(raw.status || "UNKNOWN"),
    correlationId: raw.correlationId ? String(raw.correlationId) : undefined,
    startTime,
    endTime,
    durationMs: Math.max(0, endTime - startTime),
    conductorExecutionUrl: `${config.conductorUiUrl}/execution/${raw.workflowId}`,
    input: (raw.input as Record<string, unknown>) || {},
    output: (raw.output as Record<string, unknown>) || {},
    tasks
  };
}

export async function getWorkflowExecutionTrace(
  workflowId: string
): Promise<WorkflowExecutionTrace | null> {
  const resp = await conductorFetch(`/workflow/${encodeURIComponent(workflowId)}?includeTasks=true`);
  if (!resp.ok) return null;
  const raw = await resp.json();
  return formatExecutionTrace(raw);
}

export async function runWorkflowToCompletion(
  workflowName: string,
  input: Record<string, unknown>,
  correlationId?: string,
  timeoutMs = 30_000
): Promise<WorkflowExecutionTrace> {
  const startResp = await conductorFetch("/workflow", {
    method: "POST",
    headers: { Accept: "text/plain, application/json" },
    body: JSON.stringify({
      name: workflowName,
      version: 1,
      correlationId,
      input
    })
  });

  if (!startResp.ok) {
    const errBody = await startResp.text();
    throw new Error(`Conductor failed to start ${workflowName}: ${startResp.status} ${errBody}`);
  }

  const rawId = (await startResp.text()).trim().replace(/^"|"$/g, "");
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (config.workerMode === "inline") {
      await drainWorkerQueuesOnce();
    }

    const trace = await getWorkflowExecutionTrace(rawId);
    if (
      trace &&
      ["COMPLETED", "FAILED", "TIMED_OUT", "TERMINATED"].includes(trace.status)
    ) {
      return trace;
    }

    await new Promise((resolve) => setTimeout(resolve, 120));
  }

  throw new Error(`Timed out waiting for Conductor workflow ${workflowName} (${rawId})`);
}

export async function listCompletedWorkflowTraces(
  workflowName: string,
  limit = 15
): Promise<WorkflowExecutionTrace[]> {
  const query = encodeURIComponent(`workflowType IN ('${workflowName}')`);
  const searchResp = await conductorFetch(
    `/workflow/search?size=${limit}&sort=startTime:DESC&query=${query}`
  );
  if (!searchResp.ok) return [];
  const data = (await searchResp.json()) as { results?: Array<{ workflowId: string }> };
  const ids = (data.results || []).map((r) => r.workflowId).filter(Boolean).slice(0, limit);

  const traces = await Promise.all(ids.map((id) => getWorkflowExecutionTrace(id)));
  return traces.filter((t): t is WorkflowExecutionTrace => Boolean(t));
}
