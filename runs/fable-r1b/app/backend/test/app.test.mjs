import test from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../src/app.mjs";
import { ConductorError } from "../src/conductor.mjs";
import { loadConfig, normalizeConductorUrl } from "../src/config.mjs";
import { handler } from "../src/lambda.mjs";

// An in-memory stand-in for the Conductor REST API.
function fakeConductor({ registered = true, autoComplete = true } = {}) {
  const workflows = new Map();
  const calls = [];
  let seq = 0;
  const fake = {
    workflows,
    calls,
    registered,
    down: false,
    async registerWorkflows(defs) {
      calls.push(["register", defs.map((def) => def.name)]);
      fake.registered = true;
    },
    async getWorkflowDef(name) {
      return fake.registered ? { name } : null;
    },
    async startWorkflow(request) {
      if (fake.down) throw new ConductorError("down", { unreachable: true });
      if (!fake.registered) throw new ConductorError("no such workflow", { status: 404 });
      calls.push(["start", request]);
      const workflowId = `wf-${++seq}`;
      const isCheckout = request.name === "chaos_checkout";
      workflows.set(workflowId, {
        workflowId,
        workflowName: request.name,
        workflowVersion: request.version,
        correlationId: request.correlationId,
        input: request.input,
        createTime: seq,
        status: isCheckout && autoComplete ? "COMPLETED" : "RUNNING",
        output: isCheckout && autoComplete ? { confirmation: { orderId: request.input.orderId, items: request.input.items, total: 1 } } : {},
        tasks: isCheckout ? [] : [{ referenceTaskName: "await_form_27b6", taskType: "WAIT", status: "IN_PROGRESS", startTime: 1_000_000, outputData: {} }],
      });
      return workflowId;
    },
    async getWorkflow(workflowId) {
      if (fake.down) throw new ConductorError("down", { unreachable: true });
      return workflows.get(workflowId) ?? null;
    },
    async findByCorrelation(name, correlationId) {
      if (fake.down) throw new ConductorError("down", { unreachable: true });
      return [...workflows.values()].find((wf) => wf.workflowName === name && wf.correlationId === correlationId) ?? null;
    },
    async completeTask(workflowId, taskRef, output) {
      calls.push(["complete", workflowId, taskRef, output]);
      const workflow = workflows.get(workflowId);
      workflow.tasks.at(-1).status = "COMPLETED";
      workflow.tasks.at(-1).outputData = output;
      workflow.status = "COMPLETED";
      workflow.output = { result: { returnId: workflow.correlationId, decision: "STORE_CREDIT", checks: [], item: workflow.input.item } };
    },
    async retryWorkflow(workflowId) {
      calls.push(["retry", workflowId]);
    },
    async restartWorkflow(workflowId) {
      calls.push(["restart", workflowId]);
    },
    async health() {
      return !fake.down;
    },
  };
  return fake;
}

function setup(options) {
  const conductor = fakeConductor(options);
  const config = { ...loadConfig({}), checkoutWaitMs: 0 };
  const app = createApp({ config, conductor, now: () => 1_005_000 });
  const call = async (method, path, body) => {
    const res = await app.handle({ method, path, body: body === undefined ? "" : typeof body === "string" ? body : JSON.stringify(body) });
    return { status: res.status, headers: res.headers, json: res.body ? JSON.parse(res.body) : null };
  };
  return { conductor, call };
}

test("config: /api is appended only to a bare Conductor root", () => {
  assert.equal(normalizeConductorUrl("http://localhost:8080"), "http://localhost:8080/api");
  assert.equal(normalizeConductorUrl("http://localhost:8080/"), "http://localhost:8080/api");
  assert.equal(normalizeConductorUrl("https://conductor.example.com/api/"), "https://conductor.example.com/api");
  assert.equal(normalizeConductorUrl("https://example.com/custom/base"), "https://example.com/custom/base");
  assert.equal(normalizeConductorUrl(undefined), "http://localhost:8080/api");
  assert.equal(loadConfig({ CONDUCTOR_SERVER_URL: "http://conductor:9090" }).conductorUrl, "http://conductor:9090/api");
  assert.throws(() => normalizeConductorUrl("not a url"));
});

test("checkout: prices come from the catalog and the order is confirmed", async () => {
  const { conductor, call } = setup();
  const res = await call("POST", "/api/checkout", {
    orderId: "CC-TESTORDER1",
    items: [{ id: "battery", qty: 2, unitPrice: 0.01 }, { id: "does-not-exist", qty: 1 }, { id: "brick", qty: 5000 }],
    coupon: "SAVE10",
    shipping: "teleport",
  });
  assert.equal(res.status, 201);
  assert.equal(res.json.state, "CONFIRMED");
  assert.equal(res.json.complete, true);
  const [, request] = conductor.calls.find(([kind]) => kind === "start");
  assert.equal(request.name, "chaos_checkout");
  assert.equal(request.correlationId, "CC-TESTORDER1");
  assert.deepEqual(request.input.items.map((item) => [item.id, item.unitPrice, item.qty]), [
    ["battery", 849.99, 2],
    ["mystery-item", 13.13, 1],
    ["brick", 3.14159, 99],
  ]);
  assert.equal(request.input.shipping, "standard");
});

test("checkout: an empty or nonsense cart still completes", async () => {
  const { conductor, call } = setup();
  for (const body of [{}, { items: "lots" }, { items: [null, 7, "x"] }]) {
    const res = await call("POST", "/api/checkout", body);
    assert.equal(res.status, 201);
    assert.match(res.json.orderId, /^CC-[A-Z0-9]{10}$/);
  }
  const starts = conductor.calls.filter(([kind]) => kind === "start");
  assert.equal(starts.length, 3);
  // The workflow itself turns an empty cart into "Nothing (Deluxe Edition)".
  for (const [, request] of starts) assert.deepEqual(request.input.items, []);
});

test("checkout: retrying with the same order number never double-orders", async () => {
  const { conductor, call } = setup();
  const body = { orderId: "CC-IDEMPOTENT1", items: [{ id: "ladder", qty: 1 }] };
  const first = await call("POST", "/api/checkout", body);
  const second = await call("POST", "/api/checkout", body);
  assert.equal(first.status, 201);
  assert.equal(second.status, 200);
  assert.equal(second.json.conductor.workflowId, first.json.conductor.workflowId);
  assert.equal(conductor.calls.filter(([kind]) => kind === "start").length, 1);
});

test("checkout: registers the workflows itself when the definition is missing", async () => {
  const { conductor, call } = setup({ registered: false });
  const res = await call("POST", "/api/checkout", { items: [{ id: "brick", qty: 1 }] });
  assert.equal(res.status, 201);
  assert.deepEqual(conductor.calls.find(([kind]) => kind === "register")[1], ["chaos_checkout", "chaos_returns"]);
});

test("checkout: an unreachable Conductor is a retryable 503, not a lost order", async () => {
  const { conductor, call } = setup();
  conductor.down = true;
  const res = await call("POST", "/api/checkout", { orderId: "CC-RETRYME001", items: [] });
  assert.equal(res.status, 503);
  assert.equal(res.json.error.retryable, true);
  conductor.down = false;
  assert.equal((await call("POST", "/api/checkout", { orderId: "CC-RETRYME001", items: [] })).status, 201);
});

test("checkout: a start that times out after reaching Conductor is adopted, not failed", async () => {
  const { conductor, call } = setup();
  const realStart = conductor.startWorkflow;
  conductor.startWorkflow = async (request) => {
    await realStart(request);
    throw new ConductorError("timed out", { unreachable: true });
  };
  const res = await call("POST", "/api/checkout", { orderId: "CC-SLOWSTART1", items: [{ id: "brick", qty: 1 }] });
  assert.equal(res.status, 201);
  assert.equal(res.json.state, "CONFIRMED");
  assert.equal(conductor.workflows.size, 1);
});

test("orders: a failed execution is retried instead of being left failed", async () => {
  const { conductor, call } = setup();
  const placed = await call("POST", "/api/checkout", { orderId: "CC-FALLOVER01", items: [] });
  conductor.workflows.get(placed.json.conductor.workflowId).status = "TERMINATED";
  const res = await call("GET", "/api/orders/CC-FALLOVER01");
  assert.equal(res.json.state, "RECOVERING");
  assert.deepEqual(conductor.calls.at(-1), ["retry", placed.json.conductor.workflowId]);
  assert.equal((await call("GET", "/api/orders/CC-NOSUCHORDER")).status, 404);
  assert.equal((await call("GET", "/api/orders/..%2F..%2Fetc")).status, 404);
});

test("returns: start, wait for the form, stamp it, get a decision", async () => {
  const { conductor, call } = setup();
  await call("POST", "/api/checkout", { orderId: "CC-RETURNME01", items: [{ id: "wifi-rock", qty: 3 }] });
  const started = await call("POST", "/api/returns", { returnId: "RMA-TEST00001", orderId: "CC-RETURNME01", itemId: "wifi-rock", reason: "It's haunted", answers: { notARobot: true } });
  assert.equal(started.status, 201);
  assert.equal(started.json.state, "AWAITING_FORM");
  assert.equal(started.json.form.pending, true);
  assert.equal(started.json.form.secondsRemaining, 10);
  const [, request] = conductor.calls.filter(([kind]) => kind === "start").at(-1);
  assert.equal(request.name, "chaos_returns");
  assert.equal(request.input.orderFound, true);
  assert.deepEqual(request.input.item, { id: "wifi-rock", name: "Wi-Fi Enabled Rock", unitPrice: 1299, qty: 3 });

  const stamped = await call("POST", "/api/returns/RMA-TEST00001/form", { signature: "X" });
  assert.equal(stamped.status, 200);
  assert.equal(stamped.json.accepted, true);
  assert.equal(stamped.json.return.state, "DECIDED");
  assert.equal(stamped.json.return.decision, "STORE_CREDIT");
  const [, , taskRef, output] = conductor.calls.find(([kind]) => kind === "complete");
  assert.equal(taskRef, "await_form_27b6");
  assert.equal(output.stamped, true);

  const late = await call("POST", "/api/returns/RMA-TEST00001/form", {});
  assert.equal(late.status, 409);
  assert.equal(late.json.accepted, false);
});

test("returns: an unknown order is still accepted for a decision", async () => {
  const { conductor, call } = setup();
  const res = await call("POST", "/api/returns", { orderId: "CC-NEVERHAPPENED", itemId: "unicorn" });
  assert.equal(res.status, 201);
  const [, request] = conductor.calls.find(([kind]) => kind === "start");
  assert.equal(request.input.orderFound, false);
  assert.equal(request.input.item.id, "unicorn");
  assert.match(request.correlationId, /^RMA-/);
});

test("http: bad JSON, unknown routes, CORS preflight, API Gateway stage prefix", async () => {
  const { call } = setup();
  assert.equal((await call("POST", "/api/checkout", "{nope")).status, 400);
  assert.equal((await call("POST", "/api/checkout", "[1,2]")).status, 400);
  assert.equal((await call("GET", "/api/nothing-here")).status, 404);
  assert.equal((await call("DELETE", "/api/orders/CC-ANYTHING")).status, 405);
  const preflight = await call("OPTIONS", "/api/checkout");
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers["Access-Control-Allow-Origin"], "*");
  const staged = await call("GET", "/prod/api/products");
  assert.equal(staged.status, 200);
  assert.equal(staged.json.products.length, 12);
});

test("catalog: five-star reviews are furious and two-star reviews are glowing", async () => {
  const { call } = setup();
  const { json } = await call("GET", "/api/products");
  for (const product of json.products) {
    assert.ok(product.reviews.some((review) => review.stars === 5), `${product.id} needs a furious review`);
    assert.ok(product.reviews.some((review) => review.stars === 2), `${product.id} needs a glowing review`);
    assert.ok(product.reviews.every((review) => review.stars === 5 || review.stars === 2));
  }
});

test("lambda: handles API Gateway v2 and v1 events without touching Conductor for the catalog", async () => {
  const v2 = await handler({ version: "2.0", rawPath: "/api/products/brick", requestContext: { http: { method: "GET" } } });
  assert.equal(v2.statusCode, 200);
  assert.equal(JSON.parse(v2.body).id, "brick");
  const v1 = await handler({ httpMethod: "POST", path: "/prod/api/checkout", body: Buffer.from("{oops").toString("base64"), isBase64Encoded: true });
  assert.equal(v1.statusCode, 400);
});
