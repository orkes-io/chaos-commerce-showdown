import { getConfig } from '../config.mjs';

let cachedJwt = null;
let cachedJwtExpiresAt = 0;

async function getAuthHeaders(config) {
  const headers = { 'Content-Type': 'application/json' };

  if (config.conductorAuthToken) {
    headers['X-Authorization'] = config.conductorAuthToken;
    return headers;
  }

  if (config.conductorAuthKey && config.conductorAuthSecret) {
    const now = Date.now();
    if (!cachedJwt || now >= cachedJwtExpiresAt) {
      const res = await fetch(`${config.conductorApiUrl}/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keyId: config.conductorAuthKey,
          keySecret: config.conductorAuthSecret,
        }),
      });
      if (!res.ok) {
        throw new Error(`Conductor token exchange failed (${res.status})`);
      }
      const data = await res.json();
      cachedJwt = data.token;
      cachedJwtExpiresAt = now + 20 * 60 * 1000;
    }
    headers['X-Authorization'] = cachedJwt;
  }

  return headers;
}

function summarizeTasks(tasks = []) {
  return tasks.map((t) => ({
    taskId: t.taskId,
    referenceTaskName: t.referenceTaskName,
    taskDefName: t.taskDefName,
    taskType: t.taskType,
    status: t.status,
    iteration: t.iteration || 0,
    startTime: t.startTime || null,
    endTime: t.endTime || null,
    durationMs: t.startTime && t.endTime ? Math.max(0, t.endTime - t.startTime) : 0,
    outputData: t.outputData || {},
  }));
}

export async function checkConductorHealth() {
  const config = getConfig();
  try {
    const headers = await getAuthHeaders(config);
    const res = await fetch(`${config.conductorApiUrl}/metadata/workflow`, { headers });
    if (!res.ok) {
      return { reachable: false, status: res.status, apiUrl: config.conductorApiUrl, uiUrl: config.conductorUiUrl };
    }
    const defs = await res.json();
    const names = Array.isArray(defs) ? defs.map((d) => d.name) : [];
    return {
      reachable: true,
      apiUrl: config.conductorApiUrl,
      uiUrl: config.conductorUiUrl,
      workflowsRegistered: {
        checkout: names.includes('chaos_checkout_workflow'),
        returns: names.includes('chaos_return_workflow'),
      },
    };
  } catch (err) {
    return {
      reachable: false,
      error: err.message,
      apiUrl: config.conductorApiUrl,
      uiUrl: config.conductorUiUrl,
    };
  }
}

export async function startWorkflow(workflowName, input, { correlationId, version = 1 } = {}) {
  const config = getConfig();
  const headers = await getAuthHeaders(config);

  const res = await fetch(`${config.conductorApiUrl}/workflow`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      name: workflowName,
      version,
      correlationId: correlationId || undefined,
      input,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to start Conductor workflow "${workflowName}" (${res.status}): ${text}`);
  }

  const workflowId = (await res.text()).trim().replace(/^"|"$/g, '');
  return workflowId;
}

export async function getWorkflowExecution(workflowId) {
  const config = getConfig();
  const headers = await getAuthHeaders(config);

  const res = await fetch(`${config.conductorApiUrl}/workflow/${encodeURIComponent(workflowId)}?includeTasks=true`, {
    headers,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to fetch workflow "${workflowId}" (${res.status}): ${text}`);
  }

  const wf = await res.json();
  return {
    workflowId: wf.workflowId,
    workflowName: wf.workflowName,
    workflowVersion: wf.workflowVersion,
    correlationId: wf.correlationId || null,
    status: wf.status,
    createTime: wf.createTime || null,
    endTime: wf.endTime || null,
    executionTimeMs: wf.createTime && wf.endTime ? Math.max(0, wf.endTime - wf.createTime) : null,
    input: wf.input || {},
    output: wf.output || {},
    tasks: summarizeTasks(wf.tasks || []),
    conductorUiUrl: `${config.conductorUiUrl}/execution/${wf.workflowId}`,
  };
}

export async function startAndAwaitWorkflow(workflowName, input, { correlationId, version = 1, timeoutMs = 20000 } = {}) {
  const workflowId = await startWorkflow(workflowName, input, { correlationId, version });
  const deadline = Date.now() + timeoutMs;
  const terminalStatuses = new Set(['COMPLETED', 'FAILED', 'TERMINATED', 'TIMED_OUT']);

  let execution = null;
  while (Date.now() < deadline) {
    execution = await getWorkflowExecution(workflowId);
    if (terminalStatuses.has(execution.status)) {
      return execution;
    }
    await new Promise((resolve) => setTimeout(resolve, 120));
  }

  return execution;
}

export async function listWorkflowExecutions(workflowName, limit = 25) {
  const config = getConfig();
  const headers = await getAuthHeaders(config);

  const query = encodeURIComponent(`workflowType='${workflowName}'`);
  const url = `${config.conductorApiUrl}/workflow/search?start=0&size=${limit}&sort=startTime:DESC&query=${query}`;
  const res = await fetch(url, { headers });

  if (!res.ok) {
    return [];
  }

  const data = await res.json();
  const hits = Array.isArray(data.results) ? data.results : [];
  const executions = await Promise.all(
    hits.map(async (item) => {
      try {
        return await getWorkflowExecution(item.workflowId);
      } catch {
        return null;
      }
    }),
  );

  return executions.filter(Boolean);
}
