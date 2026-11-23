import { getConfig } from "./config.mjs";

let cachedToken = null;
let cachedTokenExpiry = 0;

async function buildAuthHeaders(config) {
  const headers = { "Content-Type": "application/json" };

  if (config.conductorAuthToken) {
    headers["X-Authorization"] = config.conductorAuthToken;
    return headers;
  }

  if (config.conductorAuthKey && config.conductorAuthSecret) {
    const now = Date.now();
    if (cachedToken && now < cachedTokenExpiry) {
      headers["X-Authorization"] = cachedToken;
      return headers;
    }
    const res = await fetch(`${config.conductorApiUrl}/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        keyId: config.conductorAuthKey,
        keySecret: config.conductorAuthSecret,
      }),
    });
    if (!res.ok) {
      throw new Error(`Conductor auth token exchange failed (${res.status})`);
    }
    const data = await res.json();
    cachedToken = data?.token || null;
    cachedTokenExpiry = now + 45 * 60 * 1000;
    if (cachedToken) {
      headers["X-Authorization"] = cachedToken;
    }
  }

  return headers;
}

export function summarizeExecution(wf, conductorUiUrl) {
  const tasks = Array.isArray(wf?.tasks)
    ? wf.tasks.map((t) => ({
        taskId: t.taskId,
        taskType: t.taskType,
        referenceTaskName: t.referenceTaskName,
        status: t.status,
        iteration: t.iteration || 0,
        startTime: t.startTime,
        endTime: t.endTime,
        durationMs:
          t.startTime && t.endTime && t.endTime >= t.startTime
            ? t.endTime - t.startTime
            : null,
        outputData: t.outputData || {},
      }))
    : [];

  return {
    workflowId: wf.workflowId,
    workflowName: wf.workflowName,
    workflowVersion: wf.workflowVersion,
    status: wf.status,
    reasonForIncompletion: wf.reasonForIncompletion || null,
    startTime: wf.startTime,
    endTime: wf.endTime,
    durationMs:
      wf.startTime && wf.endTime && wf.endTime >= wf.startTime
        ? wf.endTime - wf.startTime
        : null,
    correlationId: wf.correlationId || null,
    input: wf.input || {},
    output: wf.output || {},
    tasks,
    conductorUiUrl: `${conductorUiUrl}/execution/${wf.workflowId}`,
  };
}

export async function checkConductorHealth() {
  const config = getConfig();
  try {
    const headers = await buildAuthHeaders(config);
    const res = await fetch(`${config.conductorApiUrl}/metadata/workflow`, { headers });
    if (!res.ok) {
      return {
        reachable: false,
        conductorApiUrl: config.conductorApiUrl,
        conductorUiUrl: config.conductorUiUrl,
        error: `HTTP ${res.status}`,
      };
    }
    const defs = await res.json();
    const names = Array.isArray(defs) ? defs.map((d) => d.name) : [];
    return {
      reachable: true,
      conductorApiUrl: config.conductorApiUrl,
      conductorUiUrl: config.conductorUiUrl,
      registeredWorkflows: {
        chaos_checkout: names.includes("chaos_checkout"),
        chaos_return: names.includes("chaos_return"),
      },
    };
  } catch (err) {
    return {
      reachable: false,
      conductorApiUrl: config.conductorApiUrl,
      conductorUiUrl: config.conductorUiUrl,
      error: err?.message || "Connection failed",
    };
  }
}

export async function startWorkflow(workflowName, input, { version = 1, correlationId } = {}) {
  const config = getConfig();
  const headers = await buildAuthHeaders(config);
  const url = new URL(`${config.conductorApiUrl}/workflow/${encodeURIComponent(workflowName)}`);
  url.searchParams.set("version", String(version));
  if (correlationId) {
    url.searchParams.set("correlationId", String(correlationId));
  }

  const res = await fetch(url.toString(), {
    method: "POST",
    headers,
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to start Conductor workflow "${workflowName}" (${res.status}): ${text}`);
  }

  const workflowId = (await res.text()).trim().replace(/^"|"$/g, "");
  return workflowId;
}

export async function getWorkflowExecution(workflowId) {
  const config = getConfig();
  const headers = await buildAuthHeaders(config);
  const res = await fetch(
    `${config.conductorApiUrl}/workflow/${encodeURIComponent(workflowId)}?includeTasks=true`,
    { headers },
  );
  if (res.status === 404) {
    return null;
  }
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to fetch workflow ${workflowId} (${res.status}): ${text}`);
  }
  const wf = await res.json();
  return summarizeExecution(wf, config.conductorUiUrl);
}

export async function executeWorkflowAndWait(workflowName, input, options = {}) {
  const config = getConfig();
  const timeoutMs = options.timeoutMs || config.workflowWaitTimeoutMs;
  const workflowId = await startWorkflow(workflowName, input, options);

  const deadline = Date.now() + timeoutMs;
  const terminal = new Set(["COMPLETED", "FAILED", "TIMED_OUT", "TERMINATED"]);

  let latest = null;
  while (Date.now() < deadline) {
    latest = await getWorkflowExecution(workflowId);
    if (latest && terminal.has(latest.status)) {
      return latest;
    }
    await new Promise((r) => setTimeout(r, 150));
  }

  return (
    latest || {
      workflowId,
      workflowName,
      status: "RUNNING",
      output: {},
      tasks: [],
      conductorUiUrl: `${config.conductorUiUrl}/execution/${workflowId}`,
    }
  );
}

export async function searchWorkflowExecutions(workflowName, size = 20) {
  const config = getConfig();
  const headers = await buildAuthHeaders(config);
  const query = `workflowType='${workflowName}'`;
  const url = `${config.conductorApiUrl}/workflow/search?start=0&size=${size}&sort=startTime:DESC&query=${encodeURIComponent(query)}`;

  const res = await fetch(url, { headers });
  if (!res.ok) {
    return [];
  }
  const data = await res.json();
  const results = Array.isArray(data?.results) ? data.results : [];

  // Hydrate full details for up to 12 most recent executions
  const detailed = await Promise.all(
    results.slice(0, 12).map(async (item) => {
      try {
        const full = await getWorkflowExecution(item.workflowId);
        return full || {
          workflowId: item.workflowId,
          workflowName: item.workflowType,
          status: item.status,
          startTime: item.startTime,
          endTime: item.endTime,
          output: {},
          tasks: [],
          conductorUiUrl: `${config.conductorUiUrl}/execution/${item.workflowId}`,
        };
      } catch {
        return null;
      }
    }),
  );

  return detailed.filter(Boolean);
}
