import { randomUUID } from "node:crypto";
import { orderSnapshot } from "./checkout.js";
import { WORKFLOWS } from "./definitions.js";
import { loadExecution, resolve, sleep, startOrFind } from "./executions.js";
import { idempotencyKey, isExecutionId, record, seedFrom, text } from "./sanitize.js";

const KIND = WORKFLOWS.returns;

// Shown while a check is still running. Finished checks carry their own label.
const AUTOMATED_CHECKS = [
  { ref: "check_moon_phase", id: "moon", label: "Lunar Phase Compatibility" },
  { ref: "check_item_feelings", id: "feelings", label: "Item Feelings Interview" },
  { ref: "check_blame_ledger", id: "blame", label: "Blame Ledger Cross-Reference" },
  { ref: "check_fax_from_1997", id: "fax", label: "Fax Confirmation From 1997" },
];

// Tasks inside the paperwork loop are named ask_customer__1, grade_answer__2, ...
const baseRef = (task) => String(task.referenceTaskName ?? "").replace(/__\d+$/, "");

const completedResult = (task) =>
  task?.status === "COMPLETED" && task.outputData?.result && typeof task.outputData.result === "object"
    ? task.outputData.result
    : null;

const openQuestion = (workflow) =>
  (workflow.tasks ?? []).find(
    (task) => task.taskType === "WAIT" && task.status === "IN_PROGRESS" && baseRef(task) === "ask_customer",
  );

const currentStep = (workflow, now) => {
  const task = openQuestion(workflow);
  if (!task) return null;
  const question = record(task.inputData?.question);
  const timeoutSeconds = Number(question.timeoutSeconds) || 45;
  const deadline = (task.startTime || now) + timeoutSeconds * 1000;
  return {
    stepId: task.taskId,
    step: question.step ?? task.iteration ?? 1,
    of: question.of ?? 4,
    kind: question.kind ?? "essay",
    title: question.title ?? "A Form",
    prompt: question.prompt ?? "Please answer.",
    inputType: question.inputType === "choice" ? "choice" : "text",
    options: Array.isArray(question.options) ? question.options : [],
    placeholder: question.placeholder ?? "",
    timeoutSeconds,
    deadline: new Date(deadline).toISOString(),
    secondsRemaining: Math.max(0, Math.ceil((deadline - now) / 1000)),
  };
};

const progress = (workflow) => {
  const tasks = workflow.tasks ?? [];
  const automatedChecks = AUTOMATED_CHECKS.map((check) => {
    const result = completedResult(tasks.find((task) => task.referenceTaskName === check.ref));
    return result
      ? { id: result.id, label: result.label, status: "DONE", passed: result.passed === true, remark: result.remark }
      : { id: check.id, label: check.label, status: "RUNNING", passed: null, remark: "Checking. Please hold." };
  });
  const customerChecks = tasks
    .filter((task) => baseRef(task) === "grade_answer")
    .map(completedResult)
    .filter(Boolean)
    .sort((a, b) => (a.step ?? 0) - (b.step ?? 0));
  return { automatedChecks, customerChecks };
};

const returnView = ({ config, workflow, outcome, now = Date.now() }) => {
  const returnId = workflow.workflowId;
  const input = record(workflow.input);
  const base = {
    returnId,
    caseNumber: `RMA-${returnId.slice(0, 6).toUpperCase()}`,
    orderId: text(input.orderId, 64),
    links: {
      self: `/api/returns/${returnId}`,
      answers: `/api/returns/${returnId}/answers`,
      ...(config.conductorUiUrl ? { workflow: `${config.conductorUiUrl}/execution/${returnId}` } : {}),
    },
  };
  if (outcome.done) {
    const { decision, reason, decidedBy, resolution, ...caseFile } = outcome.result;
    return {
      ...base,
      status: "DECIDED",
      rescued: caseFile.rescued === true,
      orderNumber: caseFile.orderNumber,
      itemName: caseFile.itemName,
      automatedChecks: (caseFile.automatedChecks ?? []).map((check) => ({ ...check, status: "DONE" })),
      customerChecks: caseFile.customerChecks ?? [],
      currentStep: null,
      decision: { decision, reason, decidedBy, resolution },
    };
  }
  const step = currentStep(workflow, now);
  return {
    ...base,
    status: step ? "AWAITING_CUSTOMER" : "IN_REVIEW",
    rescued: false,
    orderNumber: record(input.order).orderNumber ?? "UNKNOWN",
    itemName: text(input.itemName, 120) || "the whole regrettable order",
    ...progress(workflow),
    currentStep: step,
    decision: null,
  };
};

const view = async ({ conductor, config, workflow }) =>
  returnView({ config, workflow, outcome: await resolve({ conductor, workflow, kind: KIND }) });

// Returns null when the id is not a Chaos Commerce return.
export const getReturn = async ({ conductor, config, returnId }) => {
  const workflow = await loadExecution({ conductor, workflowId: returnId, kind: KIND });
  return workflow ? view({ conductor, config, workflow }) : null;
};

// Polls until `ready(view)` is true or the time budget runs out, and returns the last view.
const viewWhen = async ({ conductor, config, returnId, ready, timeoutMs }) => {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const current = await getReturn({ conductor, config, returnId });
    if (!current || ready(current) || Date.now() + 200 > deadline) return current;
    await sleep(200);
  }
};

export const startReturn = async ({ conductor, config, body }) => {
  const request = record(body);
  const returnKey = idempotencyKey(request.returnId) ?? randomUUID();
  const orderId = text(request.orderId, 64);
  // A return for an order we cannot find is still accepted. The workflow denies it,
  // but only after the paperwork.
  const order = isExecutionId(orderId) ? await orderSnapshot({ conductor, orderId }) : null;
  const requestedAt = new Date();
  const requestedTimeout = Number.parseInt(request.stepTimeoutSeconds, 10);
  const returnId = await startOrFind({
    conductor,
    name: KIND.name,
    correlationId: `return:${returnKey}`,
    input: {
      returnId: returnKey,
      seed: seedFrom(returnKey),
      requestedAt: requestedAt.toISOString(),
      requestedAtEpochMs: requestedAt.getTime(),
      orderId,
      order,
      itemName: text(request.itemName, 120),
      statedReason: text(request.reason, 300),
      stepTimeoutSeconds: Number.isFinite(requestedTimeout)
        ? Math.min(300, Math.max(5, requestedTimeout))
        : config.returnStepTimeoutSeconds,
      disasterDrill: config.allowDisasterDrills && request.disasterDrill === true,
    },
  });
  return getReturn({ conductor, config, returnId });
};

export class StepClosedError extends Error {
  constructor(current) {
    super("That form is no longer open. Its deadline passed, or it was already answered.");
    this.name = "StepClosedError";
    this.current = current;
  }
}

// Answers the form the customer is currently looking at by completing its WAIT task.
export const answerReturn = async ({ conductor, config, returnId, body }) => {
  const request = record(body);
  const workflow = await loadExecution({ conductor, workflowId: returnId, kind: KIND });
  if (!workflow) return null;
  const task = openQuestion(workflow);
  if (!task || task.taskId !== request.stepId) {
    throw new StepClosedError(await view({ conductor, config, workflow }));
  }
  try {
    await conductor.completeTask({
      workflowId: returnId,
      taskId: task.taskId,
      output: { answer: text(request.answer, 500) },
    });
  } catch (error) {
    if (error.retryable) throw error;
    // The deadline passed between reading the task and completing it.
    throw new StepClosedError(await getReturn({ conductor, config, returnId }));
  }
  // Wait for the answer to be graded and the next form (or the decision) to appear.
  return viewWhen({
    conductor,
    config,
    returnId,
    ready: (current) => current.status === "DECIDED" || (current.currentStep && current.currentStep.stepId !== task.taskId),
    timeoutMs: 4000,
  });
};
