// End-to-end tests against a real Conductor server (CONDUCTOR_SERVER_URL, or
// http://localhost:8080/api). They register the workflows and then drive the
// store API exactly as the Lambda handler would. Skipped if Conductor is down.

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { describe, test } from "node:test";
import { createApp } from "../../backend/src/app.js";
import { loadConfig } from "../../backend/src/config.js";
import { loadDotEnv, registerWorkflows } from "../../scripts/register.js";

loadDotEnv();
const config = { ...loadConfig(), oathWindowSeconds: 6, checkPauseSeconds: 1 };
const base = config.conductorUrl;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

let reachable = true;
try {
  await registerWorkflows({ config, log: () => {}, waitSeconds: 0 });
} catch (error) {
  reachable = false;
  console.error(`Skipping integration tests: ${error.message}`);
}

const app = createApp({ config });
async function call(method, path, body) {
  const response = await app({ method, path, headers: {}, body: body === undefined ? null : JSON.stringify(body) });
  return { status: response.statusCode, json: response.body ? JSON.parse(response.body) : null };
}

async function conductor(method, path, body) {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  try {
    return { status: response.status, body: JSON.parse(text) };
  } catch {
    return { status: response.status, body: text };
  }
}

async function runDirectly(name, input, timeoutMs = 30000) {
  const { body: workflowId } = await conductor("POST", `/workflow/${name}`, input);
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const { body: execution } = await conductor("GET", `/workflow/${workflowId}?includeTasks=false`);
    if (execution.status !== "RUNNING" || Date.now() > deadline) return execution;
    await sleep(300);
  }
}

async function waitForReturn(workflowId, wanted, timeoutMs = 40000) {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const { json } = await call("GET", `/api/returns/${workflowId}`);
    if (wanted.includes(json.state)) return json;
    assert.ok(Date.now() < deadline, `return ${workflowId} stuck in ${json.state}`);
    await sleep(500);
  }
}

function assertReceiptAddsUp(receipt) {
  assert.equal(receipt.status, "CONFIRMED");
  const lineTotal = receipt.lines.reduce((sum, line) => sum + line.qty * line.unitPriceCents, 0);
  const charges = receipt.charges.reduce((sum, charge) => sum + charge.amountCents, 0);
  assert.equal(receipt.subtotalCents, lineTotal);
  assert.equal(receipt.totalCents, lineTotal + charges);
  assert.equal(receipt.payment.settled, true);
  assert.ok(receipt.payment.settledBy.length > 0);
}

const DECISIONS = ["APPROVED_REFUND", "STORE_CREDIT", "DENIED"];

describe("against Conductor", { skip: !reachable, concurrency: 3 }, () => {
  test("checkout completes with a receipt that adds up, and is idempotent", async () => {
    const order = {
      clientToken: randomUUID(),
      items: [{ id: "left-sock", qty: 3 }, { id: "premium-air", qty: 1 }, { id: "mystery-box", qty: 2 }],
      customer: { name: "Integration Tess" },
      coupon: "SAVE10",
      shipping: "catapult",
      payment: "exposure",
    };
    const { status, json } = await call("POST", "/api/checkout", order);
    assert.equal(status, 200);
    assert.equal(json.state, "COMPLETED");
    assertReceiptAddsUp(json.receipt);
    assert.equal(json.receipt.rescued, false);
    assert.equal(json.receipt.customer.name, "Integration Tess");
    assert.equal(json.receipt.lines.length, 3);
    assert.ok(json.receipt.lines.every((line) => typeof line.fulfilment === "string"));
    assert.ok(json.receipt.charges.some((charge) => charge.label.includes("SAVE10")), "the coupon costs extra");
    assert.ok(json.receipt.charges.some((charge) => charge.label.startsWith("Bulk")), "buying three costs extra");
    const approved = json.receipt.payment.attempts.filter((attempt) => attempt.approved);
    assert.equal(approved.length, 1);
    assert.equal(json.receipt.payment.attempts.at(-1).approved, true);
    assert.ok(json.receipt.payment.attempts.length >= 2 && json.receipt.payment.attempts.length <= 5);

    const again = await call("POST", "/api/checkout", order);
    assert.equal(again.json.workflowId, json.workflowId);
    const read = await call("GET", `/api/checkout/${json.workflowId}`);
    assert.deepEqual(read.json.receipt, json.receipt);
  });

  test("thirty varied checkouts all complete, including empty and absurd carts", async () => {
    const shipping = ["pigeon", "catapult", "never", "teleport", "nonsense"];
    const results = [];
    const place = (index) =>
      call("POST", "/api/checkout", {
        clientToken: randomUUID(),
        items: index % 5 === 0 ? [] : [{ id: ["left-sock", "used-candle", "mystery-box", "usb-one-end"][index % 4], qty: (index % 7) * 20 }],
        customer: index % 3 === 0 ? null : { name: "x".repeat(index * 10), email: 42 },
        coupon: index % 2 === 0 ? "" : "💸".repeat(index),
        shipping: shipping[index % shipping.length],
        payment: index,
      });
    // Five at a time, to go easy on a shared Conductor server.
    for (let first = 0; first < 30; first += 5) {
      results.push(...(await Promise.all([0, 1, 2, 3, 4].map((offset) => place(first + offset)))));
    }
    for (const { status, json } of results) {
      assert.equal(status, 200);
      assert.equal(json.state, "COMPLETED");
      assertReceiptAddsUp(json.receipt);
    }
  });

  test("workflows complete even when started directly with no input or with junk", async () => {
    const junk = { orderId: 5, seed: "x", customer: "bob", lines: [1, null, { qty: 2.7, unitPriceCents: 10.9 }, { qty: -1, unitPriceCents: "free" }], coupon: { a: 1 }, shipping: [1], payment: 7 };
    for (const input of [{}, junk]) {
      const checkout = await runDirectly("chaos_checkout", input);
      assert.equal(checkout.status, "COMPLETED");
      assertReceiptAddsUp(checkout.output.receipt);
      const rescue = await runDirectly("chaos_checkout_rescue", { ...input, workflowId: "abc", reason: "test" });
      assert.equal(rescue.status, "COMPLETED");
      assertReceiptAddsUp(rescue.output.receipt);
      assert.equal(rescue.output.receipt.rescued, true);
      const fallback = await runDirectly("chaos_returns_default_decision", input);
      assert.equal(fallback.status, "COMPLETED");
      assert.equal(fallback.output.decision.code, "APPROVED_BY_DEFAULT");
    }
    const returned = await runDirectly("chaos_returns", { returnId: 4, seed: "s", item: "toaster", affidavit: [1], returnReason: {}, oathWindowSeconds: 2.5, checkPauseSeconds: "fast" });
    assert.equal(returned.status, "COMPLETED");
    assert.equal(returned.output.decision.status, "DECIDED");
    assert.equal(returned.output.decision.code, "DENIED");
  });

  test("a return with a sworn oath runs six checks and reaches a decision", async () => {
    const order = await call("POST", "/api/checkout", { clientToken: randomUUID(), items: [{ id: "used-candle", qty: 1 }], customer: { name: "Oath Keeper" } });
    const filed = await call("POST", "/api/returns", {
      clientToken: randomUUID(),
      orderRef: order.json.workflowId,
      itemId: "used-candle",
      reason: "It is haunted.",
      affidavit: { boxSmell: "old soup", moonPhase: "Full moon", regretSquares: 4, keepWillingness: 12 },
    });
    assert.equal(filed.status, 200);
    assert.equal(filed.json.state, "CHECKING");
    assert.match(filed.json.returnId, /^RMA-[0-9A-F]{8}$/);

    const waiting = await waitForReturn(filed.json.workflowId, ["AWAITING_OATH"]);
    assert.equal(waiting.checks.length, 6);
    assert.ok(waiting.oath.secondsLeft > 0 && waiting.oath.secondsLeft <= 6);

    const sworn = await call("POST", `/api/returns/${filed.json.workflowId}/oath`, { oath: "i am sorry for what i did to the box" });
    assert.equal(sworn.status, 200);
    const decided = sworn.json.state === "DECIDED" ? sworn.json : await waitForReturn(filed.json.workflowId, ["DECIDED"]);
    const decision = decided.decision;
    assert.ok(DECISIONS.includes(decision.code));
    assert.deepEqual({ received: decision.oath.received, exact: decision.oath.exact }, { received: true, exact: true });
    assert.equal(decision.orderFound, true);
    assert.equal(decision.orderId, order.json.orderId);
    assert.equal(decision.customerName, "Oath Keeper");
    assert.equal(decision.item.priceCents, 6700);
    assert.equal(decision.checksRun, 6);
    assert.equal(decision.checksConsulted, 0);
    assert.match(decision.checks[0].note, /old soup/);
    if (decision.code === "APPROVED_REFUND") {
      assert.equal(decision.refund.refundCents, decision.refund.breakdown.reduce((sum, line) => sum + line.amountCents, 0));
      assert.ok(decision.refund.refundCents >= 1);
    }
    if (decision.code === "STORE_CREDIT") assert.equal(decision.credit.creditCents, 7370);
    if (decision.code === "DENIED") assert.ok(decision.denial.ground.length > 0);
  });

  test("an abandoned return is decided when the oath window closes", async () => {
    const filed = await call("POST", "/api/returns", { clientToken: randomUUID(), itemId: "left-sock", reason: "It arrived." });
    const decided = await waitForReturn(filed.json.workflowId, ["DECIDED"]);
    assert.equal(decided.decision.code, "DENIED");
    assert.equal(decided.decision.oath.received, false);
    assert.match(decided.decision.explanation, /No Returns Oath/);
    assert.equal(decided.decision.orderFound, false);
    const late = await call("POST", `/api/returns/${filed.json.workflowId}/oath`, { oath: "sorry" });
    assert.equal(late.status, 409);
    assert.equal(late.json.error, "OATH_CLOSED");
  });

  test("a return whose workflow fails is approved by default (failureWorkflow)", async () => {
    const filed = await call("POST", "/api/returns", { clientToken: randomUUID(), itemId: "one-rung-ladder", reason: "It arrived twice." });
    await waitForReturn(filed.json.workflowId, ["AWAITING_OATH"]);
    // Break the workflow from outside by failing its waiting task.
    await conductor("POST", `/tasks/${filed.json.workflowId}/await_oath/FAILED_WITH_TERMINAL_ERROR`, { broken: true });
    const decided = await waitForReturn(filed.json.workflowId, ["DECIDED"]);
    assert.equal(decided.decision.code, "APPROVED_BY_DEFAULT");
    assert.equal(decided.decision.decidedByDefault, true);
    assert.equal(decided.decision.decidedInsteadOf.workflowId, filed.json.workflowId);
    assert.equal(decided.decision.refund.refundCents, 21400);
    assert.equal(decided.decision.reason, "It arrived twice.");
    const { body: failed } = await conductor("GET", `/workflow/${filed.json.workflowId}?includeTasks=false`);
    assert.equal(failed.status, "FAILED");
    assert.ok(failed.output["conductor.failure_workflow"], "Conductor started the failure workflow itself");
  });

  test("a return terminated by an operator is still decided", async () => {
    const filed = await call("POST", "/api/returns", { clientToken: randomUUID(), itemId: "premium-air" });
    await conductor("DELETE", `/workflow/${filed.json.workflowId}?reason=integration-test`);
    const decided = await waitForReturn(filed.json.workflowId, ["DECIDED"]);
    assert.equal(decided.decision.code, "APPROVED_BY_DEFAULT");
    assert.equal(decided.decision.refund.refundCents, 1);
  });

  test("a terminated checkout is completed by the rescue workflow", async (t) => {
    // Checkouts finish in a fraction of a second, so catching one mid-flight takes a few tries.
    for (let attempt = 0; attempt < 15; attempt++) {
      const { body: workflowId } = await conductor("POST", "/workflow/chaos_checkout", {
        orderId: "CC-TERMINATED",
        seed: 7,
        lines: [{ id: "left-sock", name: "Left Sock (Single)", qty: 2, unitPriceCents: 499999 }],
      });
      const terminated = await conductor("DELETE", `/workflow/${workflowId}?reason=integration-test`);
      if (terminated.status !== 200) continue;
      const { json } = await call("GET", `/api/checkout/${workflowId}`);
      const settled = json.state === "COMPLETED" ? json : (await sleep(1500), (await call("GET", `/api/checkout/${workflowId}`)).json);
      assert.equal(settled.state, "COMPLETED");
      assert.equal(settled.receipt.rescued, true);
      assert.equal(settled.receipt.totalCents, 999998);
      assertReceiptAddsUp(settled.receipt);
      return;
    }
    t.skip("never caught a checkout before it completed");
  });
});
