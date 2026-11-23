import { randomUUID } from 'node:crypto';
import { PRODUCTS, RETURN_REASONS, findProduct } from './catalog.js';
import { ConductorError } from './conductor.js';
import {
  CHECKOUT_WORKFLOW, RETURN_WORKFLOW, MANAGER_REVIEW_TASK, TOTAL_POINTLESS_CHECKS,
  countReturnedUnits, isActive, toOrderView, toReturnView,
} from './views.js';

const MAX_BODY_BYTES = 16 * 1024;
const MAX_CART_LINES = 25;
const MAX_QUANTITY = 99;
const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/;
const CLIENT_KEY_PATTERN = /^[A-Za-z0-9-]{8,64}$/;
// A start loses the idempotency race only to an execution that is still usable.
const USABLE_STATUSES = new Set(['RUNNING', 'PAUSED', 'COMPLETED']);

class HttpError extends Error {
  constructor(status, message, code) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Framework-free request handler shared by the local server and the Lambda
// entry point: ({ method, path, body }) -> { status, headers, body }.
export function createApp({ config, conductor, random = Math.random, pollIntervalMs = 400 }) {
  const inFlight = new Map();
  const locks = new Map();

  const corsHeaders = {
    'access-control-allow-origin': config.allowedOrigin,
    'access-control-allow-methods': 'GET,POST,OPTIONS',
    'access-control-allow-headers': 'content-type',
    'access-control-max-age': '600',
    ...(config.allowedOrigin === '*' ? {} : { vary: 'origin' }),
  };

  function json(status, payload, extraHeaders = {}) {
    return {
      status,
      headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...corsHeaders, ...extraHeaders },
      body: JSON.stringify(payload),
    };
  }

  function parseBody(raw) {
    if (typeof raw !== 'string' || raw.trim() === '') throw new HttpError(400, 'Request body must be JSON.');
    if (Buffer.byteLength(raw) > MAX_BODY_BYTES) throw new HttpError(413, 'Request body is too large.');
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new HttpError(400, 'Request body is not valid JSON.');
    }
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) throw new HttpError(400, 'Request body must be a JSON object.');
    return parsed;
  }

  function quantityOf(value, label) {
    if (!Number.isInteger(value) || value < 1 || value > MAX_QUANTITY) {
      throw new HttpError(400, `${label} must be a whole number from 1 to ${MAX_QUANTITY}.`);
    }
    return value;
  }

  const chaosSeed = () => 1 + Math.floor(random() * 2147483646);

  // Runs `task` after any earlier task with the same key has settled.
  function withLock(key, task) {
    const previous = locks.get(key) || Promise.resolve();
    const current = previous.catch(() => {}).then(task);
    const tail = current.catch(() => {});
    locks.set(key, tail);
    tail.then(() => {
      if (locks.get(key) === tail) locks.delete(key);
    });
    return current;
  }

  // Starts a workflow at most once per (correlationId, matching input). The
  // Conductor server ignores idempotency keys, so duplicates are found by
  // correlation id: before starting, and again after, when the earliest
  // execution wins and a later duplicate of ours is terminated.
  async function startOnce({ name, correlationId, input, matches = () => true }) {
    const candidates = async () =>
      (await conductor.getCorrelated(name, correlationId))
        .filter((workflow) => USABLE_STATUSES.has(workflow.status) && matches(workflow))
        .sort((a, b) => (a.createTime ?? 0) - (b.createTime ?? 0) || String(a.workflowId).localeCompare(String(b.workflowId)));

    const existing = await candidates();
    if (existing.length > 0) return existing[0].workflowId;

    let startedId;
    try {
      startedId = await conductor.startWorkflow({ name, correlationId, input });
    } catch (error) {
      if (!error.unavailable) throw error;
      // The answer was lost, but the start may still have gone through.
      const recovered = await candidates().catch(() => []);
      if (recovered.length === 0) throw error;
      return recovered[0].workflowId;
    }
    let winnerId = startedId;
    try {
      const after = await candidates();
      if (after.length > 0) winnerId = after[0].workflowId;
      if (winnerId !== startedId) await conductor.terminateWorkflow(startedId, 'Duplicate submission; an earlier execution handles this request');
    } catch (error) {
      // The workflow is started; failing to double-check must not lose it.
      console.error(`Duplicate check after starting ${name} ${startedId} failed: ${error.message}`);
      return startedId;
    }
    return winnerId;
  }

  function dedupe(key, task) {
    if (inFlight.has(key)) return inFlight.get(key);
    const promise = task().finally(() => inFlight.delete(key));
    inFlight.set(key, promise);
    return promise;
  }

  // Polls a started workflow until it settles or the deadline passes. Returns
  // the last state seen, or null if Conductor never answered: the workflow is
  // running either way, so a slow or failing poll is not an error.
  async function waitUntilSettled(workflowId, deadline) {
    let latest = null;
    for (;;) {
      try {
        latest = (await conductor.getWorkflow(workflowId, { includeTasks: false })) ?? latest;
      } catch (error) {
        if (!(error instanceof ConductorError)) throw error;
        console.error(`[conductor] poll of ${workflowId} failed: ${error.message}`);
      }
      if ((latest && !isActive(latest)) || Date.now() >= deadline) return latest;
      await sleep(pollIntervalMs);
    }
  }

  async function loadOwned(workflowId, expectedName, includeTasks) {
    if (!ID_PATTERN.test(workflowId)) return null;
    const workflow = await conductor.getWorkflow(workflowId, { includeTasks });
    return workflow && workflow.workflowName === expectedName ? workflow : null;
  }

  // ------------------------------------------------------------- handlers

  async function getHealth() {
    const [checkout, returns] = await Promise.all([
      conductor.getWorkflowDefinition(CHECKOUT_WORKFLOW),
      conductor.getWorkflowDefinition(RETURN_WORKFLOW),
    ]);
    const registered = Boolean(checkout && returns);
    return json(registered ? 200 : 503, {
      ok: registered,
      conductor: 'reachable',
      workflows: { [CHECKOUT_WORKFLOW]: Boolean(checkout), [RETURN_WORKFLOW]: Boolean(returns) },
    });
  }

  async function postCheckout(rawBody) {
    const deadline = Date.now() + config.checkoutWaitMs;
    const body = parseBody(rawBody);
    const checkoutId = body.checkoutId === undefined ? randomUUID() : body.checkoutId;
    if (typeof checkoutId !== 'string' || !CLIENT_KEY_PATTERN.test(checkoutId)) {
      throw new HttpError(400, 'checkoutId must be 8-64 letters, digits or dashes.');
    }
    const customerName = body.customerName === undefined ? '' : body.customerName;
    if (typeof customerName !== 'string' || customerName.length > 80) throw new HttpError(400, 'customerName must be text of at most 80 characters.');
    if (!Array.isArray(body.items)) throw new HttpError(400, 'items must be a list (an empty list is allowed).');
    if (body.items.length > MAX_CART_LINES) throw new HttpError(400, `A cart can hold at most ${MAX_CART_LINES} lines.`);

    const quantities = new Map();
    for (const item of body.items) {
      if (item === null || typeof item !== 'object') throw new HttpError(400, 'Each item must be an object with productId and quantity.');
      const product = typeof item.productId === 'string' ? findProduct(item.productId) : null;
      if (!product) throw new HttpError(400, `Unknown product: ${JSON.stringify(item.productId ?? null)}.`);
      const total = (quantities.get(product.id) || 0) + quantityOf(item.quantity, `Quantity of ${product.id}`);
      if (total > MAX_QUANTITY) throw new HttpError(400, `Quantity of ${product.id} must not exceed ${MAX_QUANTITY}.`);
      quantities.set(product.id, total);
    }
    const items = [...quantities].map(([productId, quantity]) => {
      const product = findProduct(productId);
      return { productId, name: product.name, emoji: product.emoji, unitPriceCents: product.priceCents, quantity };
    });

    const correlationId = `checkout:${checkoutId}`;
    const orderId = await dedupe(`${CHECKOUT_WORKFLOW}|${correlationId}`, () =>
      startOnce({
        name: CHECKOUT_WORKFLOW,
        correlationId,
        input: { checkoutId, customerName: customerName.trim(), items, chaosSeed: chaosSeed() },
      }));

    const workflow = await waitUntilSettled(orderId, deadline);
    if (!workflow) return json(202, { orderId, status: 'PROCESSING', placedAt: null, order: null, returns: [] });
    const view = toOrderView(workflow);
    if (view.status === 'CONFIRMED') return json(200, view);
    if (view.status === 'PROCESSING') return json(202, view);
    return json(502, { error: view.problem, code: 'CHECKOUT_WORKFLOW_FAILED', orderId: view.orderId });
  }

  async function getOrder(orderId) {
    const workflow = await loadOwned(orderId, CHECKOUT_WORKFLOW, false);
    if (!workflow) throw new HttpError(404, 'No such order.');
    const returns = await conductor.getCorrelated(RETURN_WORKFLOW, `order:${orderId}`);
    return json(200, toOrderView(workflow, returns));
  }

  async function postReturn(rawBody) {
    const body = parseBody(rawBody);
    const { orderId, productId, reason } = body;
    if (typeof orderId !== 'string' || !ID_PATTERN.test(orderId)) throw new HttpError(400, 'orderId is required.');
    if (typeof productId !== 'string' || !ID_PATTERN.test(productId)) throw new HttpError(400, 'productId is required.');
    const quantity = quantityOf(body.quantity, 'quantity');
    if (!RETURN_REASONS.some((known) => known.id === reason)) {
      throw new HttpError(400, `reason must be one of: ${RETURN_REASONS.map((known) => known.id).join(', ')}.`);
    }
    const requestId = body.requestId === undefined ? randomUUID() : body.requestId;
    if (typeof requestId !== 'string' || !CLIENT_KEY_PATTERN.test(requestId)) {
      throw new HttpError(400, 'requestId must be 8-64 letters, digits or dashes.');
    }
    const rawAnswers = body.answers !== null && typeof body.answers === 'object' ? body.answers : {};
    const answers = {
      regretLevel: Number.isInteger(rawAnswers.regretLevel) ? Math.min(10, Math.max(1, rawAnswers.regretLevel)) : 5,
      triedLikingIt: rawAnswers.triedLikingIt === true,
    };

    const correlationId = `order:${orderId}`;
    // Returns of one order are handled one at a time so that each sees the
    // units the previous ones already claimed.
    const returnId = await withLock(correlationId, async () => {
      const order = await loadOwned(orderId, CHECKOUT_WORKFLOW, false);
      const confirmed = order?.status === 'COMPLETED' ? order.output?.order : null;
      const orderState = !order ? 'NOT_FOUND' : confirmed ? 'FOUND' : 'NOT_CONFIRMED';
      const earlier = (await conductor.getCorrelated(RETURN_WORKFLOW, correlationId)).filter((workflow) => workflow.input?.requestId !== requestId);

      return startOnce({
        name: RETURN_WORKFLOW,
        correlationId,
        matches: (workflow) => workflow.input?.requestId === requestId,
        input: {
          requestId,
          orderId,
          orderState,
          orderNumber: confirmed?.orderNumber ?? null,
          orderLines: (confirmed?.lines ?? []).map((line) => ({
            productId: line.productId, name: line.name, quantity: line.quantity, unitPriceCents: line.unitPriceCents,
          })),
          productId,
          quantity,
          alreadyReturnedQty: countReturnedUnits(earlier, productId),
          reason,
          answers,
          chaosSeed: chaosSeed(),
        },
      });
    });

    // The return is started; if its state cannot be read right now, say so
    // rather than report a failure. The storefront polls GET /api/returns/{id}.
    const workflow = await conductor.getWorkflow(returnId, { includeTasks: true }).catch(() => null);
    if (!workflow) {
      return json(202, {
        returnId, orderId, productId, quantity, status: 'IN_REVIEW', stage: 'POINTLESS_CHECKS',
        submittedAt: null, checks: [], totalChecks: TOTAL_POINTLESS_CHECKS, decision: null,
      });
    }
    return json(202, toReturnView(workflow));
  }

  async function getReturn(returnId) {
    const workflow = await loadOwned(returnId, RETURN_WORKFLOW, true);
    if (!workflow) throw new HttpError(404, 'No such return.');
    return json(200, toReturnView(workflow));
  }

  // Ends the manager's 4-second lunch early. It never changes the decision.
  async function postNudge(returnId) {
    const workflow = await loadOwned(returnId, RETURN_WORKFLOW, true);
    if (!workflow) throw new HttpError(404, 'No such return.');
    const manager = (workflow.tasks || []).find((task) => task.referenceTaskName === MANAGER_REVIEW_TASK);
    if (!isActive(workflow) || !manager || manager.status !== 'IN_PROGRESS') {
      throw new HttpError(409, 'The manager is not reviewing this return right now.', 'NOT_WITH_MANAGER');
    }
    await conductor.completeTask(returnId, MANAGER_REVIEW_TASK, { nudged: true });
    return json(202, { returnId, nudged: true });
  }

  const routes = [
    ['GET', /^\/api\/health$/, () => getHealth()],
    ['GET', /^\/api\/products$/, () => json(200, { products: PRODUCTS, returnReasons: RETURN_REASONS }, { 'cache-control': 'public, max-age=60' })],
    ['POST', /^\/api\/checkout$/, (_match, body) => postCheckout(body)],
    ['GET', /^\/api\/orders\/([^/]+)$/, (match) => getOrder(match[1])],
    ['POST', /^\/api\/returns$/, (_match, body) => postReturn(body)],
    ['GET', /^\/api\/returns\/([^/]+)$/, (match) => getReturn(match[1])],
    ['POST', /^\/api\/returns\/([^/]+)\/nudge$/, (match) => postNudge(match[1])],
  ];

  return async function handle({ method, path, body }) {
    const verb = String(method || 'GET').toUpperCase();
    const cleanPath = String(path || '/').replace(/\/+$/, '') || '/';
    try {
      if (verb === 'OPTIONS') return { status: 204, headers: corsHeaders, body: '' };
      let pathMatched = false;
      for (const [routeMethod, pattern, handler] of routes) {
        const match = pattern.exec(cleanPath);
        if (!match) continue;
        pathMatched = true;
        if (routeMethod === verb) return await handler(match, body);
      }
      if (pathMatched) return json(405, { error: `${verb} is not allowed on ${cleanPath}.` });
      return json(404, { error: `No such endpoint: ${cleanPath}.` });
    } catch (error) {
      if (error instanceof HttpError) return json(error.status, { error: error.message, ...(error.code ? { code: error.code } : {}) });
      if (error instanceof ConductorError) {
        console.error(`[conductor] ${error.message}`);
        return error.unavailable
          ? json(503, { error: 'The workflow engine (Conductor) did not answer, so this could not be processed right now. Trying again with the same checkoutId or requestId is safe: it is never processed twice.', code: 'CONDUCTOR_UNAVAILABLE' })
          : json(502, { error: 'The workflow engine (Conductor) rejected the request.', code: 'CONDUCTOR_ERROR' });
      }
      console.error(error);
      return json(500, { error: 'Unexpected server error.' });
    }
  };
}
