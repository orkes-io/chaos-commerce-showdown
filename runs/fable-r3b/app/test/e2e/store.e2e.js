// End-to-end checks against the running store and the real Conductor server.
// Start the store first (npm start), then: npm run test:e2e
// STORE_URL overrides http://localhost:3000.
import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { loadConfig } from '../../backend/src/config.js';
import { ConductorClient } from '../../backend/src/conductor.js';

const STORE = (process.env.STORE_URL || 'http://localhost:3000').replace(/\/+$/, '');
const config = loadConfig();
const conductor = new ConductorClient({ baseUrl: config.conductorUrl, authKey: config.conductorAuthKey, authSecret: config.conductorAuthSecret });
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function call(method, path, body) {
  const response = await fetch(`${STORE}/api${path}`, {
    method,
    headers: body ? { 'content-type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: response.status, data: await response.json() };
}

// 200 = confirmed; 202 = still running, so poll the order as the storefront does.
async function checkout(items, customerName = 'E2E Tester') {
  const response = await call('POST', '/checkout', { checkoutId: randomUUID(), customerName, items });
  assert.ok(response.status === 200 || response.status === 202, `HTTP ${response.status}: ${JSON.stringify(response.data)}`);
  let view = response.data;
  for (const deadline = Date.now() + 90000; view.status === 'PROCESSING';) {
    assert.ok(Date.now() < deadline, `order ${view.orderId} was still processing after 90 s`);
    await sleep(500);
    ({ data: view } = await call('GET', `/orders/${view.orderId}`));
  }
  return view;
}

async function decided(returnId, timeoutMs = 20000) {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const { data } = await call('GET', `/returns/${returnId}`);
    if (data.status !== 'IN_REVIEW') return data;
    assert.ok(Date.now() < deadline, `return ${returnId} was still undecided after ${timeoutMs} ms`);
    await sleep(400);
  }
}

async function settled(workflowId, timeoutMs = 20000) {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const workflow = await conductor.getWorkflow(workflowId);
    if (workflow.status !== 'RUNNING') return workflow;
    assert.ok(Date.now() < deadline, `workflow ${workflowId} was still running after ${timeoutMs} ms`);
    await sleep(400);
  }
}

test('the storefront and the API are being served', async () => {
  const page = await fetch(`${STORE}/`);
  assert.equal(page.status, 200);
  assert.match(await page.text(), /Chaos Commerce/);
  const health = await call('GET', '/health');
  assert.deepEqual(health.data, { ok: true, conductor: 'reachable', workflows: { chaos_checkout: true, chaos_return: true } });
});

test('checkout completes as a Conductor workflow, and the receipt adds up', async () => {
  const view = await checkout([{ productId: 'yacht', quantity: 3 }, { productId: 'paperclip', quantity: 99 }, { productId: 'usb-rock', quantity: 1 }]);
  assert.equal(view.status, 'CONFIRMED');
  const { order } = view;
  assert.equal(order.subtotalCents, 3 * 3 + 99 * 129999900 + 6499);
  assert.equal(order.lines.reduce((sum, line) => sum + line.lineTotalCents, 0), order.subtotalCents);
  assert.equal(order.totalCents, order.subtotalCents + order.fees.reduce((sum, fee) => sum + fee.amountCents, 0));
  assert.equal(order.payment.amountCents, order.totalCents);
  assert.equal(order.payment.attempts.at(-1).approved, true);
  assert.equal(order.shipment.parcels.length, 3);

  const workflow = await conductor.getWorkflow(view.orderId);
  assert.equal(workflow.workflowName, 'chaos_checkout');
  assert.equal(workflow.status, 'COMPLETED');
  assert.deepEqual(workflow.output.order, order);
});

test('twenty checkouts at once all complete, including an empty cart', async () => {
  const carts = Array.from({ length: 19 }, (_, index) => [{ productId: ['aa-battery', 'left-sock', 'wifi-water', 'jar-of-air', 'half-ladder'][index % 5], quantity: 1 + (index % 4) }]);
  carts.push([]);
  const views = await Promise.all(carts.map((items) => checkout(items)));
  for (const view of views) {
    assert.equal(view.status, 'CONFIRMED');
    assert.equal(view.order.payment.approved, true);
  }
  assert.equal(views.at(-1).order.itemCount, 0);
  assert.equal(new Set(views.map((view) => view.orderId)).size, 20);
});

test('repeating a checkout returns the same order', async () => {
  const body = { checkoutId: randomUUID(), customerName: 'Twice', items: [{ productId: 'left-sock', quantity: 1 }] };
  const [first, second] = await Promise.all([call('POST', '/checkout', body), call('POST', '/checkout', body)]);
  const third = await call('POST', '/checkout', body);
  assert.equal(first.data.orderId, second.data.orderId);
  assert.equal(first.data.orderId, third.data.orderId);
  assert.equal((await conductor.getCorrelated('chaos_checkout', `checkout:${body.checkoutId}`)).length, 1);
});

test('returns reach a decision for every policy outcome', async () => {
  const order = await checkout([{ productId: 'left-sock', quantity: 3 }, { productId: 'usb-rock', quantity: 1 }]);
  const request = (overrides) => call('POST', '/returns', { orderId: order.orderId, productId: 'left-sock', quantity: 1, reason: 'arrived_on_fire', answers: { regretLevel: 8, triedLikingIt: false }, ...overrides });

  const approved = await request({});
  assert.equal(approved.status, 202);
  const approvedView = await decided(approved.data.returnId);
  assert.equal(approvedView.status, 'DECIDED');
  assert.deepEqual([approvedView.decision.decision, approvedView.decision.refundCents], ['APPROVED', 8900]);
  assert.equal(approvedView.checks.length, 7);
  assert.match(approvedView.decision.managerNote, /at lunch/);

  const credit = await decided((await request({ reason: 'changed_mind', quantity: 2 })).data.returnId);
  assert.deepEqual([credit.decision.decision, credit.decision.refundCents], ['STORE_CREDIT', 17800]);

  const nothingLeft = await decided((await request({})).data.returnId);
  assert.deepEqual([nothingLeft.decision.decision, nothingLeft.decision.code], ['DENIED', 'NOTHING_LEFT_TO_RETURN']);

  const works = await decided((await request({ productId: 'usb-rock', reason: 'works_fine' })).data.returnId);
  assert.deepEqual([works.decision.decision, works.decision.code], ['DENIED', 'PRODUCT_WORKS']);

  const notBought = await decided((await request({ productId: 'yacht' })).data.returnId);
  assert.deepEqual([notBought.decision.decision, notBought.decision.code], ['DENIED', 'ITEM_NOT_IN_ORDER']);

  const noOrder = await decided((await request({ orderId: randomUUID() })).data.returnId);
  assert.deepEqual([noOrder.decision.decision, noOrder.decision.code], ['DENIED', 'ORDER_NOT_FOUND']);

  const workflow = await conductor.getWorkflow(approved.data.returnId);
  assert.equal(workflow.workflowName, 'chaos_return');
  assert.equal(workflow.status, 'COMPLETED');

  const { data: orderView } = await call('GET', `/orders/${order.orderId}`);
  assert.deepEqual(orderView.returns.map((entry) => entry.decision).sort(), ['APPROVED', 'DENIED', 'DENIED', 'DENIED', 'STORE_CREDIT']);
});

test('nudging the manager ends the wait early and changes nothing else', async () => {
  const order = await checkout([{ productId: 'half-ladder', quantity: 1 }]);
  const { data: created } = await call('POST', '/returns', { orderId: order.orderId, productId: 'half-ladder', quantity: 1, reason: 'became_sentient' });
  let nudge;
  for (let tries = 0; tries < 20; tries++) {
    nudge = await call('POST', `/returns/${created.returnId}/nudge`, {});
    if (nudge.status !== 409) break;
    await sleep(150);
  }
  assert.equal(nudge.status, 202);
  const view = await decided(created.returnId);
  assert.equal(view.decision.decision, 'APPROVED');
  assert.match(view.decision.managerNote, /woken up/);
  assert.equal((await call('POST', `/returns/${created.returnId}/nudge`, {})).status, 409);
});

test('both workflows finish even when started directly with nonsense input', async () => {
  const inputs = [{}, { items: 'lots', chaosSeed: 'banana', customerName: 42 }, { items: [null, 7, { quantity: -1 }], orderLines: {}, quantity: 'many', answers: 'no' }];
  for (const input of inputs) {
    const order = await settled(await conductor.startWorkflow({ name: 'chaos_checkout', correlationId: 'e2e:nonsense', input }));
    assert.equal(order.status, 'COMPLETED', order.reasonForIncompletion);
    assert.equal(order.output.order.payment.approved, true);
    assert.equal(order.output.order.totalCents, order.output.order.feesCents);

    const returned = await settled(await conductor.startWorkflow({ name: 'chaos_return', correlationId: 'e2e:nonsense', input }));
    assert.equal(returned.status, 'COMPLETED', returned.reasonForIncompletion);
    assert.equal(returned.output.return.decision, 'DENIED');
  }
});
