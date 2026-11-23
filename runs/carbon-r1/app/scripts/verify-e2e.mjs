import assert from "node:assert/strict";

const STORE_URL = process.env.STORE_URL || "http://localhost:3000";
const CONDUCTOR_API = process.env.CONDUCTOR_SERVER_URL || "http://localhost:8080/api";

async function getJson(url, init) {
  const resp = await fetch(url, init);
  const body = await resp.json();
  return { status: resp.status, body };
}

console.log(`=== Chaos Commerce End-to-End Verification (${STORE_URL}) ===`);

// 1. Verify Frontend HTML is served at http://localhost:3000
const htmlResp = await fetch(STORE_URL);
assert.equal(htmlResp.status, 200, "Storefront HTML should return 200");
const html = await htmlResp.text();
assert.match(html, /CHAOS COMMERCE/i, "Storefront HTML title should include CHAOS COMMERCE");
console.log("✓ Storefront served at http://localhost:3000");

// 2. Verify Health & Conductor Registration + Zero Runtime AI APIs
const health = await getJson(`${STORE_URL}/api/health`);
assert.equal(health.status, 200);
assert.equal(health.body.ok, true, "Backend health should report ok=true");
assert.equal(health.body.runtimeAiApisUsed, false, "Must not use AI APIs at runtime");
assert.ok(
  health.body.conductor.registeredWorkflows.includes("chaos_checkout_workflow"),
  "chaos_checkout_workflow must be registered"
);
assert.ok(
  health.body.conductor.registeredWorkflows.includes("chaos_return_workflow"),
  "chaos_return_workflow must be registered"
);
assert.equal(
  health.body.conductor.registeredTasks.length >= 5,
  true,
  "All 5 SIMPLE task definitions must be registered"
);
console.log("✓ Health check & Conductor Worker Gate verified");

// 3. Verify Products, Ridiculous Prices, 5★ Fury Reviews & 2★ Praise Reviews
const productsRes = await getJson(`${STORE_URL}/api/products`);
assert.equal(productsRes.status, 200);
assert.ok(productsRes.body.products.length >= 8, "Should serve absurd catalog");
const sampleProd = productsRes.body.products[0];
assert.ok(sampleProd.price > 500, "Prices should be ridiculous");
const fiveStar = sampleProd.reviews.find((r) => r.stars === 5);
const twoStar = sampleProd.reviews.find((r) => r.stars === 2);
assert.ok(fiveStar, "Product should have 5-star fury review");
assert.ok(twoStar, "Product should have 2-star praise review");
console.log("✓ Catalog & inverted 5★ fury / 2★ praise reviews verified");

// 4. Verify Review Submission
const reviewPost = await getJson(`${STORE_URL}/api/products/${sampleProd.id}/reviews`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    author: "E2E Tester",
    stars: 5,
    title: "THE 1-STAR BUTTON JUKED ME 14 TIMES!!",
    body: "SO ANGRY I HAD TO RATE 5 STARS!!",
    dodgeAttemptsBeforeSurrender: 14
  })
});
assert.equal(reviewPost.status, 201);
assert.equal(reviewPost.body.review.stars, 5);
console.log("✓ Review submission verified");

// 5. Verify Checkout Workflow on Conductor (via live :3000 daemon workers)
for (const tier of ["catapult", "raccoons", "glacier"]) {
  const checkout = await getJson(`${STORE_URL}/api/checkout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      customerName: `Shopper (${tier})`,
      customerEmail: "shopper@chaos.example",
      shippingAddress: "123 Absurd Way",
      shippingTier: tier,
      paymentMethod: "credit_card_of_regret",
      couponCode: tier === "catapult" ? "SAVE10" : "PLEASE",
      chaosInsurance: true,
      items: [{ productId: sampleProd.id, quantity: 1 }]
    })
  });
  assert.equal(checkout.status, 200, `Checkout (${tier}) must return HTTP 200`);
  assert.equal(checkout.body.status, "COMPLETED", `Checkout (${tier}) must COMPLETE on Conductor`);
  assert.ok(checkout.body.workflowId, "Must return real Conductor workflowId");

  // Double-check directly against Conductor REST API at :8080/api
  const rawWf = await getJson(`${CONDUCTOR_API}/workflow/${checkout.body.workflowId}`);
  assert.equal(rawWf.status, 200);
  assert.equal(rawWf.body.status, "COMPLETED");
  assert.equal(rawWf.body.workflowName, "chaos_checkout_workflow");
  console.log(
    `✓ Checkout (${tier}) COMPLETED on Conductor: workflowId=${checkout.body.workflowId}, total=$${checkout.body.order.receipt.grandTotal}`
  );
}

// 6. Verify Return Workflow on Conductor reaches a decision across all branches
const returnScenarios = [
  {
    label: "Miracle Refund",
    payload: {
      orderId: "CHC-TEST-1",
      itemName: sampleProd.name,
      itemPrice: sampleProd.price,
      reason: "existential_regret",
      moonPhase: "suspiciously_cheese",
      eyeContactSeconds: 25,
      originalAirPercent: 90,
      tapeStripCount: 7,
      tearsShed: 5,
      sworeHubrisOath: true,
      didNotFeedAfterMidnight: true,
      apologyText: "Dear Warehouse Forklift #4, I am sorry for my hubris and beg forgiveness."
    },
    expectedDecision: "APPROVED_MIRACLE_REFUND"
  },
  {
    label: "Partial Minus Sighing Fees",
    payload: {
      orderId: "CHC-TEST-2",
      itemName: sampleProd.name,
      itemPrice: 1000,
      reason: "hummed_at_cat",
      moonPhase: "waxing_gibbous",
      eyeContactSeconds: 18,
      originalAirPercent: 80,
      tapeStripCount: 6,
      tearsShed: 3,
      sworeHubrisOath: true,
      didNotFeedAfterMidnight: true,
      apologyText: "Sorry Forklift #4 for my regretful mistake."
    },
    expectedDecision: "APPROVED_PARTIAL_REFUND"
  },
  {
    label: "Chaos Bucks Store Credit",
    payload: {
      orderId: "CHC-TEST-2B",
      itemName: sampleProd.name,
      itemPrice: 500,
      reason: "spouse_saw_statement",
      moonPhase: "waxing_gibbous",
      eyeContactSeconds: 4,
      originalAirPercent: 80,
      tapeStripCount: 6,
      tearsShed: 0,
      sworeHubrisOath: true,
      didNotFeedAfterMidnight: true,
      apologyText: "take it"
    },
    expectedDecision: "APPROVED_CHAOS_CREDIT"
  },
  {
    label: "Tribunal Denial",
    payload: {
      orderId: "CHC-TEST-3",
      itemName: sampleProd.name,
      itemPrice: 749.5,
      reason: "looked_at_it_wrong",
      moonPhase: "indoors_ceiling",
      eyeContactSeconds: 1,
      originalAirPercent: 5,
      tapeStripCount: 44,
      tearsShed: 0,
      sworeHubrisOath: false,
      didNotFeedAfterMidnight: false,
      apologyText: "no"
    },
    expectedDecision: "DENIED_BY_TRIBUNAL"
  }
];

for (const sc of returnScenarios) {
  const ret = await getJson(`${STORE_URL}/api/returns`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(sc.payload)
  });
  assert.equal(ret.status, 200);
  assert.equal(ret.body.status, "COMPLETED");
  assert.equal(ret.body.decision.decisionReached, true);
  assert.equal(ret.body.decision.decisionCode, sc.expectedDecision);

  const rawWf = await getJson(`${CONDUCTOR_API}/workflow/${ret.body.workflowId}`);
  assert.equal(rawWf.body.status, "COMPLETED");
  assert.equal(rawWf.body.workflowName, "chaos_return_workflow");
  console.log(
    `✓ Return (${sc.label}) COMPLETED on Conductor: workflowId=${ret.body.workflowId} -> ${ret.body.decision.decisionCode}`
  );
}

console.log("=== ALL CHAOS COMMERCE E2E VERIFICATIONS PASSED ===");
