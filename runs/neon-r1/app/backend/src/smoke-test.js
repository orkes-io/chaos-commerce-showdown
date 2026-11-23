import assert from "node:assert/strict";
import { handler as lambdaHandler } from "./lambda.js";

const BASE = process.env.STORE_URL || "http://localhost:3000";

async function jsonFetch(url, options) {
  const res = await fetch(url, options);
  const data = await res.json();
  return { status: res.status, data };
}

async function run() {
  console.log(`[smoke] Testing Chaos Commerce at ${BASE}...`);

  // 1. Frontend HTML
  const homeRes = await fetch(BASE);
  assert.equal(homeRes.status, 200, "Homepage should return HTTP 200");
  const homeHtml = await homeRes.text();
  assert.match(homeHtml, /CHAOS COMMERCE/i, "Homepage HTML should include store title");
  console.log("  ✓ Homepage served at /");

  // 2. Health & Conductor registration
  const health = await jsonFetch(`${BASE}/api/health`);
  assert.equal(health.status, 200);
  assert.equal(health.data.conductor.reachable, true, "Conductor must be reachable");
  assert.equal(health.data.conductor.hasCheckoutWorkflow, true);
  assert.equal(health.data.conductor.hasReturnWorkflow, true);
  console.log(`  ✓ Conductor healthy at ${health.data.conductor.serverUrl}`);

  // 3. Catalog check (ridiculous prices + 5★ fury + 2★ praise)
  const catalog = await jsonFetch(`${BASE}/api/catalog`);
  assert.equal(catalog.status, 200);
  assert.ok(catalog.data.products.length >= 8, "Should have at least 8 products");
  const clip = catalog.data.products[0];
  assert.ok(clip.price >= 9000, "Paperclip should have ridiculous price");
  assert.ok(clip.reviews.some((r) => r.rating === 5), "Should have 5-star fury review");
  assert.ok(clip.reviews.some((r) => r.rating === 2), "Should have 2-star praise review");
  console.log(`  ✓ Catalog verified (${catalog.data.products.length} absurd products)`);

  // 4. Reverse promo quote check
  const quote = await jsonFetch(`${BASE}/api/quote`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      items: [{ productId: "deconstructed-ice", quantity: 1 }],
      shippingMethod: "snail_helmet",
      promoCode: "SAVE50",
      addons: [],
    }),
  });
  assert.equal(quote.status, 200);
  assert.equal(quote.data.promoPenalty, 50, "SAVE50 should ADD $50");
  console.log("  ✓ Reverse promo code SAVE50 added +$50.00");

  // 5. Server-side 1-star review sabotage
  const sneakyReview = await jsonFetch(`${BASE}/api/products/paperclip-prebent/reviews`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      author: "Smoke Tester",
      rating: 1,
      title: "Trying to sneak a 1-star review",
      body: "Testing API guard",
    }),
  });
  assert.equal(sneakyReview.status, 201);
  assert.equal(sneakyReview.data.review.rating, 5, "1-star review should auto-upgrade to 5★");
  console.log("  ✓ Sneaky 1-star API review auto-upgraded to 5★");

  // 6. Checkout workflow — VIP branch (grandTotal >= $5000)
  const vipCheckout = await jsonFetch(`${BASE}/api/checkout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      customer: { name: "VIP Tester", email: "vip@example.com", address: "1 Chaos Way" },
      items: [{ productId: "paperclip-prebent", quantity: 1 }],
      shippingMethod: "catapult",
      paymentMethod: "imaginary_platinum",
      promoCode: "SAVE50",
      addons: ["void_warranty"],
    }),
  });
  assert.equal(vipCheckout.status, 201);
  assert.equal(vipCheckout.data.order.status, "COMPLETED");
  assert.equal(vipCheckout.data.workflow.status, "COMPLETED");
  assert.equal(vipCheckout.data.order.payment.tier, "VIP_CHAOS_HIGH_ROLLER");
  console.log(
    `  ✓ Conductor checkout (VIP branch) COMPLETED: ${vipCheckout.data.workflow.workflowId} (${vipCheckout.data.workflow.taskCount} tasks, ${vipCheckout.data.workflow.durationMs}ms)`
  );

  // 7. Checkout workflow — Standard branch (grandTotal < $5000)
  const stdCheckout = await jsonFetch(`${BASE}/api/checkout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      customer: { name: "Std Tester", email: "std@example.com", address: "2 Chaos Way" },
      items: [{ productId: "deconstructed-ice", quantity: 1 }],
      shippingMethod: "snail_helmet",
      paymentMethod: "napkin_iou",
      promoCode: "",
      addons: [],
    }),
  });
  assert.equal(stdCheckout.status, 201);
  assert.equal(stdCheckout.data.order.status, "COMPLETED");
  assert.equal(stdCheckout.data.workflow.status, "COMPLETED");
  assert.equal(stdCheckout.data.order.payment.tier, "STANDARD_CHAOS");
  console.log(
    `  ✓ Conductor checkout (Standard branch) COMPLETED: ${stdCheckout.data.workflow.workflowId} (${stdCheckout.data.workflow.taskCount} tasks, ${stdCheckout.data.workflow.durationMs}ms)`
  );

  // 8. Return workflow — test all 3 decision branches!
  const returnScenarios = [
    { regretLevel: "Existential", expectedType: "APPROVED_CHAOS_CREDIT" },
    { regretLevel: "Severe", expectedType: "PARTIAL_REFUND" },
    { regretLevel: "Mild", expectedType: "DENIED_WITH_CONSOLATION" },
  ];

  for (const sc of returnScenarios) {
    const ret = await jsonFetch(`${BASE}/api/returns`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orderId: vipCheckout.data.order.orderId,
        itemName: "Artisanal Single Paperclip (Pre-Bent)",
        paidAmount: vipCheckout.data.order.receipt.grandTotal,
        reason: "It stared at me disrespectfully",
        moonPhase: "Waxing Gibbous",
        regretLevel: sc.regretLevel,
        captchaAnswer: "Wet Socks, Tax Audit",
        customerEmail: "vip@example.com",
      }),
    });
    assert.equal(ret.status, 201);
    assert.equal(ret.data.workflow.status, "COMPLETED");
    assert.equal(ret.data.returnRequest.decision.decisionStatus, "DECIDED");
    assert.ok(ret.data.returnRequest.stampsCollected >= 2, "DO_WHILE should collect >= 2 stamps");
    if (sc.expectedType) {
      assert.equal(ret.data.returnRequest.decision.decisionType, sc.expectedType);
    }
    console.log(
      `  ✓ Conductor return (${sc.regretLevel}) DECIDED [${ret.data.returnRequest.decision.decisionType}]: ${ret.data.workflow.workflowId} (${ret.data.returnRequest.stampsCollected} stamps, ${ret.data.workflow.taskCount} tasks, ${ret.data.workflow.durationMs}ms)`
    );
  }

  // 9. Verify AWS Lambda handler works directly with API Gateway HTTP API v2 event
  const lambdaRes = await lambdaHandler(
    {
      version: "2.0",
      routeKey: "GET /api/health",
      rawPath: "/api/health",
      rawQueryString: "",
      headers: { host: "example.execute-api.us-east-1.amazonaws.com" },
      requestContext: {
        http: { method: "GET", path: "/api/health", sourceIp: "127.0.0.1" },
      },
      isBase64Encoded: false,
    },
    {}
  );
  assert.equal(lambdaRes.statusCode, 200, "Lambda handler should return 200 on /api/health");
  const lambdaBody = JSON.parse(lambdaRes.body);
  assert.equal(lambdaBody.conductor.reachable, true);
  console.log("  ✓ AWS Lambda handler verified with HTTP API Gateway v2 event");

  console.log("[smoke] ALL CHECKS PASSED!");
}

run().catch((err) => {
  console.error("[smoke] FAILED:", err);
  process.exit(1);
});
