import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../backend/src/app.js';
import { loadConfig, normalizeConductorUrl } from '../backend/src/config.js';
import { ConductorClient, ConductorError } from '../backend/src/conductor.js';

// In-memory stand-in for the Conductor API. Checkouts complete at once;
// returns stay RUNNING until decide() is called.
class FakeConductor {
  constructor() {
    this.workflows = new Map();
    this.started = [];
    this.terminated = [];
    this.signals = [];
    this.down = false;
    this.clock = 1000;
  }

  #check() {
    if (this.down) throw new ConductorError('Conductor is unreachable', { unavailable: true });
  }

  async startWorkflow({ name, correlationId, input }) {
    this.#check();
    await new Promise((resolve) => setImmediate(resolve));
    const workflowId = `wf-${String(this.workflows.size + 1).padStart(4, '0')}`;
    const workflow = { workflowId, workflowName: name, correlationId, input, status: 'RUNNING', createTime: this.clock++, output: {}, tasks: [] };
    if (name === 'chaos_checkout') {
      workflow.status = 'COMPLETED';
      workflow.output = {
        order: {
          orderNumber: `CC-${workflowId}`,
          lines: input.items.map((item) => ({ ...item, lineTotalCents: item.unitPriceCents * item.quantity })),
        },
      };
    } else {
      workflow.tasks = [{ referenceTaskName: 'manager_review', status: 'IN_PROGRESS' }];
    }
    this.workflows.set(workflowId, workflow);
    this.started.push(workflow);
    return workflowId;
  }

  decide(workflowId, decision) {
    const workflow = this.workflows.get(workflowId);
    workflow.status = 'COMPLETED';
    workflow.output = { return: { decision, checks: [] } };
  }

  async getWorkflow(workflowId) {
    this.#check();
    return this.workflows.get(workflowId) ?? null;
  }

  async getCorrelated(name, correlationId) {
    this.#check();
    return [...this.workflows.values()].filter((workflow) => workflow.workflowName === name && workflow.correlationId === correlationId);
  }

  async terminateWorkflow(workflowId) {
    this.workflows.get(workflowId).status = 'TERMINATED';
    this.terminated.push(workflowId);
  }

  async completeTask(workflowId, taskReferenceName, output) {
    this.signals.push({ workflowId, taskReferenceName, output });
  }

  async getWorkflowDefinition(name) {
    this.#check();
    return { name };
  }
}

function setup(env = {}) {
  const conductor = new FakeConductor();
  const app = createApp({ config: loadConfig({ CHECKOUT_WAIT_MS: '200', ...env }), conductor, pollIntervalMs: 5 });
  const call = async (method, path, body) => {
    const response = await app({ method, path, body: body === undefined ? '' : typeof body === 'string' ? body : JSON.stringify(body) });
    return { status: response.status, headers: response.headers, data: response.body ? JSON.parse(response.body) : null };
  };
  return { conductor, call };
}

const CART = { checkoutId: 'checkout-0001', customerName: 'Jordan', items: [{ productId: 'yacht', quantity: 2 }] };

test('config: Conductor URL comes from the environment, with or without /api', () => {
  assert.equal(loadConfig({}).conductorUrl, 'http://localhost:8080/api');
  assert.equal(normalizeConductorUrl('https://conductor.example.com'), 'https://conductor.example.com/api');
  assert.equal(normalizeConductorUrl('https://conductor.example.com/api/'), 'https://conductor.example.com/api');
  assert.equal(normalizeConductorUrl('http://[REDACTED:ipv4]:8080/custom/api'), 'http://[REDACTED:ipv4]:8080/custom/api');
  assert.throws(() => normalizeConductorUrl('not a url'), /not a valid URL/);
  assert.throws(() => loadConfig({ PORT: 'abc' }), /PORT/);
});

test('checkout: starts the workflow with catalogue prices, never the client\'s', async () => {
  const { conductor, call } = setup();
  const response = await call('POST', '/api/checkout', { ...CART, items: [{ productId: 'yacht', quantity: 2, unitPriceCents: 0, name: 'Free yacht' }] });
  assert.equal(response.status, 200);
  assert.equal(response.data.status, 'CONFIRMED');
  const [started] = conductor.started;
  assert.equal(started.workflowName, 'chaos_checkout');
  assert.equal(started.correlationId, 'checkout:checkout-0001');
  assert.deepEqual(started.input.items, [{ productId: 'yacht', name: 'Luxury Superyacht (Slightly Used, Location Unknown)', emoji: '🛥️', unitPriceCents: 3, quantity: 2 }]);
  assert.ok(Number.isInteger(started.input.chaosSeed) && started.input.chaosSeed > 0);
});

test('checkout: the same checkoutId never creates a second order', async () => {
  const { conductor, call } = setup();
  const [first, second] = await Promise.all([call('POST', '/api/checkout', CART), call('POST', '/api/checkout', CART)]);
  const third = await call('POST', '/api/checkout', CART);
  assert.equal(conductor.started.length, 1);
  assert.equal(first.data.orderId, second.data.orderId);
  assert.equal(first.data.orderId, third.data.orderId);
});

test('checkout: a duplicate started by another backend instance loses to the earlier one', async () => {
  const { conductor, call } = setup();
  const originalStart = conductor.startWorkflow.bind(conductor);
  let raced = false;
  conductor.startWorkflow = async (request) => {
    if (!raced) {
      raced = true;
      await originalStart(request); // the other instance gets in first
    }
    return originalStart(request);
  };
  const response = await call('POST', '/api/checkout', CART);
  assert.equal(response.data.orderId, 'wf-0001');
  assert.deepEqual(conductor.terminated, ['wf-0002']);
});

test('checkout: an empty cart is allowed, merged lines are capped, bad input is rejected', async () => {
  const { conductor, call } = setup();
  assert.equal((await call('POST', '/api/checkout', { checkoutId: 'empty-cart-1', items: [] })).status, 200);
  const merged = await call('POST', '/api/checkout', { checkoutId: 'merged-cart-1', items: [{ productId: 'yacht', quantity: 1 }, { productId: 'yacht', quantity: 3 }] });
  assert.equal(merged.data.order.lines[0].quantity, 4);
  const startedBefore = conductor.started.length;
  const bad = [
    'not json',
    '[]',
    {},
    { items: 'yacht' },
    { items: [{ productId: 'time-machine', quantity: 1 }] },
    { items: [{ productId: 'yacht', quantity: 0 }] },
    { items: [{ productId: 'yacht', quantity: 1.5 }] },
    { items: [{ productId: 'yacht', quantity: 60 }, { productId: 'yacht', quantity: 60 }] },
    { items: [null] },
    { items: [], checkoutId: 'x' },
    { items: [], customerName: 'x'.repeat(81) },
    { items: Array.from({ length: 26 }, () => ({ productId: 'yacht', quantity: 1 })) },
  ];
  for (const body of bad) {
    const response = await call('POST', '/api/checkout', body);
    assert.equal(response.status, 400, JSON.stringify(body));
    assert.ok(response.data.error);
  }
  assert.equal(conductor.started.length, startedBefore);
});

test('checkout: answers 202 while the workflow is still running, 503 when Conductor is down', async () => {
  const { conductor, call } = setup();
  const originalStart = conductor.startWorkflow.bind(conductor);
  conductor.startWorkflow = async (request) => {
    const id = await originalStart(request);
    conductor.workflows.get(id).status = 'RUNNING';
    return id;
  };
  const slow = await call('POST', '/api/checkout', CART);
  assert.equal(slow.status, 202);
  assert.equal(slow.data.status, 'PROCESSING');

  conductor.down = true;
  const down = await call('POST', '/api/checkout', { ...CART, checkoutId: 'checkout-0002' });
  assert.equal(down.status, 503);
  assert.equal(down.data.code, 'CONDUCTOR_UNAVAILABLE');
  assert.equal((await call('GET', '/api/health')).status, 503);
});

test('checkout: a lost answer from Conductor does not lose or duplicate the order', async () => {
  const { conductor, call } = setup();
  const originalStart = conductor.startWorkflow.bind(conductor);
  conductor.startWorkflow = async (request) => {
    await originalStart(request);
    throw new ConductorError('timed out', { unavailable: true });
  };
  const response = await call('POST', '/api/checkout', CART);
  assert.equal(response.status, 200, 'the order that did start is found by its checkoutId');
  assert.equal(response.data.orderId, 'wf-0001');
  assert.equal(conductor.started.length, 1);

  // Started, but its state cannot be read: processing, not failed.
  const { conductor: flaky, call: callFlaky } = setup();
  flaky.getWorkflow = async () => { throw new ConductorError('timed out', { unavailable: true }); };
  const pending = await callFlaky('POST', '/api/checkout', CART);
  assert.equal(pending.status, 202);
  assert.deepEqual([pending.data.orderId, pending.data.status], ['wf-0001', 'PROCESSING']);

  const { conductor: flakyReturns, call: callReturns } = setup();
  flakyReturns.getWorkflow = async () => { throw new ConductorError('timed out', { unavailable: true }); };
  const started = await callReturns('POST', '/api/returns', { orderId: 'wf-0009', productId: 'yacht', quantity: 1, reason: 'other' });
  assert.equal(started.status, 503, 'the order could not be looked up, so no return was started');
  assert.equal(flakyReturns.started.length, 0);
});

test('orders: only checkout executions are visible', async () => {
  const { conductor, call } = setup();
  const { data: order } = await call('POST', '/api/checkout', CART);
  assert.equal((await call('GET', `/api/orders/${order.orderId}`)).status, 200);
  const returned = await call('POST', '/api/returns', { orderId: order.orderId, productId: 'yacht', quantity: 1, reason: 'other' });
  assert.equal((await call('GET', `/api/orders/${returned.data.returnId}`)).status, 404);
  assert.equal((await call('GET', `/api/returns/${order.orderId}`)).status, 404);
  assert.equal((await call('GET', '/api/orders/..%2F..%2Fmetadata')).status, 404);
  assert.equal(conductor.started.length, 2);
});

test('returns: each return sees the units earlier returns already claimed', async () => {
  const { conductor, call } = setup();
  const { data: order } = await call('POST', '/api/checkout', CART);
  const request = (quantity, requestId) => call('POST', '/api/returns', { orderId: order.orderId, productId: 'yacht', quantity, reason: 'arrived_on_fire', requestId });

  const [first, second] = await Promise.all([request(1, 'request-0001'), request(1, 'request-0002')]);
  assert.equal(first.status, 202);
  const inputs = () => conductor.started.filter((workflow) => workflow.workflowName === 'chaos_return').map((workflow) => workflow.input);
  assert.deepEqual(inputs().map((input) => input.alreadyReturnedQty), [0, 1], 'a return still in review counts');
  assert.equal(inputs()[0].orderState, 'FOUND');
  assert.deepEqual(inputs()[0].orderLines, [{ productId: 'yacht', name: 'Luxury Superyacht (Slightly Used, Location Unknown)', quantity: 2, unitPriceCents: 3 }]);

  conductor.decide(first.data.returnId, 'APPROVED');
  conductor.decide(second.data.returnId, 'DENIED');
  await request(1, 'request-0003');
  assert.equal(inputs()[2].alreadyReturnedQty, 1, 'approved units count, denied ones do not');

  const repeat = await request(1, 'request-0003');
  assert.equal(inputs().length, 3, 'a repeated requestId reuses the same return');
  assert.equal(repeat.data.returnId, conductor.started.at(-1).workflowId);

  const { data: orderView } = await call('GET', `/api/orders/${order.orderId}`);
  assert.deepEqual(orderView.returns.map((entry) => entry.decision), ['APPROVED', 'DENIED', null]);
});

test('returns: an unknown order still gets a workflow, which will decide', async () => {
  const { conductor, call } = setup();
  const response = await call('POST', '/api/returns', { orderId: 'no-such-order', productId: 'yacht', quantity: 1, reason: 'other' });
  assert.equal(response.status, 202);
  assert.equal(conductor.started[0].input.orderState, 'NOT_FOUND');
  assert.deepEqual(conductor.started[0].input.orderLines, []);
});

test('returns: malformed requests are rejected before any workflow starts', async () => {
  const { conductor, call } = setup();
  const valid = { orderId: 'wf-0001', productId: 'yacht', quantity: 1, reason: 'other' };
  for (const patch of [{ orderId: undefined }, { orderId: '../x' }, { productId: 5 }, { quantity: 0 }, { quantity: '1' }, { reason: 'because' }, { requestId: 'short' }]) {
    assert.equal((await call('POST', '/api/returns', { ...valid, ...patch })).status, 400, JSON.stringify(patch));
  }
  assert.equal(conductor.started.length, 0);
});

test('returns: the manager can be nudged only while reviewing', async () => {
  const { conductor, call } = setup();
  const { data: created } = await call('POST', '/api/returns', { orderId: 'no-such-order', productId: 'yacht', quantity: 1, reason: 'other' });
  assert.equal(created.stage, 'MANAGER_REVIEW');
  assert.equal((await call('POST', `/api/returns/${created.returnId}/nudge`, {})).status, 202);
  assert.deepEqual(conductor.signals, [{ workflowId: created.returnId, taskReferenceName: 'manager_review', output: { nudged: true } }]);
  conductor.decide(created.returnId, 'DENIED');
  assert.equal((await call('POST', `/api/returns/${created.returnId}/nudge`, {})).status, 409);
  assert.equal((await call('GET', `/api/returns/${created.returnId}`)).data.decision.decision, 'DENIED');
});

test('http: CORS, unknown routes and wrong methods', async () => {
  const { call } = setup({ ALLOWED_ORIGIN: 'https://someone.github.io' });
  const preflight = await call('OPTIONS', '/api/checkout');
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers['access-control-allow-origin'], 'https://someone.github.io');
  const products = await call('GET', '/api/products');
  assert.equal(products.headers['access-control-allow-origin'], 'https://someone.github.io');
  assert.ok(products.data.products.length >= 5);
  for (const product of products.data.products) {
    assert.ok(Number.isInteger(product.priceCents) && product.priceCents > 0, product.id);
    assert.ok(product.reviews.some((review) => review.stars === 5) && product.reviews.some((review) => review.stars === 2), product.id);
  }
  assert.equal((await call('GET', '/api/nope')).status, 404);
  assert.equal((await call('GET', '/api/checkout')).status, 405);
});

test('conductor client: sends key/secret auth only when configured, and maps failures', async () => {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ path: new URL(url).pathname, headers: init.headers });
    if (String(url).endsWith('/token')) return new Response(JSON.stringify({ token: 'jwt-123' }), { status: 200 });
    if (String(url).includes('/workflow/missing')) return new Response(JSON.stringify({ message: 'nope' }), { status: 404 });
    if (String(url).includes('/workflow/boom')) return new Response('oops', { status: 500 });
    return new Response('"wf-1"', { status: 200 });
  };
  const secured = new ConductorClient({ baseUrl: 'https://c.example.com/api', authKey: 'key', authSecret: 'secret', fetchImpl });
  assert.equal(await secured.startWorkflow({ name: 'chaos_checkout', correlationId: 'c', input: {} }), 'wf-1');
  assert.deepEqual(calls.map((entry) => entry.path), ['/api/token', '/api/workflow']);
  assert.equal(calls[1].headers['x-authorization'], 'jwt-123');
  assert.equal(await secured.getWorkflow('missing'), null);
  await assert.rejects(secured.getWorkflow('boom'), (error) => error instanceof ConductorError && error.unavailable && error.status === 500);

  calls.length = 0;
  const open = new ConductorClient({ baseUrl: 'http://localhost:8080/api', fetchImpl });
  await open.startWorkflow({ name: 'chaos_checkout', correlationId: 'c', input: {} });
  assert.deepEqual(calls.map((entry) => entry.path), ['/api/workflow']);
  assert.equal(calls[0].headers['x-authorization'], undefined);

  const unreachable = new ConductorClient({ baseUrl: 'http://localhost:8080/api', fetchImpl: async () => { throw new TypeError('fetch failed'); } });
  await assert.rejects(unreachable.getWorkflow('x'), (error) => error.unavailable === true);
});

test('lambda handler: answers API Gateway HTTP API (payload v2) events', async () => {
  const { handler } = await import('../backend/src/lambda.js');
  const event = (method, rawPath, extra = {}) => ({ version: '2.0', rawPath, requestContext: { http: { method, path: rawPath } }, ...extra });

  const products = await handler(event('GET', '/api/products'));
  assert.equal(products.statusCode, 200);
  assert.equal(products.headers['access-control-allow-origin'], '*');
  assert.ok(JSON.parse(products.body).products.length >= 5);

  assert.equal((await handler(event('OPTIONS', '/api/checkout'))).statusCode, 204);
  const encoded = Buffer.from(JSON.stringify({ items: 'nope' })).toString('base64');
  const rejected = await handler(event('POST', '/api/checkout', { body: encoded, isBase64Encoded: true }));
  assert.equal(rejected.statusCode, 400);
  assert.match(JSON.parse(rejected.body).error, /items must be a list/);
});
