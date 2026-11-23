// Chaos Commerce API. Framework-free: `handle(request)` takes a plain request object and returns a plain
// response, so the same code runs behind AWS Lambda (src/lambda.mjs) and the local server (scripts/start.mjs).
import { randomBytes } from "node:crypto";
import { ConductorClient, ConductorError } from "./conductor.mjs";
import { loadConfig } from "./config.mjs";
import {
  products,
  findProduct,
  shippingOptions,
  returnReasons,
  UNKNOWN_ITEM,
} from "./catalog.mjs";
import {
  checkoutDef,
  returnsDef,
  workflowDefs,
  FORM_TASK_REF,
  CHECK_TASK_REF,
  FORM_WAIT_SECONDS,
  CHECKS_TOTAL,
} from "./workflows.mjs";

const MAX_BODY_BYTES = 64 * 1024;
const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{2,63}$/;
const ID_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const RECOVERABLE = new Set(["FAILED", "TIMED_OUT", "TERMINATED"]);

const STEP_LABELS = {
  normalize_order: "Untangling the cart",
  price_order: "Inventing fees",
  attempt_payment: "Trying a payment processor",
  capture_payment: "Capturing the payment before it escapes",
  accept_iou: "Accepting an IOU on a napkin",
  reserve_inventory: "Rummaging through the warehouse",
  choose_carrier: "Choosing a carrier at random",
  build_confirmation: "Confirming the order",
  normalize_return: "Opening a return file",
  run_pointless_check: "Performing a pointless check",
  await_form_27b6: "Waiting for Form 27B/6",
  decide_return: "Reaching a decision",
  issue_refund: "Issuing a refund",
  file_denial: "Filing a denial",
  issue_store_credit: "Minting store credit",
  finalize_return: "Closing the return file",
};

class HttpError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function newId(prefix) {
  const bytes = randomBytes(10);
  let out = "";
  for (const byte of bytes) out += ID_ALPHABET[byte % ID_ALPHABET.length];
  return `${prefix}-${out}`;
}

function cleanText(value, max, fallback = "") {
  if (typeof value === "number" && Number.isFinite(value)) value = String(value);
  if (typeof value !== "string") return fallback;
  // Strip control characters; everything else is rendered as text by the frontend.
  const text = value.replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, max);
  return text || fallback;
}

function cleanQty(value) {
  const n = Math.floor(Number(value));
  if (!Number.isFinite(n)) return 1;
  return Math.min(99, Math.max(1, n));
}

const baseRef = (ref) => String(ref ?? "").replace(/__\d+$/, "");

export function createApp({ config = loadConfig(), conductor, now = () => Date.now() } = {}) {
  const client = conductor ?? new ConductorClient(config);

  async function ensureWorkflows() {
    await client.registerWorkflows(workflowDefs);
  }

  // Starts a workflow; if the definition is missing (fresh Conductor), registers it and tries once more.
  async function startWorkflow(def, correlationId, input) {
    const request = { name: def.name, version: def.version, correlationId, input };
    try {
      return await client.startWorkflow(request);
    } catch (error) {
      if (!(error instanceof ConductorError) || error.unreachable || error.status < 400 || error.status >= 500) {
        throw error;
      }
      await ensureWorkflows();
      return client.startWorkflow(request);
    }
  }

  // Starting can outlast our patience on a busy server (Conductor runs system tasks inline before it
  // answers). If we gave up waiting, the workflow may exist anyway: adopt it instead of reporting a failure.
  async function startOrAdopt(def, correlationId, input) {
    try {
      return { workflowId: await startWorkflow(def, correlationId, input), workflow: null };
    } catch (error) {
      if (!(error instanceof ConductorError) || !error.unreachable) throw error;
      const existing = await client.findByCorrelation(def.name, correlationId).catch(() => null);
      if (!existing) throw error;
      return { workflowId: existing.workflowId, workflow: existing };
    }
  }

  // Checkout must always complete and returns must always be decided, so an execution that an operator or
  // an outage left FAILED / TIMED_OUT / TERMINATED is put back on the rails the next time anyone looks at it.
  async function recoverIfNeeded(workflow) {
    if (!workflow || !RECOVERABLE.has(workflow.status)) return false;
    try {
      await client.retryWorkflow(workflow.workflowId);
    } catch {
      try {
        await client.restartWorkflow(workflow.workflowId);
      } catch {
        // Still report RECOVERING; the next poll tries again.
      }
    }
    return true;
  }

  function conductorInfo(workflow) {
    return {
      workflowId: workflow.workflowId,
      workflowName: workflow.workflowName ?? workflow.workflowType,
      workflowVersion: workflow.workflowVersion ?? workflow.version,
      status: workflow.status,
      executionUrl: config.conductorUiUrl ? `${config.conductorUiUrl}/execution/${workflow.workflowId}` : null,
    };
  }

  function stepsOf(workflow) {
    return (workflow.tasks ?? [])
      .filter((task) => ["INLINE", "JSON_JQ_TRANSFORM", "WAIT"].includes(task.taskType))
      .filter((task) => task.status !== "CANCELED")
      .map((task) => {
        const ref = baseRef(task.referenceTaskName);
        const result = task.outputData?.result;
        let detail = null;
        if (ref === "attempt_payment" && result) detail = `${result.processor}: ${result.message}`;
        if (ref === CHECK_TASK_REF && result) detail = `${result.department}: ${result.verdict}`;
        return { ref: task.referenceTaskName, label: STEP_LABELS[ref] ?? ref, status: task.status, detail };
      });
  }

  async function orderView(workflow) {
    const recovering = await recoverIfNeeded(workflow);
    const complete = workflow.status === "COMPLETED";
    return {
      orderId: workflow.correlationId ?? workflow.input?.orderId ?? null,
      state: complete ? "CONFIRMED" : recovering ? "RECOVERING" : "PROCESSING",
      complete,
      confirmation: complete ? (workflow.output?.confirmation ?? null) : null,
      steps: stepsOf(workflow),
      conductor: conductorInfo(workflow),
    };
  }

  async function returnView(workflow) {
    const recovering = await recoverIfNeeded(workflow);
    const complete = workflow.status === "COMPLETED";
    const tasks = workflow.tasks ?? [];
    const result = complete ? (workflow.output?.result ?? null) : null;
    const checks =
      result?.checks ??
      tasks
        .filter((task) => baseRef(task.referenceTaskName) === CHECK_TASK_REF && task.status === "COMPLETED")
        .map((task) => task.outputData?.result)
        .filter(Boolean);
    const formTask = tasks.filter((task) => task.referenceTaskName === FORM_TASK_REF).at(-1);
    const formPending = !recovering && formTask?.status === "IN_PROGRESS";
    const startedAt = formTask?.startTime || formTask?.scheduledTime || now();
    const deadline = startedAt + FORM_WAIT_SECONDS * 1000;
    return {
      returnId: workflow.correlationId ?? workflow.input?.returnId ?? null,
      orderId: workflow.input?.orderId ?? null,
      item: result?.item ?? workflow.input?.item ?? null,
      state: complete ? "DECIDED" : recovering ? "RECOVERING" : formPending ? "AWAITING_FORM" : "CHECKING",
      complete,
      decision: result?.decision ?? null,
      result,
      checks,
      checksTotal: CHECKS_TOTAL,
      form: {
        name: "Form 27B/6",
        pending: formPending,
        stamped: formTask?.outputData?.stamped === true,
        waitSeconds: FORM_WAIT_SECONDS,
        secondsRemaining: formPending ? Math.max(0, Math.ceil((deadline - now()) / 1000)) : 0,
      },
      steps: stepsOf(workflow),
      conductor: conductorInfo(workflow),
    };
  }

  // ---- checkout -----------------------------------------------------------------------------------------

  function buildOrderInput(body, orderId) {
    const rawItems = Array.isArray(body.items) ? body.items.slice(0, 50) : [];
    const items = [];
    for (const raw of rawItems) {
      if (!raw || typeof raw !== "object") continue;
      const product = findProduct(raw.id);
      const qty = cleanQty(raw.qty);
      if (product) {
        items.push({ id: product.id, name: product.name, unitPrice: product.unitPrice, qty });
      } else {
        items.push({ ...UNKNOWN_ITEM, requested: cleanText(raw.id, 64, "(nothing)"), qty });
      }
    }
    // An empty cart is passed through as-is: the workflow sells the customer Nothing (Deluxe Edition).
    const customer = body.customer && typeof body.customer === "object" ? body.customer : {};
    const shipping = shippingOptions.some((option) => option.id === body.shipping) ? body.shipping : "standard";
    return {
      orderId,
      customer: {
        name: cleanText(customer.name, 80, "Valued Customer"),
        email: cleanText(customer.email, 120, "no-reply@chaos-commerce.example"),
      },
      items,
      coupon: cleanText(body.coupon, 40, ""),
      shipping,
      placedAt: new Date(now()).toISOString(),
    };
  }

  async function checkout(body) {
    const supplied = typeof body.orderId === "string" && ID_PATTERN.test(body.orderId);
    const orderId = supplied ? body.orderId : newId("CC");

    // Idempotency: the browser reuses its order number when it retries, so a retry never double-orders.
    if (supplied) {
      const existing = await client.findByCorrelation(checkoutDef.name, orderId);
      if (existing) return { status: 200, body: await orderView(existing) };
    }

    const started = await startOrAdopt(checkoutDef, orderId, buildOrderInput(body, orderId));
    const { workflowId } = started;
    if (started.workflow) {
      const adopted = await orderView(started.workflow);
      return { status: adopted.complete ? 201 : 202, body: adopted };
    }
    const deadline = now() + config.checkoutWaitMs;
    let workflow = null;
    for (;;) {
      try {
        workflow = await client.getWorkflow(workflowId);
      } catch {
        workflow = null; // started for certain; the status poll can catch up later
      }
      if (workflow?.status === "COMPLETED" || now() >= deadline) break;
      await sleep(250);
    }
    if (!workflow) {
      return {
        status: 202,
        body: {
          orderId,
          state: "PROCESSING",
          complete: false,
          confirmation: null,
          steps: [],
          conductor: { workflowId, workflowName: checkoutDef.name, workflowVersion: checkoutDef.version, status: "RUNNING", executionUrl: null },
        },
      };
    }
    const view = await orderView(workflow);
    return { status: view.complete ? 201 : 202, body: view };
  }

  async function getOrder(orderId) {
    if (!ID_PATTERN.test(orderId)) throw new HttpError(404, "ORDER_NOT_FOUND", "We have no record of that order. This is normal.");
    const workflow = await client.findByCorrelation(checkoutDef.name, orderId);
    if (!workflow) throw new HttpError(404, "ORDER_NOT_FOUND", "We have no record of that order. This is normal.");
    return { status: 200, body: await orderView(workflow) };
  }

  // ---- returns ------------------------------------------------------------------------------------------

  async function startReturn(body) {
    const supplied = typeof body.returnId === "string" && ID_PATTERN.test(body.returnId);
    const returnId = supplied ? body.returnId : newId("RMA");
    if (supplied) {
      const existing = await client.findByCorrelation(returnsDef.name, returnId);
      if (existing) return { status: 200, body: await returnView(existing) };
    }

    const orderId = cleanText(body.orderId, 64, "");
    const itemId = cleanText(body.itemId, 64, "");
    let order = null;
    if (ID_PATTERN.test(orderId)) order = await client.findByCorrelation(checkoutDef.name, orderId);
    const orderItems = order?.output?.confirmation?.items ?? order?.input?.items ?? [];
    const purchased = (Array.isArray(orderItems) ? orderItems : []).find((item) => item?.id === itemId) ?? (itemId ? null : orderItems[0]);
    const product = findProduct(itemId);
    const item = purchased
      ? { id: purchased.id, name: purchased.name, unitPrice: purchased.unitPrice, qty: purchased.qty }
      : product
        ? { id: product.id, name: product.name, unitPrice: product.unitPrice, qty: 1 }
        : { id: itemId || "mystery-item", name: "Something you bought, probably", unitPrice: 0, qty: 1 };

    const answers = {};
    if (body.answers && typeof body.answers === "object" && !Array.isArray(body.answers)) {
      for (const [key, value] of Object.entries(body.answers).slice(0, 20)) {
        answers[cleanText(key, 40, "question")] = typeof value === "boolean" ? value : cleanText(value, 200, "");
      }
    }

    const input = {
      returnId,
      orderId: orderId || "CC-UNKNOWN",
      orderFound: Boolean(order),
      item,
      reason: cleanText(body.reason, 200, "No reason given"),
      answers,
      requestedAt: new Date(now()).toISOString(),
    };
    const started = await startOrAdopt(returnsDef, returnId, input);
    const { workflowId } = started;
    let workflow = started.workflow;
    if (!workflow) {
      try {
        workflow = await client.getWorkflow(workflowId);
      } catch {
        workflow = null;
      }
    }
    workflow ??= { workflowId, workflowName: returnsDef.name, workflowVersion: returnsDef.version, status: "RUNNING", correlationId: returnId, input, tasks: [] };
    return { status: 201, body: await returnView(workflow) };
  }

  async function findReturn(returnId) {
    if (!ID_PATTERN.test(returnId)) throw new HttpError(404, "RETURN_NOT_FOUND", "We have no record of that return. We may have returned it.");
    const workflow = await client.findByCorrelation(returnsDef.name, returnId);
    if (!workflow) throw new HttpError(404, "RETURN_NOT_FOUND", "We have no record of that return. We may have returned it.");
    return workflow;
  }

  async function getReturn(returnId) {
    return { status: 200, body: await returnView(await findReturn(returnId)) };
  }

  async function stampForm(returnId, body) {
    let workflow = await findReturn(returnId);
    const formTask = (workflow.tasks ?? []).filter((task) => task.referenceTaskName === FORM_TASK_REF).at(-1);
    let accepted = false;
    let message;
    if (workflow.status === "RUNNING" && formTask?.status === "IN_PROGRESS") {
      await client.completeTask(workflow.workflowId, FORM_TASK_REF, {
        stamped: true,
        signature: cleanText(body.signature, 80, "X"),
        stampedAt: new Date(now()).toISOString(),
      });
      accepted = true;
      message = "Form 27B/6 stamped. It has been filed in the round cabinet.";
      // Give the workflow a moment to reach its decision so one call usually returns the outcome.
      for (let i = 0; i < 12; i++) {
        await sleep(250);
        const fresh = await client.getWorkflow(workflow.workflowId).catch(() => null);
        if (fresh) workflow = fresh;
        if (workflow.status === "COMPLETED") break;
      }
    } else if (formTask?.outputData?.stamped === true) {
      message = "Form 27B/6 has already been stamped. Stamping it twice requires Form 27B/7.";
    } else if (formTask) {
      message = "Too late: the form window has closed and the return was decided without you.";
    } else {
      message = "Form 27B/6 is not available yet. The pointless checks must be completed first.";
    }
    return { status: accepted ? 200 : 409, body: { accepted, message, return: await returnView(workflow) } };
  }

  // ---- misc ---------------------------------------------------------------------------------------------

  async function health() {
    const reachable = await client.health();
    let registered = [];
    if (reachable) {
      const found = await Promise.all(
        workflowDefs.map((def) => client.getWorkflowDef(def.name, def.version).catch(() => null)),
      );
      registered = workflowDefs.filter((_, index) => found[index]).map((def) => def.name);
    }
    const ok = reachable && registered.length === workflowDefs.length;
    return {
      status: ok ? 200 : 503,
      body: {
        ok,
        service: "chaos-commerce-backend",
        conductor: { reachable, url: config.conductorUrl, workflowsRegistered: registered },
        motto: ok ? "Everything is fine. Structurally." : "Something is on fire that is not supposed to be.",
      },
    };
  }

  function parseBody(request) {
    const raw = request.body;
    if (raw === undefined || raw === null || raw === "") return {};
    if (Buffer.byteLength(String(raw)) > MAX_BODY_BYTES) {
      throw new HttpError(413, "BODY_TOO_LARGE", "That request is too large, even for us.");
    }
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new HttpError(400, "INVALID_JSON", "The request body must be JSON. We are a mess, not a free-for-all.");
    }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new HttpError(400, "INVALID_BODY", "The request body must be a JSON object.");
    }
    return parsed;
  }

  async function route(request) {
    const method = String(request.method ?? "GET").toUpperCase();
    // Tolerate API Gateway stage prefixes: route on everything from the first "/api" segment.
    const fullPath = String(request.path ?? "/");
    const at = fullPath.search(/\/api(\/|$)/);
    const path = (at >= 0 ? fullPath.slice(at + 4) : fullPath).replace(/\/+$/, "") || "/";
    const segments = path.split("/").filter(Boolean).map((part) => {
      try {
        return decodeURIComponent(part);
      } catch {
        return part;
      }
    });
    const [resource, id, action] = segments;

    if (method === "OPTIONS") return { status: 204, body: null };

    if (method === "GET" || method === "HEAD") {
      if (segments.length === 0 || (resource === "health" && segments.length === 1)) return health();
      if (resource === "products" && segments.length === 1) {
        return { status: 200, body: { products, shippingOptions, returnReasons } };
      }
      if (resource === "products" && segments.length === 2) {
        const product = findProduct(id);
        if (!product) throw new HttpError(404, "PRODUCT_NOT_FOUND", "No such product. Consider buying a different one twice.");
        return { status: 200, body: product };
      }
      if (resource === "orders" && segments.length === 2) return getOrder(id);
      if (resource === "returns" && segments.length === 2) return getReturn(id);
    }

    if (method === "POST") {
      if (resource === "checkout" && segments.length === 1) return checkout(parseBody(request));
      if (resource === "returns" && segments.length === 1) return startReturn(parseBody(request));
      if (resource === "returns" && segments.length === 3 && action === "form") return stampForm(id, parseBody(request));
    }

    const known = ["health", "products", "orders", "returns", "checkout"].includes(resource);
    if (known) throw new HttpError(405, "METHOD_NOT_ALLOWED", `${method} is not something we do to ${path}.`);
    throw new HttpError(404, "NOT_FOUND", "There is nothing here. Not even a 404 page. This is it.");
  }

  async function handle(request) {
    const headers = {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": config.corsAllowOrigin,
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "600",
      "X-Content-Type-Options": "nosniff",
    };
    if (config.corsAllowOrigin !== "*") headers.Vary = "Origin";
    try {
      const { status, body } = await route(request);
      return { status, headers, body: body === null ? "" : JSON.stringify(body) };
    } catch (error) {
      if (error instanceof HttpError) {
        return { status: error.status, headers, body: JSON.stringify({ error: { code: error.code, message: error.message, retryable: false } }) };
      }
      if (error instanceof ConductorError) {
        const unavailable = error.unreachable || error.status >= 500;
        console.error(`[chaos-commerce] ${error.message}${error.body ? ` :: ${error.body}` : ""}`);
        return {
          status: unavailable ? 503 : 502,
          headers: unavailable ? { ...headers, "Retry-After": "3" } : headers,
          body: JSON.stringify({
            error: {
              code: unavailable ? "CONDUCTOR_UNAVAILABLE" : "CONDUCTOR_REJECTED",
              message: unavailable
                ? "Our workflow engine is not answering. Nothing was lost; try again with the same order number."
                : "Our workflow engine refused that request. It is usually more easy-going.",
              retryable: unavailable,
            },
          }),
        };
      }
      console.error("[chaos-commerce] unexpected error", error);
      return {
        status: 500,
        headers,
        body: JSON.stringify({ error: { code: "INTERNAL", message: "Something broke that was not supposed to be funny.", retryable: true } }),
      };
    }
  }

  return { handle, ensureWorkflows, config, client };
}
