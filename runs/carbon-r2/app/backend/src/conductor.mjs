import fs from "node:fs";
import path from "node:path";
import { getConfig } from "./config.mjs";

let cachedToken = null;
let cachedTokenExpiresAt = 0;
let workflowsEnsured = false;

async function buildHeaders(config) {
  const headers = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };

  if (config.conductorAuthToken) {
    headers["X-Authorization"] = config.conductorAuthToken;
    return headers;
  }

  if (config.conductorAuthKey && config.conductorAuthSecret) {
    const now = Date.now();
    if (cachedToken && now < cachedTokenExpiresAt) {
      headers["X-Authorization"] = cachedToken;
      return headers;
    }
    const tokenResp = await fetch(`${config.conductorApiUrl}/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        keyId: config.conductorAuthKey,
        keySecret: config.conductorAuthSecret,
      }),
    });
    if (tokenResp.ok) {
      const tokenData = await tokenResp.json();
      if (tokenData && tokenData.token) {
        cachedToken = tokenData.token;
        cachedTokenExpiresAt = now + 30 * 60 * 1000;
        headers["X-Authorization"] = cachedToken;
      }
    }
  }

  return headers;
}

export function loadWorkflowDefinitionsFromDisk(workflowsDir) {
  const files = [
    "chaos_checkout_workflow.json",
    "chaos_return_workflow.json",
  ];
  const defs = [];
  for (const filename of files) {
    const fullPath = path.join(workflowsDir, filename);
    if (fs.existsSync(fullPath)) {
      defs.push(JSON.parse(fs.readFileSync(fullPath, "utf8")));
    }
  }
  return defs;
}

export async function registerWorkflows(customDefs) {
  const config = getConfig();
  const defs =
    customDefs || loadWorkflowDefinitionsFromDisk(config.workflowsDir);
  if (!defs.length) {
    throw new Error(`No workflow JSON definitions found in ${config.workflowsDir}`);
  }

  const headers = await buildHeaders(config);
  const resp = await fetch(`${config.conductorApiUrl}/metadata/workflow`, {
    method: "PUT",
    headers,
    body: JSON.stringify(defs),
  });

  if (!resp.ok) {
    // Fallback to per-workflow POST if PUT bulk update is rejected on a custom cluster
    for (const def of defs) {
      const createResp = await fetch(
        `${config.conductorApiUrl}/metadata/workflow`,
        {
          method: "POST",
          headers,
          body: JSON.stringify(def),
        }
      );
      if (!createResp.ok && createResp.status !== 409) {
        const text = await createResp.text();
        throw new Error(
          `Failed to register workflow ${def.name}: HTTP ${createResp.status} ${text}`
        );
      }
    }
  }

  workflowsEnsured = true;
  return defs.map((d) => ({ name: d.name, version: d.version || 1 }));
}

export async function ensureWorkflowsRegistered() {
  if (workflowsEnsured) return;
  try {
    await registerWorkflows();
  } catch {
    // Will surface cleanly if execution itself fails
  }
}

function summarizeTasks(tasks = []) {
  return tasks.map((t) => {
    const start = Number(t.startTime || 0);
    const end = Number(t.endTime || start);
    return {
      taskId: t.taskId || "",
      taskType: t.taskType || t.workflowTask?.type || "TASK",
      name: t.taskDefName || t.referenceTaskName || "task",
      referenceTaskName: t.referenceTaskName || "",
      status: t.status || "UNKNOWN",
      iteration: t.iteration || 0,
      durationMs: start > 0 && end >= start ? end - start : 0,
      outputData: t.outputData || {},
    };
  });
}

export async function getConductorHealth() {
  const config = getConfig();
  try {
    const headers = await buildHeaders(config);
    const [versionResp, defsResp] = await Promise.all([
      fetch(`${config.conductorApiUrl}/version`, { headers }),
      fetch(`${config.conductorApiUrl}/metadata/workflow`, { headers }),
    ]);
    const version = versionResp.ok ? (await versionResp.text()).trim() : "unknown";
    let registeredWorkflows = [];
    if (defsResp.ok) {
      const list = await defsResp.json();
      if (Array.isArray(list)) {
        registeredWorkflows = list
          .map((w) => ({ name: w.name, version: w.version }))
          .filter(
            (w) =>
              w.name === config.checkoutWorkflowName ||
              w.name === config.returnWorkflowName
          );
      }
    }
    return {
      reachable: versionResp.ok || defsResp.ok,
      conductorApiUrl: config.conductorApiUrl,
      conductorUiUrl: config.conductorUiUrl,
      version,
      registeredWorkflows,
    };
  } catch (err) {
    return {
      reachable: false,
      conductorApiUrl: config.conductorApiUrl,
      conductorUiUrl: config.conductorUiUrl,
      error: err.message,
      registeredWorkflows: [],
    };
  }
}

export async function executeWorkflow(workflowName, inputPayload, correlationId) {
  const config = getConfig();
  await ensureWorkflowsRegistered();
  const headers = await buildHeaders(config);
  const version = config.workflowVersion;

  const execUrl = `${config.conductorApiUrl}/workflow/execute/${encodeURIComponent(
    workflowName
  )}/${version}`;

  const body = {
    name: workflowName,
    version,
    correlationId: correlationId || `chaos-${Date.now()}`,
    input: inputPayload || {},
  };

  let resp = await fetch(execUrl, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  // If workflow wasn't registered yet (e.g. cold Lambda against fresh Conductor), register & retry once
  if (resp.status === 404 || resp.status === 400) {
    workflowsEnsured = false;
    await ensureWorkflowsRegistered();
    resp = await fetch(execUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
  }

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(
      `Conductor workflow execution failed (${resp.status}): ${errText}`
    );
  }

  let run = await resp.json();
  let workflowId = run.workflowId || run.targetWorkflowId;

  // Poll if execution hasn't reached a terminal state within the sync call window
  const terminalStates = new Set([
    "COMPLETED",
    "FAILED",
    "TIMED_OUT",
    "TERMINATED",
  ]);
  const deadline = Date.now() + 25000;
  while (workflowId && !terminalStates.has(run.status) && Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 150));
    const pollResp = await fetch(
      `${config.conductorApiUrl}/workflow/${encodeURIComponent(
        workflowId
      )}?includeTasks=true`,
      { headers }
    );
    if (pollResp.ok) {
      run = await pollResp.json();
      workflowId = run.workflowId || workflowId;
    }
  }

  return {
    workflowId,
    workflowName,
    version,
    status: run.status,
    conductorExecutionUrl: `${config.conductorUiUrl}/execution/${workflowId}`,
    output: run.output || {},
    taskTimeline: summarizeTasks(run.tasks || []),
    startTime: run.startTime || run.createTime || Date.now(),
    endTime: run.endTime || Date.now(),
  };
}

export async function listRecentConductorExecutions(limit = 15) {
  const config = getConfig();
  try {
    const headers = await buildHeaders(config);
    const query = encodeURIComponent(
      `workflowType IN (${config.checkoutWorkflowName},${config.returnWorkflowName})`
    );
    const resp = await fetch(
      `${config.conductorApiUrl}/workflow/search?size=${Number(
        limit
      )}&sort=startTime:DESC&query=${query}`,
      { headers }
    );
    if (!resp.ok) return [];
    const data = await resp.json();
    const results = Array.isArray(data?.results) ? data.results : [];
    return results.map((item) => ({
      workflowId: item.workflowId,
      workflowType: item.workflowType,
      status: item.status,
      startTime: item.startTime,
      endTime: item.endTime,
      executionTime: item.executionTime,
      correlationId: item.correlationId,
      conductorExecutionUrl: `${config.conductorUiUrl}/execution/${item.workflowId}`,
    }));
  } catch {
    return [];
  }
}
