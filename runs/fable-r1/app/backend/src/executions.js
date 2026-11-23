// Starting workflows idempotently and turning an execution into a result.
//
// The guarantee both checkout and returns rely on lives in `resolve`: an execution
// that did not complete normally is never reported as a failure. Its rescue workflow
// supplies the result instead, and is started here if Conductor has not started it.

import { ConductorError } from "./conductor.js";
import { registerDefinitions, versionOf } from "./definitions.js";

const RUNNING = new Set(["RUNNING", "PAUSED"]);
const FAILURE_WORKFLOW_KEY = "conductor.failure_workflow";
// Conductor marks a workflow FAILED slightly before it records the failure workflow's id.
const FAILURE_WORKFLOW_GRACE_MS = 3000;

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);

const oldest = (executions) =>
  [...executions].sort((a, b) => (a.createTime ?? a.startTime ?? 0) - (b.createTime ?? b.startTime ?? 0))[0];

// Starts `name` unless an execution with this correlationId already exists, so a retried
// request (double click, network retry, Lambda retry) never creates a second order or return.
export const startOrFind = async ({ conductor, name, correlationId, input }) => {
  let registered = false;
  for (let attempt = 1; ; attempt += 1) {
    try {
      const existing = await conductor.findByCorrelationId(name, correlationId);
      if (existing.length > 0) return oldest(existing).workflowId;
      const workflowId = await conductor.startWorkflow({ name, version: versionOf(name), input, correlationId });
      if (typeof workflowId !== "string" || workflowId === "") {
        throw new ConductorError("Conductor started a workflow but did not return its id", { status: 502 });
      }
      return workflowId;
    } catch (error) {
      // The definitions were never registered, or were deleted: register and try again.
      if (error.status === 404 && !registered) {
        await registerDefinitions(conductor);
        registered = true;
        continue;
      }
      if (!error.retryable || attempt >= 3) throw error;
      await sleep(250 * attempt);
    }
  }
};

const resultOf = (workflow, kind) => {
  const result = workflow?.status === "COMPLETED" ? workflow.output?.[kind.outputKey] : null;
  return isObject(result) ? result : null;
};

const startRescue = async ({ conductor, workflow, kind }) => {
  const rescueId = await startOrFind({
    conductor,
    name: kind.rescue,
    correlationId: `rescue:${workflow.workflowId}`,
    input: {
      ...(isObject(workflow.input) ? workflow.input : {}),
      workflowId: workflow.workflowId,
      reason: workflow.reasonForIncompletion || `Workflow ended as ${workflow.status}`,
      failureStatus: workflow.status,
    },
  });
  return conductor.getWorkflow(rescueId);
};

// Returns { done: true, result } or { done: false } while something is still running.
export const resolve = async ({ conductor, workflow, kind, now = Date.now() }) => {
  const result = resultOf(workflow, kind);
  if (result) return { done: true, result };
  if (RUNNING.has(workflow.status)) return { done: false };

  // FAILED, TIMED_OUT, TERMINATED, or completed without a usable result.
  const failureWorkflowId = workflow.output?.[FAILURE_WORKFLOW_KEY];
  if (typeof failureWorkflowId === "string" && failureWorkflowId !== "") {
    const started = await conductor.getWorkflow(failureWorkflowId);
    const rescued = resultOf(started, kind);
    if (rescued) return { done: true, result: rescued };
    if (started && RUNNING.has(started.status)) return { done: false };
  } else if (workflow.status === "FAILED" || workflow.status === "TIMED_OUT") {
    const sinceEnd = now - (workflow.endTime || 0);
    if (sinceEnd >= 0 && sinceEnd < FAILURE_WORKFLOW_GRACE_MS) return { done: false };
  }

  // Conductor does not run a failure workflow for a terminated execution, and the one it
  // did run may itself have been interfered with. Start the rescue ourselves.
  const manual = await startRescue({ conductor, workflow, kind });
  const rescued = resultOf(manual, kind);
  if (rescued) return { done: true, result: rescued };
  if (manual && RUNNING.has(manual.status)) return { done: false };
  throw new ConductorError(`Rescue workflow ${kind.rescue} did not produce a result for ${workflow.workflowId}`, {
    status: 502,
    retryable: true,
  });
};

// Loads an execution of the expected workflow, or null if the id is not one of ours.
// The name check stops the API from being used to read other workflows on a shared server.
export const loadExecution = async ({ conductor, workflowId, kind }) => {
  const workflow = await conductor.getWorkflow(workflowId);
  return workflow && workflow.workflowName === kind.name ? workflow : null;
};

// Polls until `resolve` reports done or the time budget runs out.
export const waitForResult = async ({ conductor, workflowId, kind, timeoutMs, intervalMs = 200 }) => {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const workflow = await loadExecution({ conductor, workflowId, kind });
    if (!workflow) return { workflow: null, done: false };
    const outcome = await resolve({ conductor, workflow, kind });
    if (outcome.done || Date.now() + intervalMs > deadline) return { workflow, ...outcome };
    await sleep(intervalMs);
  }
};
