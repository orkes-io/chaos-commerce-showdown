import assert from "node:assert/strict";
import { handler as lambdaHandler } from "../backend/src/lambda.js";

const BASE_URL = process.env.CHAOS_VERIFY_URL || "http://localhost:3000";

async function req(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options
  });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    // HTML or plain text
  }
  return { status: res.status, headers: res.headers, text, json };
}

async function main() {
  console.log("=== Chaos Commerce End-to-End Verification ===");

  // 1. Storefront static HTML served at http://localhost:3000
  const home = await req("/");
  assert.equal(home.status, 200, "Storefront root should return 200");
  assert.ok(
    home.text.includes("Chaos Commerce"),
    "Storefront HTML should contain Chaos Commerce title"
  );
  console.log("[PASS] Storefront HTML served at http://localhost:3000");

  // 2. Health & Conductor connectivity + zero runtime AI calls
  const health = await req("/api/health");
  assert.equal(health.status, 200);
  assert.equal(health.json.runtimeAiCalls, 0);
  assert.equal(health.json.conductor.connected, true);
  assert.ok(
    health.json.conductor.registeredWorkflows.includes("chaos_checkout_workflow")
  );
  assert.ok(
    health.json.conductor.registeredWorkflows.includes("chaos_return_workflow")
  );
  console.log("[PASS] /api/health connected to Conductor with all workflows registered");

  // 3. Catalog: ridiculous prices, 5-star fury reviews, 2-star praise reviews
  const catalog = await req("/api/catalog");
  assert.equal(catalog.status, 200);
  const products = catalog.json.products;
  assert.ok(products.length >= 8, "Should have at least 8 absurd products");
  assert.ok(products.some((p) => p.price > 40000), "Should include hyper-inflated prices");
  assert.ok(products.some((p) => p.price < 0), "Should include negative-price trap");
  assert.ok(products.some((p) => p.price > 0 && p.price < 0.1), "Should include 3-cent 747 wing");
  for (const p of products) {
    assert.ok(
      p.reviews.some((r) => r.rating === 5 && r.sentimentTag.includes("FURY")),
      `Product ${p.id} missing 5-star fury review`
    );
    assert.ok(
      p.reviews.some((r) => r.rating === 2 && r.sentimentTag.includes("PRAISE")),
      `Product ${p.id} missing 2-star praise review`
    );
  }
  console.log("[PASS] Catalog verified (ridiculous prices + 5★ fury + 2★ praise)");

  // 4. Review submission + 1-star API protection + dodge counter
  const dodgeRes = await req("/api/reviews/one-star-dodge", {
    method: "POST",
    body: JSON.stringify({ count: 3 })
  });
  assert.equal(dodgeRes.status, 200);
  assert.ok(dodgeRes.json.oneStarDodges >= 1485);

  const sneakyOneStar = await req("/api/products/chewed-paperclip-2019/reviews", {
    method: "POST",
    body: JSON.stringify({
      rating: 1,
      author: "curl_hacker",
      title: "Tried to force 1 star",
      body: "Testing 1-star auto-upgrade"
    })
  });
  assert.equal(sneakyOneStar.status, 201);
  assert.equal(sneakyOneStar.json.review.rating, 5);
  assert.equal(sneakyOneStar.json.review.autoUpgradedFromOneStar, true);
  console.log("[PASS] 1-star dodge counter & 1★→5★ server-side shield verified");

  // 5. Checkout workflow guarantee across multiple absurd edge cases
  const checkoutCases = [
    {
      name: "Negative-price brick + SAVE20 backfiring promo",
      payload: {
        customerName: "Negative Price Tester",
        customerEmail: "brick@example.com",
        items: [{ id: "cursed-mystery-brick", name: "Mystery Brick", price: -14.99, quantity: 1 }],
        promoCode: "SAVE20",
        shippingMethod: "blindfolded_pigeon",
        paymentMethod: "crayon_iou"
      }
    },
    {
      name: "Multi-item VIP delusion tier + orbital trebuchet + exposure bucks",
      payload: {
        customerName: "Big Spender",
        customerEmail: "vip@example.com",
        items: [
          { id: "chewed-paperclip-2019", name: "Paperclip", price: 49999.99, quantity: 1 },
          { id: "boeing-747-left-wing", name: "747 Wing", price: 0.03, quantity: 1 },
          { id: "canned-organic-nothing", name: "Canned Nothing", price: 9999.95, quantity: 1 }
        ],
        promoCode: "FREESHIP",
        shippingMethod: "orbital_trebuchet",
        paymentMethod: "exposure_bucks"
      }
    }
  ];

  let lastCompletedOrderId = null;
  for (const tc of checkoutCases) {
    const co = await req("/api/checkout", {
      method: "POST",
      body: JSON.stringify(tc.payload)
    });
    assert.equal(co.status, 200, `Checkout failed for ${tc.name}`);
    assert.equal(co.json.ok, true);
    assert.equal(co.json.workflowExecution.status, "COMPLETED");
    assert.equal(co.json.workflowExecution.workflowName, "chaos_checkout_workflow");
    assert.ok(co.json.order.grandTotal > 0);
    assert.ok(co.json.order.trackingNumber.startsWith("CHAOS-TRK-"));
    lastCompletedOrderId = co.json.order.orderId;
    console.log(
      `[PASS] Checkout Conductor workflow COMPLETED (${co.json.workflowExecution.workflowId}) -> ${co.json.order.orderId} ($${co.json.order.grandTotal})`
    );
  }

  // 6. Returns workflow guarantee across all 3 tribunal verdict paths
  const returnCases = [
    {
      expectedTrackDecision: "APPROVED_FULL_REFUND",
      payload: {
        orderId: lastCompletedOrderId,
        itemName: "Artisanal Pre-Chewed Paperclip",
        itemPrice: 49999.99,
        customerName: "Miracle Applicant",
        reason: "Clipped zero sheets of paper.",
        moonExposure: "howled_first",
        astrologyExcuse: "mercury_retrograde",
        boxEmotionalState: "emotionally_stable",
        apologizedToBubbleWrap: true,
        blinkCount: 7,
        backwardDeclaration: "DNUFER",
        swornNotSimultaneouslyTuesdayAndThursday: true
      }
    },
    {
      expectedTrackDecision: "APPROVED_CHAOS_STORE_CREDIT",
      payload: {
        orderId: "ORD-DIZZY-404",
        itemName: "Single Left Argyle Sock",
        itemPrice: 734.18,
        customerName: "Credit Applicant",
        reason: "Right foot got jealous.",
        moonExposure: "no_curtains_drawn",
        astrologyExcuse: "jupiter_squared_wallet",
        boxEmotionalState: "quietly_weeping",
        apologizedToBubbleWrap: true,
        blinkCount: 4,
        backwardDeclaration: "DNUF",
        swornNotSimultaneouslyTuesdayAndThursday: true
      }
    },
    {
      expectedTrackDecision: "REJECTED_BUREAUCRATIC_TECHNICALITY",
      payload: {
        orderId: "ORD-QUACK-999",
        itemName: "Lukewarm Tap Water",
        itemPrice: 412.67,
        customerName: "Technicality Applicant",
        reason: "Questionable soggy bag quality.",
        moonExposure: "yes_briefly",
        astrologyExcuse: "none_just_mad",
        boxEmotionalState: "vengeful",
        apologizedToBubbleWrap: false,
        blinkCount: 12,
        backwardDeclaration: "NOPE",
        swornNotSimultaneouslyTuesdayAndThursday: false
      }
    }
  ];

  for (const rc of returnCases) {
    const ret = await req("/api/returns", {
      method: "POST",
      body: JSON.stringify(rc.payload)
    });
    assert.equal(ret.status, 200);
    assert.equal(ret.json.ok, true);
    assert.equal(ret.json.workflowExecution.status, "COMPLETED");
    assert.equal(ret.json.workflowExecution.workflowName, "chaos_return_workflow");
    assert.equal(ret.json.returnDecision.decisionStatus, "DECIDED");
    assert.equal(ret.json.returnDecision.decision, rc.expectedTrackDecision);
    assert.ok(ret.json.returnDecision.pointlessChecksReport.length === 4);
    assert.ok(ret.json.returnDecision.stampsTrail.length >= 2);
    console.log(
      `[PASS] Return Conductor workflow COMPLETED (${ret.json.workflowExecution.workflowId}) -> ${ret.json.returnDecision.decision} (${ret.json.returnDecision.rmaNumber}, ${ret.json.returnDecision.rubberStampsApplied} rubber stamps)`
    );
  }

  // 7. AWS Lambda handler compatibility check (API Gateway HTTP API v2 + CORS preflight)
  const preflight = await lambdaHandler({
    requestContext: { http: { method: "OPTIONS" } },
    rawPath: "/api/checkout"
  });
  assert.equal(preflight.statusCode, 204);
  assert.ok(preflight.headers["Access-Control-Allow-Origin"]);

  const lambdaHealth = await lambdaHandler({
    requestContext: { http: { method: "GET" } },
    rawPath: "/api/health"
  });
  assert.equal(lambdaHealth.statusCode, 200);
  console.log("[PASS] AWS Lambda handler (API Gateway v2 + CORS) verified");

  console.log("=== ALL VERIFICATION CHECKS PASSED ===");
}

main().catch((err) => {
  console.error("[FAIL]", err);
  process.exit(1);
});
