import test from "node:test";
import assert from "node:assert/strict";
import { loadConfig } from "../src/config.mjs";
import { registerAllWorkflows } from "../src/registerWorkflows.mjs";
import { startChaosWorkers } from "../src/workers.mjs";
import { createApp } from "../src/app.mjs";
import { handler as lambdaHandler } from "../src/lambda.mjs";

const config = loadConfig({ ...process.env, CHAOS_STEP_DELAY_MS: "0" });
let workerHandle;
let server;
let baseUrl;

test.before(async () => {
  await registerAllWorkflows(config);
  workerHandle = await startChaosWorkers(config);
  const app = createApp({
    config,
    serveStatic: false,
    getWorkerStatus: () => ({ embedded: true, polling: true, workerCount: workerHandle.workerCount }),
  });
  await new Promise((resolve) => {
    server = app.listen(0, "127.0.0.1", resolve);
  });
  const addr = server.address();
  baseUrl = `http://127.0.0.1:${addr.port}`;
});

test.after(async () => {
  if (workerHandle) await workerHandle.stop();
  if (server) await new Promise((resolve) => server.close(resolve));
});

test("GET /api/health confirms Conductor connectivity and zero runtime AI APIs", async () => {
  const res = await fetch(`${baseUrl}/api/health`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.status, "CHAOTICALLY_OPERATIONAL");
  assert.equal(body.aiApisUsedAtRuntime, false);
  assert.equal(body.conductor.ok, true);
});

test("GET /api/products returns absurd catalog with furious 5-star and praising 2-star reviews", async () => {
  const res = await fetch(`${baseUrl}/api/products`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.ok(body.products.length >= 6);
  const sock = body.products.find((p) => p.id === "left-tube-sock");
  assert.ok(sock);
  assert.ok(sock.price > sock.wasPrice, "Parody discount should be higher than wasPrice");
  assert.ok(sock.reviews.some((r) => r.rating === 5));
  assert.ok(sock.reviews.some((r) => r.rating === 2));
});

test("POST /api/checkout executes chaos_checkout_workflow on Conductor and always completes", async () => {
  for (const shippingMethod of ["pigeon", "catapult", "intern", "free_ish"]) {
    const res = await fetch(`${baseUrl}/api/checkout?wait=true`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerName: "Test Shopper",
        customerEmail: "test@chaos.invalid",
        shippingAddress: "123 Chaos Blvd, Reno, NV",
        shippingMethod,
        promoCode: shippingMethod === "pigeon" ? "SAVE50" : "CHAOS",
        paymentMethod: "Imaginary Platinum Card",
        includeCardboardBox: true,
        includeShippingInsurance: true,
        items: [{ productId: "industrial-forklift", quantity: 2 }],
      }),
    });

    assert.equal(res.status, 201, `Checkout failed for shipping=${shippingMethod}`);
    const data = await res.json();
    assert.ok(data.workflowId);
    assert.equal(data.execution.status, "COMPLETED");
    assert.equal(data.execution.output.status, "COMPLETED_NO_TAKEBACKS");
    assert.ok(data.execution.output.grandTotal > 0);
    assert.ok(data.execution.output.shipping.trackingCode);
    assert.ok(data.execution.output.fees.length >= 5);
    if (shippingMethod === "pigeon") {
      assert.equal(data.execution.output.totals.promoAdjustment, 50);
    } else {
      assert.equal(data.execution.output.totals.promoAdjustment, -0.01);
    }
  }
});

test("POST /api/returns executes chaos_return_workflow and reaches all three verdict types cleanly", async () => {
  // 1. High compliance -> APPROVED_WITH_RESTOCKING_FEE
  const highRes = await fetch(`${baseUrl}/api/returns?wait=true`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      orderId: "CHS-ORD-TEST-1",
      orderTotal: 1000,
      customerName: "Polite Shopper",
      itemTitle: "Single Left Tube Sock (Slightly Damp)",
      reason: "Item arrived exactly as horribly described",
      zodiacSign: "Virgo (Actually Read the Return Policy)",
      apologyText: "I am deeply sorry Warehouse B",
      moonlightConfirmed: true,
      boxAirPreserved: true,
      spiderChecksPassed: true,
    }),
  });
  assert.equal(highRes.status, 201);
  const highData = await highRes.json();
  assert.equal(highData.execution.status, "COMPLETED");
  assert.equal(highData.execution.output.decision, "APPROVED_WITH_RESTOCKING_FEE");
  assert.equal(highData.execution.output.redTapeRounds, 3);
  assert.equal(highData.execution.output.checks.length, 4);
  assert.equal(highData.execution.output.refundAmount, 580);

  // 2. Partial compliance -> APPROVED_STORE_CREDIT
  const midRes = await fetch(`${baseUrl}/api/returns?wait=true`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      orderId: "CHS-ORD-TEST-2",
      orderTotal: 200,
      customerName: "Medium Shopper",
      itemTitle: "Half a Brick",
      reason: "Too much structural chaos for my studio apartment",
      zodiacSign: "Ophiuchus (Illegal 13th Sign — Extra Audit)",
      apologyText: "sorry",
      moonlightConfirmed: true,
      boxAirPreserved: false,
      spiderChecksPassed: true,
    }),
  });
  assert.equal(midRes.status, 201);
  const midData = await midRes.json();
  assert.equal(midData.execution.status, "COMPLETED");
  assert.equal(midData.execution.output.decision, "APPROVED_STORE_CREDIT");
  assert.equal(midData.execution.output.redTapeRounds, 3);
  assert.ok(midData.execution.output.storeCreditAmount > 0);
  assert.ok(midData.execution.output.couponCode.startsWith("TUE-2AM-"));

  // 3. Low compliance -> DENIED_WITH_COUPON
  const lowRes = await fetch(`${baseUrl}/api/returns?wait=true`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      orderId: "CHS-ORD-TEST-3",
      orderTotal: 500,
      customerName: "Defiant Shopper",
      itemTitle: "Unidentified Beige Cube",
      reason: "Catapult missed my house by 3 blocks",
      zodiacSign: "Scorpio (Leaving Furious 5-Star Reviews)",
      apologyText: "no",
      moonlightConfirmed: false,
      boxAirPreserved: false,
      spiderChecksPassed: false,
    }),
  });
  assert.equal(lowRes.status, 201);
  const lowData = await lowRes.json();
  assert.equal(lowData.execution.status, "COMPLETED");
  assert.equal(lowData.execution.output.decision, "DENIED_WITH_COUPON");
  assert.equal(lowData.execution.output.redTapeRounds, 3);
  assert.ok(lowData.execution.output.couponCode.startsWith("SORRY17C-"));
});

test("AWS Lambda handler handles API Gateway v2 HTTP events cleanly", async () => {
  const event = {
    version: "2.0",
    routeKey: "GET /api/products",
    rawPath: "/api/products",
    rawQueryString: "",
    headers: { host: "example.execute-api.us-east-1.amazonaws.com" },
    requestContext: {
      http: { method: "GET", path: "/api/products", protocol: "HTTP/1.1", sourceIp: "127.0.0.1" },
    },
    isBase64Encoded: false,
  };
  const response = await lambdaHandler(event, {});
  assert.equal(response.statusCode, 200);
  const parsed = JSON.parse(response.body);
  assert.ok(Array.isArray(parsed.products));
  assert.ok(parsed.products.length >= 6);
});
