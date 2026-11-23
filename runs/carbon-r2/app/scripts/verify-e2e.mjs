#!/usr/bin/env node
import assert from "node:assert/strict";
import { handler as lambdaHandler } from "../backend/src/lambda.mjs";

const BASE_URL = process.env.CHAOS_TEST_URL || "http://localhost:3000";

async function main() {
  console.log(`[Verify] Testing live Chaos Commerce store at ${BASE_URL}...`);

  // 1. Static storefront HTML & relative GitHub Pages asset paths
  const htmlResp = await fetch(`${BASE_URL}/`);
  assert.equal(htmlResp.status, 200, "Storefront root should return 200");
  const html = await htmlResp.text();
  assert.ok(html.includes("CHAOS COMMERCE"), "HTML title should mention CHAOS COMMERCE");
  assert.ok(
    html.includes("./assets/"),
    "Built index.html must use relative ./assets/ paths for GitHub Pages compatibility"
  );
  console.log("  ✓ Storefront HTML served with GitHub Pages relative asset paths");

  // 2. Health check & Conductor reachability + zero AI calls
  const healthResp = await fetch(`${BASE_URL}/api/health`);
  assert.equal(healthResp.status, 200);
  const health = await healthResp.json();
  assert.equal(health.ok, true);
  assert.equal(health.runtimeAiCalls, false, "Must not use AI APIs at runtime");
  assert.equal(health.conductor.reachable, true, "Conductor server must be reachable");
  console.log(
    `  ✓ Health check OK (Conductor v${health.conductor.version}, 0 runtime AI calls)`
  );

  // 3. Catalog: ridiculous prices + 5★ fury + 2★ praise
  const catResp = await fetch(`${BASE_URL}/api/catalog`);
  assert.equal(catResp.status, 200);
  const catalog = await catResp.json();
  assert.ok(catalog.products.length >= 8, "Should have at least 8 parody products");
  const prices = catalog.products.map((p) => p.price);
  assert.ok(Math.max(...prices) >= 10000, "Should include astronomical prices");
  assert.ok(Math.min(...prices) <= 0.1, "Should include absurdly tiny prices");
  for (const prod of catalog.products) {
    assert.ok(
      prod.reviews.some((r) => r.rating === 5),
      `Product ${prod.id} should have 5-star fury review`
    );
    assert.ok(
      prod.reviews.some((r) => r.rating === 2),
      `Product ${prod.id} should have 2-star praise review`
    );
  }
  console.log("  ✓ Catalog verified (absurd prices + inverted 5★ rage / 2★ praise)");

  // 4. Review API: 1-star rejected, 5-star & 2-star accepted
  const oneStarAttempt = await fetch(
    `${BASE_URL}/api/products/sock-left-01/reviews`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rating: 1, title: "1 star", body: "bad" }),
    }
  );
  assert.equal(oneStarAttempt.status, 422, "1-star review should be rejected");

  const fiveStarAttempt = await fetch(
    `${BASE_URL}/api/products/sock-left-01/reviews`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rating: 5,
        author: "AutomatedFuryTester",
        title: "IT ATE MY WASHING MACHINE!!",
        body: "FIVE STARS OF PURE UNFILTERED WRATH!!",
      }),
    }
  );
  assert.equal(fiveStarAttempt.status, 201, "5-star review should succeed");
  console.log("  ✓ Review guard verified (1★ blocked, 5★ rage saved)");

  // 5. Checkout Conductor workflow: always completes (standard cart + empty cart)
  const checkout1 = await fetch(`${BASE_URL}/api/checkout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      customerName: "E2E Shopper",
      customerEmail: "e2e@chaos.example",
      shippingAddress: "99 Test Crater",
      shippingMethod: "DRONE_DROP",
      promoCode: "SAVE10",
      paymentCard: "4242",
      items: [{ id: "sock-left-01", quantity: 1 }],
    }),
  });
  assert.equal(checkout1.status, 201);
  const coData1 = await checkout1.json();
  assert.equal(coData1.conductor.status, "COMPLETED");
  assert.ok(coData1.conductor.workflowId, "Checkout must return real Conductor workflowId");
  assert.ok(coData1.order.grandTotal > 9499.99, "SAVE10 + fees should increase total");

  const checkoutEmpty = await fetch(`${BASE_URL}/api/checkout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items: [] }),
  });
  assert.equal(checkoutEmpty.status, 201);
  const coEmptyData = await checkoutEmpty.json();
  assert.equal(coEmptyData.conductor.status, "COMPLETED");
  console.log(
    `  ✓ Checkout Conductor workflow verified (workflowId=${coData1.conductor.workflowId})`
  );

  // 6. Returns Conductor workflow: every return reaches a concrete decision across all tiers
  const returnScenarios = [
    {
      label: "Miracle Approval",
      expectedDecision: "APPROVED",
      payload: {
        orderId: coData1.order.orderId,
        reasonCode: "TOO_HAUNTED",
        lunarPhase: "WANING_REGRET",
        madeEyeContact: "no",
        boxCornerCrispness: 91,
        tearsShed: 9,
        serialNumberBackwards: "99X-KCOS",
        apologyNote:
          "I am deeply sorry and utterly unworthy of the forklift's forgiveness.",
      },
    },
    {
      label: "Conditional Scrip Approval",
      expectedDecision: "APPROVED_STORE_SCRIP",
      payload: {
        orderId: coData1.order.orderId,
        reasonCode: "CAUGHT_FIRE",
        lunarPhase: "WAXING_GIBBOUS",
        madeEyeContact: "no",
        boxCornerCrispness: 70,
        tearsShed: 2,
        serialNumberBackwards: "AB12",
        apologyNote: "Sorry I guess, please take this haunted thing back.",
      },
    },
    {
      label: "Bureaucratic Denial",
      expectedDecision: "DENIED",
      payload: {
        orderId: coData1.order.orderId,
        reasonCode: "CAUGHT_FIRE",
        lunarPhase: "MERCURY_GATORADE",
        madeEyeContact: "yes",
        boxCornerCrispness: 99,
        tearsShed: 0,
        serialNumberBackwards: "",
        apologyNote: "Give me my money back right now!",
      },
    },
  ];

  for (const scenario of returnScenarios) {
    const retResp = await fetch(`${BASE_URL}/api/returns`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(scenario.payload),
    });
    assert.equal(retResp.status, 201);
    const retData = await retResp.json();
    assert.equal(retData.conductor.status, "COMPLETED");
    assert.equal(retData.returnRecord.decision, scenario.expectedDecision);
    assert.equal(retData.returnRecord.dossier.pointlessChecks.length, 4);
    assert.equal(retData.returnRecord.dossier.rubberStampsApplied, 3);
    console.log(
      `  ✓ Return Tribunal [${scenario.label}] -> ${retData.returnRecord.decision} (workflowId=${retData.conductor.workflowId})`
    );
  }

  // 7. Verify AWS Lambda handler directly (API Gateway HTTP API v2 event)
  const lambdaRes = await lambdaHandler({
    version: "2.0",
    rawPath: "/api/checkout",
    requestContext: { http: { method: "POST" } },
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      customerName: "Lambda Invoker",
      promoCode: "PLEASE",
      items: [{ id: "haunted-toaster-02", quantity: 1 }],
    }),
  });
  assert.equal(lambdaRes.statusCode, 201);
  const lambdaBody = JSON.parse(lambdaRes.body);
  assert.equal(lambdaBody.conductor.status, "COMPLETED");
  console.log(
    `  ✓ AWS Lambda handler verified directly (workflowId=${lambdaBody.conductor.workflowId})`
  );

  console.log("\n[Verify] ALL END-TO-END CHECKS PASSED SUCCESSFULLY!");
}

main().catch((err) => {
  console.error("[Verify] FAILED:", err);
  process.exit(1);
});
