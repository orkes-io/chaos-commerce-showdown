// Backend tests that need no Conductor server: a small in-memory fake stands in.

import assert from "node:assert/strict";
import { test } from "node:test";
import { createApp } from "../../backend/src/app.js";
import { loadConfig, normaliseConductorUrl } from "../../backend/src/config.js";
import { ConductorError, createConductorClient } from "../../backend/src/conductor.js";
import { handler } from "../../backend/src/lambda.js";

const ORDER_ID = "11111111-1111-4111-8111-111111111111";
const RESCUE_ID = "22222222-2222-4222-8222-222222222222";
const RETURN_ID = "33333333-3333-4333-8333-333333333333";

function fakeConductor(executions = {}) {
  const calls = { started: [], completed: [], decided: [] };
  let nextId = 0;
  return {
    calls,
    executions,
    async startWorkflow(request) {
      calls.started.push(request);
      const workflowId = `aaaaaaaa-aaaa-4aaa-8aaa-${String(++nextId).padStart(12, "0")}`;
      const receipt = { orderId: request.input.orderId, lines: request.input.lines, customer: request.input.customer };
      executions[workflowId] = {
        workflowId,
        workflowName: request.name,
        correlationId: request.correlationId,
        status: "COMPLETED",
        input: request.input,
        output: { receipt, decision: { code: "APPROVED_BY_DEFAULT", returnId: request.input.returnId } },
        tasks: [],
      };
      return workflowId;
    },
    async getWorkflow(workflowId) {
      return executions[workflowId] ?? null;
    },
    async findByCorrelation(name, correlationId) {
      return Object.values(executions).filter((e) => e.workflowName === name && e.correlationId === correlationId);
    },
    async completeTask(workflowId, taskRef, output) {
      calls.completed.push({ workflowId, taskRef, output });
      const execution = executions[workflowId];
      execution.status = "COMPLETED";
      execution.tasks.find((task) => task.referenceTaskName === taskRef).status = "COMPLETED";
      execution.output = { decision: { code: "STORE_CREDIT", returnId: "RMA-1", oath: { received: true } } };
    },
    async decide(workflowId) {
      calls.decided.push(workflowId);
    },
    async getWorkflowDefinition(name) {
      return { name };
    },
  };
}

function setUp(executions, configOverrides = {}) {
  const conductor = fakeConductor(executions);
  const config = { ...loadConfig({}), ...configOverrides };
  const app = createApp({ config, conductor });
  const call = async (method, path, body, headers = {}) => {
    const response = await app({ method, path, headers, body: body === undefined ? null : typeof body === "string" ? body : JSON.stringify(body) });
    return { status: response.statusCode, headers: response.headers, json: response.body ? JSON.parse(response.body) : null };
  };
  return { conductor, call };
}

test("config: the Conductor URL comes from the environment and is normalised", () => {
  assert.equal(normaliseConductorUrl("http://conductor.internal:8080"), "http://conductor.internal:8080/api");
  assert.equal(normaliseConductorUrl("http://conductor.internal:8080/api/"), "http://conductor.internal:8080/api");
  assert.equal(normaliseConductorUrl("https://example.orkesconductor.io/api"), "https://example.orkesconductor.io/api");
  assert.throws(() => normaliseConductorUrl("not a url"));
  assert.equal(loadConfig({ CONDUCTOR_SERVER_URL: "http://c:9/api" }).conductorUrl, "http://c:9/api");
  assert.equal(loadConfig({}).conductorUrl, "http://localhost:8080/api");
  // On Lambda there is no sensible default, so the URL must be configured.
  assert.equal(loadConfig({ AWS_LAMBDA_FUNCTION_NAME: "chaos" }).conductorUrl, "");
  assert.equal(loadConfig({ OATH_WINDOW_SECONDS: "9999" }).oathWindowSeconds, 600);
});

test("conductor client: 404 becomes null, outages are flagged, key and secret are exchanged for a token", async () => {
  const seen = [];
  const fetchImpl = async (url, options) => {
    seen.push({ path: new URL(url).pathname, headers: options.headers });
    if (String(url).endsWith("/token")) return new Response(JSON.stringify({ token: "jwt-1" }));
    if (String(url).includes("/workflow/missing")) return new Response(JSON.stringify({ message: "nope" }), { status: 404 });
    if (String(url).includes("/workflow/down")) throw Object.assign(new TypeError("fetch failed"), { cause: { code: "ECONNREFUSED" } });
    return new Response(JSON.stringify({ workflowId: "x" }));
  };
  const client = createConductorClient({ baseUrl: "http://c/api", authKey: "key", authSecret: "secret", fetchImpl });
  assert.equal(await client.getWorkflow("missing"), null);
  assert.deepEqual(await client.getWorkflow("present"), { workflowId: "x" });
  await assert.rejects(client.getWorkflow("down"), (error) => error instanceof ConductorError && error.unavailable);
  assert.equal(seen.filter((entry) => entry.path === "/api/token").length, 1, "token is fetched once and reused");
  assert.equal(seen.at(-1).headers["x-authorization"], "jwt-1");

  const unconfigured = createConductorClient({ baseUrl: "" });
  await assert.rejects(unconfigured.getWorkflow("x"), /CONDUCTOR_SERVER_URL is not configured/);
});

test("catalog is served with CORS headers", async () => {
  const { call } = setUp({});
  const response = await call("GET", "/api/catalog");
  assert.equal(response.status, 200);
  assert.equal(response.headers["access-control-allow-origin"], "*");
  assert.ok(response.json.products.length >= 10);
  for (const product of response.json.products) {
    assert.ok(product.reviews.some((review) => review.stars === 5), `${product.id} has a furious five-star review`);
    assert.ok(product.reviews.some((review) => review.stars === 2), `${product.id} has a glowing two-star review`);
  }
});

test("CORS can be restricted to the GitHub Pages origin", async () => {
  const { call } = setUp({}, { allowedOrigins: ["https://someone.github.io"] });
  const allowed = await call("OPTIONS", "/api/checkout", undefined, { origin: "https://someone.github.io" });
  assert.equal(allowed.status, 204);
  assert.equal(allowed.headers["access-control-allow-origin"], "https://someone.github.io");
  const other = await call("GET", "/api/catalog", undefined, { origin: "https://elsewhere.example" });
  assert.equal(other.headers["access-control-allow-origin"], undefined);
});

test("checkout: prices come from the catalogue, junk is dropped and nothing is rejected", async () => {
  const { conductor, call } = setUp({});
  const response = await call("POST", "/api/checkout", {
    clientToken: "token-0001",
    items: [{ id: "left-sock", qty: 2 }, { id: "left-sock", qty: 500 }, { id: "not-a-product", qty: 1 }, "junk", { id: "premium-air", qty: -4, unitPriceCents: 0 }],
    customer: { name: "  Ada  " },
    shipping: "warp-drive",
    payment: ["nope"],
  });
  assert.equal(response.status, 200);
  assert.equal(response.json.state, "COMPLETED");
  const [started] = conductor.calls.started;
  assert.equal(started.name, "chaos_checkout");
  assert.equal(started.correlationId, "token-0001");
  assert.deepEqual(started.input.lines.map((line) => [line.id, line.qty, line.unitPriceCents]), [["left-sock", 99, 499999], ["premium-air", 1, 1]]);
  assert.equal(started.input.customer.name, "Ada");
  assert.equal(started.input.shipping.id, "pigeon");
  assert.equal(started.input.payment.id, "handshake");

  for (const body of [{}, [], "null", { items: "many" }]) {
    assert.equal((await call("POST", "/api/checkout", body)).json.state, "COMPLETED");
  }
});

test("checkout: retrying with the same client token does not create a second order", async () => {
  const { conductor, call } = setUp({});
  const first = await call("POST", "/api/checkout", { clientToken: "token-0002", items: [{ id: "left-sock", qty: 1 }] });
  const second = await call("POST", "/api/checkout", { clientToken: "token-0002", items: [{ id: "left-sock", qty: 1 }] });
  assert.equal(conductor.calls.started.length, 1);
  assert.equal(second.json.workflowId, first.json.workflowId);
  assert.equal(second.json.orderId, first.json.orderId);
});

test("checkout: a failed workflow is answered from the rescue workflow Conductor started", async () => {
  const { conductor, call } = setUp({
    [ORDER_ID]: { workflowId: ORDER_ID, workflowName: "chaos_checkout", status: "FAILED", input: { orderId: "CC-1" }, output: { "conductor.failure_workflow": RESCUE_ID } },
    [RESCUE_ID]: { workflowId: RESCUE_ID, workflowName: "chaos_checkout_rescue", status: "COMPLETED", output: { receipt: { orderId: "CC-1", rescued: true } } },
  });
  const response = await call("GET", `/api/checkout/${ORDER_ID}`);
  assert.equal(response.json.state, "COMPLETED");
  assert.equal(response.json.receipt.rescued, true);
  assert.equal(conductor.calls.started.length, 0);
});

test("checkout: a terminated workflow gets a rescue workflow started for it, once", async () => {
  const { conductor, call } = setUp({
    [ORDER_ID]: { workflowId: ORDER_ID, workflowName: "chaos_checkout", status: "TERMINATED", reasonForIncompletion: "operator", input: { orderId: "CC-2", lines: [] }, output: {} },
  });
  const first = await call("GET", `/api/checkout/${ORDER_ID}`);
  const second = await call("GET", `/api/checkout/${ORDER_ID}`);
  assert.equal(first.json.state, "COMPLETED");
  assert.equal(second.json.state, "COMPLETED");
  assert.equal(conductor.calls.started.length, 1);
  assert.equal(conductor.calls.started[0].name, "chaos_checkout_rescue");
  assert.equal(conductor.calls.started[0].input.workflowId, ORDER_ID);
  assert.equal(conductor.calls.started[0].correlationId, `rescue-${ORDER_ID}`);
});

test("a running workflow past its timeout is nudged so Conductor applies the timeout", async () => {
  const { conductor, call } = setUp({
    [ORDER_ID]: { workflowId: ORDER_ID, workflowName: "chaos_checkout", status: "RUNNING", startTime: Date.now() - 200000, workflowDefinition: { timeoutSeconds: 120 }, input: {}, output: {} },
  });
  const response = await call("GET", `/api/checkout/${ORDER_ID}`);
  assert.equal(response.json.state, "PROCESSING");
  assert.deepEqual(conductor.calls.decided, [ORDER_ID]);
});

test("only the store's own workflows are visible through the API", async () => {
  const { call } = setUp({
    [ORDER_ID]: { workflowId: ORDER_ID, workflowName: "somebody_elses_payroll", status: "COMPLETED", output: { receipt: { secret: true } } },
  });
  assert.equal((await call("GET", `/api/checkout/${ORDER_ID}`)).status, 404);
  assert.equal((await call("GET", `/api/returns/${ORDER_ID}`)).status, 404);
  assert.equal((await call("GET", "/api/checkout/..%2F..%2Fmetadata")).status, 404);
  assert.equal((await call("POST", `/api/returns/${ORDER_ID}/oath`, { oath: "x" })).status, 404);
});

test("returns: progress, the oath window and the decision are reported", async () => {
  const running = {
    workflowId: RETURN_ID,
    workflowName: "chaos_returns",
    status: "RUNNING",
    startTime: Date.now(),
    input: { returnId: "RMA-1" },
    output: {},
    tasks: [
      { referenceTaskName: "intake", status: "COMPLETED", outputData: { result: { oathText: "Sorry.", oathWindowSeconds: 60, totalChecks: 6, item: { name: "Left Sock" } } } },
      { referenceTaskName: "run_check__2", status: "COMPLETED", outputData: { result: { n: 2, verdict: "FAIL" } } },
      { referenceTaskName: "run_check__1", status: "COMPLETED", outputData: { result: { n: 1, verdict: "PASS" } } },
    ],
  };
  const { conductor, call } = setUp({ [RETURN_ID]: running });

  let response = await call("GET", `/api/returns/${RETURN_ID}`);
  assert.equal(response.json.state, "CHECKING");
  assert.deepEqual(response.json.checks.map((check) => check.n), [1, 2]);
  assert.equal((await call("POST", `/api/returns/${RETURN_ID}/oath`, { oath: "Sorry." })).json.error, "OATH_NOT_OPEN");

  running.tasks.push({ referenceTaskName: "await_oath", status: "IN_PROGRESS", startTime: Date.now() - 10000 });
  response = await call("GET", `/api/returns/${RETURN_ID}`);
  assert.equal(response.json.state, "AWAITING_OATH");
  assert.ok(response.json.oath.secondsLeft > 45 && response.json.oath.secondsLeft <= 50);
  assert.equal((await call("POST", `/api/returns/${RETURN_ID}/oath`, { oath: "   " })).status, 400);

  response = await call("POST", `/api/returns/${RETURN_ID}/oath`, { oath: " Sorry. " });
  assert.equal(response.json.state, "DECIDED");
  assert.equal(response.json.decision.code, "STORE_CREDIT");
  assert.equal(conductor.calls.completed[0].output.oath, "Sorry.");
  assert.equal((await call("POST", `/api/returns/${RETURN_ID}/oath`, { oath: "Sorry." })).json.error, "OATH_CLOSED");
});

test("returns: an unknown order or item is still filed", async () => {
  const { conductor, call } = setUp({});
  const response = await call("POST", "/api/returns", { orderRef: ORDER_ID, itemId: "no-such-item", reason: 7, affidavit: "none" });
  assert.equal(response.status, 200);
  assert.equal(response.json.state, "DECIDED");
  const input = conductor.calls.started[0].input;
  assert.equal(input.orderFound, false);
  assert.deepEqual(input.item, {});
  assert.equal(input.oathWindowSeconds, 60);
});

test("errors: outages are retryable 503s; bad requests are rejected cleanly", async () => {
  const { conductor, call } = setUp({});
  conductor.findByCorrelation = async () => {
    throw new ConductorError("down", { unavailable: true });
  };
  const outage = await call("POST", "/api/checkout", { items: [] });
  assert.equal(outage.status, 503);
  assert.equal(outage.json.retryable, true);

  assert.equal((await call("POST", "/api/checkout", "{not json")).status, 400);
  assert.equal((await call("POST", "/api/checkout", JSON.stringify({ pad: "x".repeat(40000) }))).status, 413);
  assert.equal((await call("GET", "/api/nothing")).status, 404);
  assert.equal((await call("DELETE", "/api/catalog")).status, 405);
});

test("lambda handler: accepts API Gateway HTTP API and REST API events", async () => {
  const v2 = await handler({ version: "2.0", rawPath: "/api/catalog", headers: { Origin: "https://x.example" }, requestContext: { http: { method: "GET" } } });
  assert.equal(v2.statusCode, 200);
  assert.ok(JSON.parse(v2.body).shippingOptions.length > 0);

  const v1 = await handler({ httpMethod: "POST", path: "/api/checkout", headers: {}, body: Buffer.from("{oops").toString("base64"), isBase64Encoded: true });
  assert.equal(v1.statusCode, 400);
});
