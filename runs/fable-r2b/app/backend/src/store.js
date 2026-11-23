// The store's business operations. Each one is a thin layer over a Conductor
// workflow: this module keeps no state of its own, which is what lets it run
// on AWS Lambda.

import { createHash, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";

export const WORKFLOWS = {
  checkout: { name: "chaos_checkout", version: 1, rescue: "chaos_checkout_rescue", outputKey: "receipt" },
  returns: { name: "chaos_returns", version: 1, rescue: "chaos_returns_default_decision", outputKey: "decision" },
};
export const WORKFLOW_NAMES = [
  WORKFLOWS.checkout.name,
  WORKFLOWS.checkout.rescue,
  WORKFLOWS.returns.name,
  WORKFLOWS.returns.rescue,
];

const catalog = JSON.parse(readFileSync(new URL("../data/catalog.json", import.meta.url), "utf8"));
const productsById = new Map(catalog.products.map((product) => [product.id, product]));

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CLIENT_TOKEN = /^[A-Za-z0-9_-]{8,64}$/;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export class HttpError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const text = (value, max) => (typeof value === "string" ? value.trim().slice(0, max) : "");
const wholeNumber = (value, min, max, fallback) =>
  typeof value === "number" && Number.isFinite(value) ? Math.min(max, Math.max(min, Math.floor(value))) : fallback;

// The order number and the seed that drives every "random" outcome are both
// derived from the client token, so a retried request yields the same order.
function identity(prefix, token) {
  const hex = createHash("sha256").update(`${prefix}:${token}`).digest("hex");
  return {
    id: `${prefix}-${hex.slice(0, 8).toUpperCase()}`,
    seed: Number.parseInt(hex.slice(8, 14), 16) % 1000000,
  };
}

function clientToken(value) {
  return typeof value === "string" && CLIENT_TOKEN.test(value) ? value : randomUUID();
}

export function createStore({ conductor, config, now = () => Date.now() }) {
  // Starts the workflow unless one already exists for this client token.
  async function startOnce(workflow, token, input) {
    const existing = await conductor.findByCorrelation(workflow.name, token);
    if (existing.length > 0) return existing[0].workflowId;
    return conductor.startWorkflow({ name: workflow.name, version: workflow.version, input, correlationId: token });
  }

  async function loadExecution(workflow, workflowId, options) {
    if (!UUID.test(String(workflowId))) throw new HttpError(404, "NOT_FOUND", "No such record.");
    const execution = await conductor.getWorkflow(workflowId, options);
    // Only this store's own workflows are visible through the public API.
    if (!execution || execution.workflowName !== workflow.name) throw new HttpError(404, "NOT_FOUND", "No such record.");
    return execution;
  }

  // Maps an execution to its business result. A completed workflow carries the
  // result in its output. One that failed, timed out or was terminated gets its
  // result from the rescue workflow instead, which Conductor starts itself on
  // failure or timeout (failureWorkflow) and which is started here otherwise.
  async function resolveOutcome(workflow, execution) {
    const result = execution.output?.[workflow.outputKey];
    if (execution.status === "COMPLETED" && isObject(result)) return { state: "DONE", result };

    if (execution.status === "RUNNING" || execution.status === "PAUSED") {
      const timeoutMs = (execution.workflowDefinition?.timeoutSeconds ?? 0) * 1000;
      if (execution.status === "RUNNING" && timeoutMs > 0 && now() - execution.startTime > timeoutMs + 5000) {
        // Conductor applies a workflow timeout when it next evaluates the
        // workflow; ask for that evaluation now instead of waiting for it.
        await conductor.decide(execution.workflowId).catch(() => {});
      }
      return { state: "PROCESSING" };
    }

    let rescueId = execution.output?.["conductor.failure_workflow"];
    if (!rescueId) {
      const correlationId = `rescue-${execution.workflowId}`;
      const existing = await conductor.findByCorrelation(workflow.rescue, correlationId);
      rescueId =
        existing[0]?.workflowId ??
        (await conductor.startWorkflow({
          name: workflow.rescue,
          version: 1,
          correlationId,
          input: {
            ...execution.input,
            workflowId: execution.workflowId,
            reason: execution.reasonForIncompletion || `The workflow ended as ${execution.status}.`,
            failureStatus: execution.status,
          },
        }));
    }
    const rescue = await conductor.getWorkflow(rescueId);
    const rescued = rescue?.output?.[workflow.outputKey];
    if (rescue?.status === "COMPLETED" && isObject(rescued)) return { state: "DONE", result: rescued };
    if (rescue?.status === "RUNNING") return { state: "PROCESSING" };
    return { state: "NEEDS_OPERATOR" };
  }

  const links = (workflowId) =>
    config.conductorUiUrl ? { conductorUrl: `${config.conductorUiUrl}/execution/${workflowId}` } : {};

  // Polls briefly so that fast workflows are answered in a single request.
  async function settle(read, isSettled, waitMs) {
    const deadline = now() + waitMs;
    let status = await read();
    while (!isSettled(status) && now() < deadline) {
      await sleep(250);
      status = await read();
    }
    return status;
  }

  // ---- checkout -----------------------------------------------------------

  async function checkoutStatus(workflowId) {
    const execution = await loadExecution(WORKFLOWS.checkout, workflowId);
    const outcome = await resolveOutcome(WORKFLOWS.checkout, execution);
    return {
      state: outcome.state === "DONE" ? "COMPLETED" : outcome.state,
      workflowId: execution.workflowId,
      orderId: outcome.result?.orderId ?? execution.input?.orderId ?? null,
      receipt: outcome.result ?? null,
      ...links(execution.workflowId),
    };
  }

  // Never rejects a cart: unknown products are dropped, quantities are clamped
  // and missing choices fall back to defaults, so every request becomes an order.
  async function placeOrder(body) {
    const request = isObject(body) ? body : {};
    const token = clientToken(request.clientToken);
    const { id: orderId, seed } = identity("CC", token);

    const quantities = new Map();
    for (const item of Array.isArray(request.items) ? request.items.slice(0, 200) : []) {
      if (!isObject(item) || !productsById.has(item.id)) continue;
      quantities.set(item.id, Math.min(99, (quantities.get(item.id) ?? 0) + wholeNumber(item.qty, 1, 99, 1)));
    }
    const lines = [...quantities].map(([id, qty]) => {
      const product = productsById.get(id);
      return { id, name: product.name, emoji: product.emoji, qty, unitPriceCents: product.priceCents };
    });
    const customer = isObject(request.customer) ? request.customer : {};
    const shipping = catalog.shippingOptions.find((option) => option.id === request.shipping) ?? catalog.shippingOptions[0];
    const payment = catalog.paymentMethods.find((method) => method.id === request.payment) ?? catalog.paymentMethods[0];

    const workflowId = await startOnce(WORKFLOWS.checkout, token, {
      orderId,
      seed,
      placedAt: new Date(now()).toISOString(),
      customer: { name: text(customer.name, 80), email: text(customer.email, 120) },
      lines,
      coupon: text(request.coupon, 40),
      shipping,
      payment,
    });
    return settle(() => checkoutStatus(workflowId), (status) => status.state !== "PROCESSING", 4000);
  }

  // ---- returns ------------------------------------------------------------

  function returnProgress(execution, outcome) {
    const tasks = execution.tasks ?? [];
    const intake = tasks.find((task) => task.referenceTaskName === "intake")?.outputData?.result;
    const checks = tasks
      .filter((task) => /^run_check(__\d+)?$/.test(task.referenceTaskName) && task.status === "COMPLETED")
      .map((task) => task.outputData?.result)
      .filter(isObject)
      .sort((a, b) => a.n - b.n);
    const oathTask = tasks.find((task) => task.referenceTaskName === "await_oath");
    const windowSeconds = intake?.oathWindowSeconds ?? config.oathWindowSeconds;

    let state = outcome.state;
    if (outcome.state === "DONE") state = "DECIDED";
    else if (outcome.state === "PROCESSING") {
      if (execution.status !== "RUNNING" && execution.status !== "PAUSED") state = "DECIDING";
      else if (oathTask?.status === "IN_PROGRESS") state = "AWAITING_OATH";
      else state = oathTask ? "DECIDING" : "CHECKING";
    }

    const awaiting = state === "AWAITING_OATH";
    const opensAt = oathTask?.startTime || oathTask?.scheduledTime || now();
    return {
      state,
      workflowId: execution.workflowId,
      returnId: outcome.result?.returnId ?? execution.input?.returnId ?? null,
      item: outcome.result?.item ?? intake?.item ?? null,
      checks: outcome.result?.checks?.length ? outcome.result.checks : checks,
      totalChecks: intake?.totalChecks ?? 6,
      oath: {
        text: intake?.oathText ?? "I am sorry for what I did to the box.",
        windowSeconds,
        secondsLeft: awaiting ? Math.max(0, Math.ceil((opensAt + windowSeconds * 1000 - now()) / 1000)) : 0,
      },
      decision: outcome.result ?? null,
      ...links(execution.workflowId),
    };
  }

  async function returnStatus(workflowId) {
    const execution = await loadExecution(WORKFLOWS.returns, workflowId, { includeTasks: true });
    return returnProgress(execution, await resolveOutcome(WORKFLOWS.returns, execution));
  }

  // Never rejects a return either: an unknown order or item is recorded as
  // such and the workflow decides anyway.
  async function fileReturn(body) {
    const request = isObject(body) ? body : {};
    const token = clientToken(request.clientToken);
    const { id: returnId, seed } = identity("RMA", token);

    const product = productsById.get(request.itemId);
    let item = product ? { id: product.id, name: product.name, emoji: product.emoji, priceCents: product.priceCents } : {};
    let orderId = text(request.orderId, 60);
    let customerName = text(request.customerName, 80);
    let orderFound = false;
    if (UUID.test(String(request.orderRef))) {
      const order = await conductor.getWorkflow(request.orderRef);
      if (order?.workflowName === WORKFLOWS.checkout.name) {
        const receipt = (await resolveOutcome(WORKFLOWS.checkout, order)).result;
        if (receipt) {
          orderFound = true;
          orderId = receipt.orderId;
          customerName ||= receipt.customer?.name ?? "";
          const line = receipt.lines?.find((entry) => entry.id === request.itemId);
          if (line) item = { id: line.id, name: line.name, emoji: line.emoji, priceCents: line.unitPriceCents };
        }
      }
    }

    const affidavit = isObject(request.affidavit) ? request.affidavit : {};
    const workflowId = await startOnce(WORKFLOWS.returns, token, {
      returnId,
      seed,
      filedAt: new Date(now()).toISOString(),
      orderId,
      orderFound,
      customerName,
      item,
      returnReason: text(request.reason, 200),
      affidavit: {
        boxSmell: text(affidavit.boxSmell, 200),
        moonPhase: text(affidavit.moonPhase, 60),
        regretSquares: wholeNumber(affidavit.regretSquares, 0, 9, 0),
        keepWillingness: wholeNumber(affidavit.keepWillingness, 0, 100, 100),
      },
      checkPauseSeconds: config.checkPauseSeconds,
      oathWindowSeconds: config.oathWindowSeconds,
    });
    return returnStatus(workflowId);
  }

  // Hands the customer's oath to the waiting workflow. If the oath window has
  // already closed the workflow has moved on and the oath is refused.
  async function swearOath(workflowId, body) {
    const oath = text(isObject(body) ? body.oath : "", 300);
    if (!oath) throw new HttpError(400, "OATH_REQUIRED", "An oath must contain at least one character.");
    const execution = await loadExecution(WORKFLOWS.returns, workflowId, { includeTasks: true });
    const oathTask = execution.tasks?.find((task) => task.referenceTaskName === "await_oath");
    if (!oathTask) throw new HttpError(409, "OATH_NOT_OPEN", "The oath window has not opened yet.");
    if (oathTask.status !== "IN_PROGRESS") throw new HttpError(409, "OATH_CLOSED", "The oath window has closed.");
    await conductor.completeTask(execution.workflowId, "await_oath", { oath, swornAt: new Date(now()).toISOString() });
    return settle(() => returnStatus(execution.workflowId), (status) => status.state !== "AWAITING_OATH" && status.state !== "DECIDING", 3000);
  }

  // ---- misc ---------------------------------------------------------------

  async function health() {
    try {
      const definitions = await Promise.all(WORKFLOW_NAMES.map((name) => conductor.getWorkflowDefinition(name)));
      const missing = WORKFLOW_NAMES.filter((_, index) => !definitions[index]);
      return { ok: missing.length === 0, conductor: { reachable: true, missingWorkflows: missing } };
    } catch (error) {
      return { ok: false, conductor: { reachable: false, missingWorkflows: [], error: error.message } };
    }
  }

  return {
    catalog: () => catalog,
    health,
    placeOrder,
    checkoutStatus,
    fileReturn,
    returnStatus,
    swearOath,
  };
}
