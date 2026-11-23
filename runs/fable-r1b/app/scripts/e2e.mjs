#!/usr/bin/env node
// End-to-end check against a running store (npm start) and the real Conductor server.
// Proves the two promises: every checkout completes, every return reaches a decision.
//   npm run e2e                      (STORE_URL defaults to http://localhost:3000)
import assert from "node:assert/strict";
import { loadDotEnv, sleep } from "./lib.mjs";

loadDotEnv();
const { loadConfig } = await import("../backend/src/config.mjs");
const store = (process.env.STORE_URL ?? "http://localhost:3000").replace(/\/+$/, "");
const conductor = loadConfig().conductorUrl;
const run = Date.now().toString(36).toUpperCase();

async function call(method, path, body) {
  const res = await fetch(`${store}/api${path}`, {
    method,
    headers: body === undefined ? {} : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body),
  });
  return { status: res.status, json: await res.json().catch(() => null) };
}

async function conductorStatus(workflowId) {
  const res = await fetch(`${conductor}/workflow/${workflowId}?includeTasks=false`);
  return (await res.json()).status;
}

async function waitFor(path, done, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const res = await call("GET", path);
    if (res.status === 200 && done(res.json)) return res.json;
    if (Date.now() > deadline) throw new Error(`timed out waiting for ${path} (last state: ${res.json?.state})`);
    await sleep(500);
  }
}

let passed = 0;
async function check(name, fn) {
  const started = Date.now();
  try {
    await fn();
    passed += 1;
    console.log(`  ok    ${name} (${((Date.now() - started) / 1000).toFixed(1)}s)`);
  } catch (error) {
    console.error(`  FAIL  ${name}\n        ${error.message}`);
    process.exitCode = 1;
  }
}

console.log(`Chaos Commerce e2e against ${store} (Conductor: ${conductor})`);

await check("health: Conductor reachable and both workflows registered", async () => {
  const res = await call("GET", "/health");
  assert.equal(res.status, 200);
  assert.deepEqual(res.json.conductor.workflowsRegistered, ["chaos_checkout", "chaos_returns"]);
});

const awkwardCarts = [
  { items: [{ id: "battery", qty: 2 }, { id: "used-candle", qty: 1 }], coupon: "SAVE10", shipping: "catapult", customer: { name: "Ada", email: "ada@example.com" } },
  {},
  { items: [] },
  { items: "everything, please" },
  { items: [null, 42, "sock", {}, { id: "no-such-product", qty: -7 }, { id: "brick", qty: "lots" }] },
  { items: [{ id: "used-candle", qty: 99 }] },
  { items: [{ id: "printer-ink", qty: 99 }], coupon: "x".repeat(500), shipping: { not: "a string" }, customer: "nobody" },
  { items: Array.from({ length: 200 }, () => ({ id: "left-sock", qty: 1 })), customer: { name: "<script>alert(1)</script>", email: null } },
];

await check(`checkout: ${awkwardCarts.length} awkward carts all end CONFIRMED in Conductor`, async () => {
  for (const [index, cart] of awkwardCarts.entries()) {
    const placed = await call("POST", "/checkout", { ...cart, orderId: `CC-E2E${run}A${index}` });
    assert.ok([201, 202].includes(placed.status), `cart ${index}: HTTP ${placed.status}`);
    const order = placed.json.complete ? placed.json : await waitFor(`/orders/${placed.json.orderId}`, (view) => view.complete, 30000);
    assert.equal(order.state, "CONFIRMED");
    assert.equal(order.confirmation.status, "CONFIRMED");
    assert.ok(order.confirmation.items.length >= 1, "an order always contains something");
    assert.ok(order.confirmation.total >= 0.01, "an order always costs something");
    assert.ok(["CARD", "IOU"].includes(order.confirmation.payment.method));
    assert.equal(await conductorStatus(order.conductor.workflowId), "COMPLETED");
  }
});

await check("checkout: 20 concurrent orders all complete, paid by card or settled by IOU", async () => {
  const results = await Promise.all(
    Array.from({ length: 20 }, (_, index) => call("POST", "/checkout", { orderId: `CC-E2E${run}B${index}`, items: [{ id: "wifi-rock", qty: 1 + (index % 3) }] })),
  );
  const methods = {};
  for (const placed of results) {
    assert.ok([201, 202].includes(placed.status), `HTTP ${placed.status}`);
    const order = placed.json.complete ? placed.json : await waitFor(`/orders/${placed.json.orderId}`, (view) => view.complete, 60000);
    assert.equal(await conductorStatus(order.conductor.workflowId), "COMPLETED");
    methods[order.confirmation.payment.method] = (methods[order.confirmation.payment.method] ?? 0) + 1;
  }
  console.log(`        payment outcomes: ${JSON.stringify(methods)}`);
});

await check("checkout: repeating an order number returns the same order (idempotent)", async () => {
  const body = { orderId: `CC-E2E${run}IDEM`, items: [{ id: "ladder", qty: 1 }] };
  const first = await call("POST", "/checkout", body);
  const second = await call("POST", "/checkout", body);
  assert.equal(second.status, 200);
  assert.equal(second.json.conductor.workflowId, first.json.conductor.workflowId);
});

await check("checkout: a terminated execution is revived and still completes", async () => {
  const placed = await call("POST", "/checkout", { orderId: `CC-E2E${run}TERM`, items: [{ id: "brick", qty: 3 }] });
  const { workflowId } = placed.json.conductor;
  // Simulate an operator accident on a finished order by restarting, then terminating it mid-flight.
  await fetch(`${conductor}/workflow/${workflowId}/restart`, { method: "POST" });
  await fetch(`${conductor}/workflow/${workflowId}?reason=e2e-accident`, { method: "DELETE" });
  const order = await waitFor(`/orders/${placed.json.orderId}`, (view) => view.complete, 30000);
  assert.equal(order.state, "CONFIRMED");
  assert.equal(await conductorStatus(workflowId), "COMPLETED");
});

const orderId = `CC-E2E${run}A0`;

await check("returns: stamping Form 27B/6 completes the WAIT task and a decision follows", async () => {
  const started = await call("POST", "/returns", { returnId: `RMA-E2E${run}S`, orderId, itemId: "battery", reason: "It's haunted", answers: { notARobot: true, regret: "97" } });
  assert.equal(started.status, 201);
  await waitFor(`/returns/${started.json.returnId}`, (view) => view.form.pending, 20000);
  const stamped = await call("POST", `/returns/${started.json.returnId}/form`, { signature: "E2E" });
  assert.equal(stamped.status, 200);
  const decided = await waitFor(`/returns/${started.json.returnId}`, (view) => view.complete, 20000);
  assert.ok(["APPROVED", "DENIED", "STORE_CREDIT"].includes(decided.decision));
  assert.equal(decided.result.formStamped, true);
  assert.equal(decided.checks.length, 7);
  assert.equal(decided.result.item.unitPrice, 849.99, "the item price comes from the original order");
  assert.equal(await conductorStatus(decided.conductor.workflowId), "COMPLETED");
  assert.equal((await call("POST", `/returns/${started.json.returnId}/form`, {})).status, 409);
});

await check("returns: 12 abandoned or nonsensical returns are all decided without the customer", async () => {
  const bodies = [
    {},
    { orderId: "CC-DOESNOTEXIST1", itemId: "unicorn", reason: "It never existed" },
    { orderId: 12345, itemId: ["x"], reason: { deep: "thoughts" }, answers: "none" },
    ...Array.from({ length: 9 }, (_, index) => ({ orderId, itemId: index % 2 ? "used-candle" : "battery", reason: `Reason number ${index}` })),
  ];
  const started = await Promise.all(bodies.map((body, index) => call("POST", "/returns", { ...body, returnId: `RMA-E2E${run}N${index}` })));
  const decisions = {};
  for (const res of started) {
    assert.equal(res.status, 201);
    const decided = await waitFor(`/returns/${res.json.returnId}`, (view) => view.complete, 60000);
    assert.ok(["APPROVED", "DENIED", "STORE_CREDIT"].includes(decided.decision));
    assert.equal(decided.result.formStamped, false);
    assert.equal(await conductorStatus(decided.conductor.workflowId), "COMPLETED");
    decisions[decided.decision] = (decisions[decided.decision] ?? 0) + 1;
  }
  console.log(`        decisions: ${JSON.stringify(decisions)}`);
});

await check("returns: a return terminated mid-wait is revived and still decided", async () => {
  const started = await call("POST", "/returns", { returnId: `RMA-E2E${run}T`, orderId, itemId: "battery", reason: "It arrived twice" });
  await waitFor(`/returns/${started.json.returnId}`, (view) => view.form.pending, 20000);
  await fetch(`${conductor}/workflow/${started.json.conductor.workflowId}?reason=e2e-accident`, { method: "DELETE" });
  const decided = await waitFor(`/returns/${started.json.returnId}`, (view) => view.complete, 60000);
  assert.ok(["APPROVED", "DENIED", "STORE_CREDIT"].includes(decided.decision));
});

await check("api: bad requests are rejected cleanly", async () => {
  assert.equal((await call("POST", "/checkout", "{not json")).status, 400);
  assert.equal((await call("GET", "/orders/CC-NOSUCHORDER00")).status, 404);
  assert.equal((await call("GET", "/returns/RMA-NOSUCHRETURN")).status, 404);
});

console.log(process.exitCode ? "\nSome checks failed." : `\nAll ${passed} checks passed.`);
