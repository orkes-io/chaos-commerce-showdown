// Shared plumbing for the two customer-facing flows. Each flow has a main workflow and a
// rescue workflow; an execution is "settled" once either of them has completed.

import { ConductorError } from './conductor.mjs';

export const FLOWS = {
  order: { main: 'chaos_checkout', rescue: 'chaos_checkout_rescue', version: 1 },
  return: { main: 'chaos_return', rescue: 'chaos_return_rescue', version: 1 },
};

const IN_FLIGHT = new Set(['RUNNING', 'PAUSED']);
const MAX_RESCUES = 5;
const POLL_MS = 250;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const inFlightStarts = new Map();

// Finds the execution for a correlation id or starts one. Checking before every attempt keeps
// retries and double-submits from creating a second order or return.
export function findOrStart(conductor, flow, correlationId, buildInput, { registerWorkflows } = {}) {
  const key = `${flow.main}:${correlationId}`;
  if (inFlightStarts.has(key)) return inFlightStarts.get(key);

  const work = (async () => {
    let registered = false;
    for (let attempt = 0; ; attempt += 1) {
      try {
        const existing = await conductor.findByCorrelation(flow.main, correlationId);
        if (existing.length) return { created: false };
        const workflowId = await conductor.startWorkflow({ name: flow.main, version: flow.version, correlationId, input: buildInput() });
        return { created: true, workflowId };
      } catch (error) {
        const missingDefinition = error instanceof ConductorError && error.status === 404 && /workflow defined/i.test(error.message);
        if (missingDefinition && registerWorkflows && !registered) {
          registered = true;
          await registerWorkflows();
          continue;
        }
        if (!(error instanceof ConductorError && error.unavailable) || attempt >= 2) throw error;
        await sleep(300 * 2 ** attempt);
      }
    }
  })().finally(() => inFlightStarts.delete(key));

  inFlightStarts.set(key, work);
  return work;
}

// Decides what a main execution currently amounts to. A main workflow that ended without
// completing is covered by its rescue workflow: Conductor starts one itself on FAILED and
// TIMED_OUT (failureWorkflow); for TERMINATED, or if that one is gone, we start it here.
export async function settle(conductor, flow, main) {
  if (main.status === 'COMPLETED') return { done: true, rescued: false, output: main.output ?? {} };
  if (IN_FLIGHT.has(main.status)) return { done: false };

  const rescueKey = main.correlationId || main.workflowId;
  const rescues = await conductor.findByCorrelation(flow.rescue, rescueKey);
  const automaticId = main.output?.['conductor.failure_workflow'];
  if (automaticId && !rescues.some((rescue) => rescue.workflowId === automaticId)) {
    const automatic = await conductor.getWorkflow(automaticId);
    if (automatic) rescues.push(automatic);
  }

  const completed = rescues.find((rescue) => rescue.status === 'COMPLETED');
  if (completed) return { done: true, rescued: true, output: completed.output ?? {}, rescueWorkflowId: completed.workflowId };
  if (rescues.some((rescue) => IN_FLIGHT.has(rescue.status))) return { done: false };
  if (rescues.length >= MAX_RESCUES) return { done: false, stuck: true };

  await conductor.startWorkflow({
    name: flow.rescue,
    version: flow.version,
    correlationId: rescueKey,
    input: {
      ...(main.input ?? {}),
      workflowId: main.workflowId,
      reason: main.reasonForIncompletion || `Workflow ended as ${main.status}`,
      failureStatus: main.status,
    },
  });
  return { done: false };
}

// Looks an execution up by correlation id and waits up to `waitMs` for it to settle.
// Returns null when no such execution exists. `workflowId` covers the moment right after a
// start, in case the correlation lookup has not caught up with it yet.
export async function settleByCorrelation(conductor, flow, correlationId, { waitMs = 0, includeTasks = false, workflowId } = {}) {
  const deadline = Date.now() + waitMs;
  for (;;) {
    let [main] = await conductor.findByCorrelation(flow.main, correlationId, { includeTasks });
    if (!main && workflowId) main = await conductor.getWorkflow(workflowId, { includeTasks });
    if (!main) return null;
    const result = await settle(conductor, flow, main);
    if (result.done || Date.now() + POLL_MS > deadline) return { main, ...result };
    await sleep(POLL_MS);
  }
}

const alreadyRescued = new Set();

// Sweeps recent executions that ended without completing and makes sure each has a rescue,
// so an order or return nobody is watching still gets finished.
export async function reconcile(conductor, { sinceMs = 24 * 60 * 60 * 1000 } = {}) {
  const summary = { checked: 0, settled: 0, pending: 0 };
  if (alreadyRescued.size > 5000) alreadyRescued.clear();
  for (const flow of Object.values(FLOWS)) {
    const hits = await conductor.search(
      `workflowType IN (${flow.main}) AND status IN (FAILED,TIMED_OUT,TERMINATED) AND startTime > ${Date.now() - sinceMs}`,
    );
    for (const hit of hits) {
      if (alreadyRescued.has(hit.workflowId)) continue;
      const main = await conductor.getWorkflow(hit.workflowId);
      if (!main) continue;
      summary.checked += 1;
      const result = await settle(conductor, flow, main);
      if (result.done) {
        alreadyRescued.add(hit.workflowId);
        summary.settled += 1;
      } else {
        summary.pending += 1;
      }
    }
  }
  return summary;
}
