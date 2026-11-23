import test from 'node:test';
import assert from 'node:assert/strict';
import { handler } from '../src/lambda.mjs';

function makeV2Event(method, path, bodyObj) {
  return {
    rawPath: path,
    requestContext: { http: { method } },
    headers: { 'content-type': 'application/json' },
    body: bodyObj ? JSON.stringify(bodyObj) : undefined,
  };
}

test('CORS preflight returns 204 with CORS headers via Lambda handler', async () => {
  const res = await handler(makeV2Event('OPTIONS', '/api/products'));
  assert.equal(res.statusCode, 204);
  assert.ok(res.headers['Access-Control-Allow-Origin']);
});

test('GET /api/health confirms Conductor reachability and zero AI APIs', async () => {
  const res = await handler(makeV2Event('GET', '/api/health'));
  assert.equal(res.statusCode, 200);
  const data = JSON.parse(res.body);
  assert.equal(data.status, 'ok');
  assert.equal(data.aiApisUsedAtRuntime, false);
  assert.equal(data.conductor.reachable, true);
  assert.equal(data.conductor.workflowsRegistered.checkout, true);
  assert.equal(data.conductor.workflowsRegistered.returns, true);
});

test('GET /api/products returns absurd catalog with 5-star fury and 2-star praise', async () => {
  const res = await handler(makeV2Event('GET', '/api/products'));
  assert.equal(res.statusCode, 200);
  const data = JSON.parse(res.body);
  assert.ok(data.products.length >= 8);
  const ice = data.products.find((p) => p.id === 'artisanal-ice-cube');
  assert.ok(ice);
  assert.equal(ice.price, 499.99);
  assert.ok(ice.reviews.some((r) => r.rating === 5));
  assert.ok(ice.reviews.some((r) => r.rating === 2));
});

test('POST /api/checkout executes chaos_checkout_workflow on Conductor and completes', async () => {
  const res = await handler(
    makeV2Event('POST', '/api/checkout', {
      customerName: 'Test Shopper',
      customerEmail: 'test@example.com',
      shippingAddress: '404 Regret Ave',
      items: [{ id: 'artisanal-ice-cube', quantity: 1 }],
      promoCode: 'CHAOS10',
      tipPercent: 20,
      paymentMethodLabel: 'Imaginary Platinum Card',
    }),
  );
  assert.equal(res.statusCode, 201);
  const data = JSON.parse(res.body);
  assert.equal(data.order.status, 'COMPLETED');
  assert.ok(data.order.workflowId);
  assert.equal(data.order.receipt.status, 'CONFIRMED');
  assert.equal(data.order.receipt.fees.promoAudacityFee, 19.99);
  assert.ok(data.order.receipt.grandTotal > 499.99);
  assert.ok(data.order.tasks.length >= 6);
});

test('POST /api/returns executes chaos_return_workflow on Conductor and reaches a decision', async () => {
  // Full refund scenario
  const fullRes = await handler(
    makeV2Event('POST', '/api/returns', {
      orderId: 'CHAOS-ORD-TEST1',
      customerName: 'Polite Victim',
      itemName: 'Artisanal Single Organic Ice Cube',
      orderTotal: 700.92,
      reasonCode: 'MELTED',
      reasonText: 'It arrived as lukewarm dampness in an envelope.',
      lunarPhase: 'Full Moon',
      staredAtProduct: false,
      keptOriginalAir: true,
      apologyToCeo: 'I am terribly sorry about your yacht please forgive me.',
    }),
  );
  assert.equal(fullRes.statusCode, 201);
  const fullData = JSON.parse(fullRes.body);
  assert.equal(fullData.returnRequest.status, 'COMPLETED');
  assert.equal(fullData.returnRequest.decision.decision, 'APPROVED');
  assert.equal(fullData.returnRequest.decision.decisionCode, 'APPROVED_FULL_REFUND');
  assert.equal(fullData.returnRequest.decision.stampsCompleted, 3);

  // Denial scenario
  const denyRes = await handler(
    makeV2Event('POST', '/api/returns', {
      orderId: 'CHAOS-ORD-TEST2',
      customerName: 'Angry Victim',
      itemName: 'Empty Luxury Cardboard Box',
      orderTotal: 2450,
      reasonCode: 'TOO_EXPENSIVE',
      reasonText: 'Overpriced!',
      lunarPhase: 'Mercury in Retrograde',
      staredAtProduct: true,
      keptOriginalAir: false,
      apologyToCeo: 'no',
    }),
  );
  assert.equal(denyRes.statusCode, 201);
  const denyData = JSON.parse(denyRes.body);
  assert.equal(denyData.returnRequest.status, 'COMPLETED');
  assert.equal(denyData.returnRequest.decision.decision, 'DENIED');
  assert.equal(denyData.returnRequest.decision.decisionCode, 'DENIED_WITH_CONDOLENCES');
});

test('API Gateway REST v1 event format works for POST /api/support/chat', async () => {
  const res = await handler({
    httpMethod: 'POST',
    path: '/prod/api/support/chat',
    headers: {},
    body: JSON.stringify({ message: 'Can I get a refund?' }),
  });
  assert.equal(res.statusCode, 200);
  const data = JSON.parse(res.body);
  assert.ok(data.reply.toLowerCase().includes('return'));
});
