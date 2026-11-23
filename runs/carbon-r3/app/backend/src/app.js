import { getConfig } from "./config.js";
import {
  SHIPPING_METHODS,
  PAYMENT_METHODS,
  PROMO_CODES,
  SUPPORT_BOT_REPLIES
} from "./catalog.js";
import {
  loadState,
  getProductsWithReviews,
  addProductReview,
  recordOneStarDodge,
  recordCompletedOrder,
  recordCompletedReturn
} from "./store-state.js";
import { computeAbsurdPricing } from "./workers.js";
import {
  executeWorkflowGuaranteed,
  getConductorStatusSummary,
  listChaosExecutions,
  getChaosExecutionById
} from "./conductor-client.js";

function jsonResponse(statusCode, payload, corsOrigin = "*") {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": corsOrigin,
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type,Authorization,X-Requested-With"
    },
    body: JSON.stringify(payload)
  };
}

export async function handleApiRequest({ method, pathname, query = {}, body = null }) {
  const cfg = getConfig();
  const upperMethod = String(method || "GET").toUpperCase();

  if (upperMethod === "OPTIONS") {
    return jsonResponse(204, {}, cfg.corsOrigin);
  }

  try {
    if (upperMethod === "GET" && pathname === "/api/health") {
      const conductor = await getConductorStatusSummary();
      const state = loadState();
      return jsonResponse(
        200,
        {
          ok: true,
          service: "chaos-commerce",
          pid: process.pid,
          runtimeAiCalls: 0,
          oneStarDodges: state.oneStarDodges,
          conductor
        },
        cfg.corsOrigin
      );
    }

    if (upperMethod === "GET" && pathname === "/api/catalog") {
      const state = loadState();
      return jsonResponse(
        200,
        {
          products: getProductsWithReviews(),
          shippingMethods: Object.values(SHIPPING_METHODS),
          paymentMethods: Object.values(PAYMENT_METHODS),
          promoCodes: Object.values(PROMO_CODES),
          oneStarDodges: state.oneStarDodges
        },
        cfg.corsOrigin
      );
    }

    if (upperMethod === "POST" && pathname === "/api/cart/quote") {
      const quote = computeAbsurdPricing(body || {});
      return jsonResponse(200, { ok: true, quote }, cfg.corsOrigin);
    }

    const reviewMatch = pathname.match(/^\/api\/products\/([^/]+)\/reviews$/);
    if (upperMethod === "POST" && reviewMatch) {
      const productId = decodeURIComponent(reviewMatch[1]);
      const review = addProductReview(productId, body || {});
      if (!review) {
        return jsonResponse(
          404,
          { ok: false, error: "Product vanished into warehouse void." },
          cfg.corsOrigin
        );
      }
      const state = loadState();
      return jsonResponse(
        201,
        {
          ok: true,
          review,
          oneStarDodges: state.oneStarDodges
        },
        cfg.corsOrigin
      );
    }

    if (upperMethod === "POST" && pathname === "/api/reviews/one-star-dodge") {
      const total = recordOneStarDodge(body?.count || 1);
      return jsonResponse(
        200,
        {
          ok: true,
          oneStarDodges: total
        },
        cfg.corsOrigin
      );
    }

    if (upperMethod === "GET" && pathname === "/api/orders") {
      const state = loadState();
      return jsonResponse(200, { orders: state.orders }, cfg.corsOrigin);
    }

    if (upperMethod === "POST" && pathname === "/api/checkout") {
      const payload = body || {};
      const items = Array.isArray(payload.items) && payload.items.length > 0
        ? payload.items
        : [
            {
              id: "chewed-paperclip-2019",
              name: "Artisanal Pre-Chewed Paperclip (EmergencyImpulse Add-On)",
              price: 49999.99,
              quantity: 1
            }
          ];

      const orderId =
        String(payload.orderId || "").trim() ||
        `ORD-CHAOS-${Date.now().toString(36).toUpperCase()}`;

      const itemCount = items.reduce(
        (sum, i) => sum + Math.max(1, Number(i.quantity) || 1),
        0
      );

      const workflowInput = {
        orderId,
        customerName:
          String(payload.customerName || "Anonymous Thrill-Shopper").trim() ||
          "Anonymous Thrill-Shopper",
        customerEmail:
          String(payload.customerEmail || "regrets@example.com").trim() ||
          "regrets@example.com",
        items,
        itemCount,
        promoCode: String(payload.promoCode || "").trim(),
        shippingMethod: String(payload.shippingMethod || "blindfolded_pigeon"),
        paymentMethod: String(payload.paymentMethod || "guessed_card"),
        chaosNotes:
          String(
            payload.chaosNotes || "Please do not throw at prize begonias."
          ).trim()
      };

      const execution = await executeWorkflowGuaranteed(
        "chaos_checkout_workflow",
        workflowInput
      );

      const receipt = execution.output?.receipt || {};
      const savedOrder = recordCompletedOrder({
        orderId,
        workflowId: execution.workflowId,
        createdAt: new Date().toISOString(),
        customerName: workflowInput.customerName,
        customerEmail: workflowInput.customerEmail,
        items,
        grandTotal: execution.output?.grandTotal ?? receipt?.pricing?.grandTotal ?? 0,
        trackingNumber:
          execution.output?.trackingNumber ?? receipt?.shipment?.trackingNumber ?? "",
        chaosTier: execution.output?.chaosTier ?? receipt?.chaosTier ?? "MILDLY_UNHINGED",
        status: execution.status,
        receipt
      });

      return jsonResponse(
        200,
        {
          ok: true,
          order: savedOrder,
          receipt,
          workflowExecution: execution
        },
        cfg.corsOrigin
      );
    }

    if (upperMethod === "GET" && pathname === "/api/returns") {
      const state = loadState();
      return jsonResponse(200, { returns: state.returns }, cfg.corsOrigin);
    }

    if (upperMethod === "POST" && pathname === "/api/returns") {
      const payload = body || {};
      const returnId =
        String(payload.returnId || "").trim() ||
        `RET-CHAOS-${Date.now().toString(36).toUpperCase()}`;

      const workflowInput = {
        returnId,
        orderId: String(payload.orderId || "ORD-CHAOS-0001").trim() || "ORD-CHAOS-0001",
        itemName:
          String(
            payload.itemName || "Artisanal Pre-Chewed Paperclip (Vintage Q3 2019)"
          ).trim(),
        itemPrice: Number.isFinite(Number(payload.itemPrice))
          ? Number(payload.itemPrice)
          : 49999.99,
        customerName:
          String(payload.customerName || "Exhausted Return Applicant").trim() ||
          "Exhausted Return Applicant",
        reason:
          String(
            payload.reason || "Arrived humming ominously and judged my wallpaper."
          ).trim(),
        moonExposure: String(payload.moonExposure || "no_curtains_drawn"),
        astrologyExcuse: String(payload.astrologyExcuse || "mercury_retrograde"),
        boxEmotionalState: String(payload.boxEmotionalState || "quietly_weeping"),
        apologizedToBubbleWrap: Boolean(payload.apologizedToBubbleWrap),
        blinkCount: Number(payload.blinkCount ?? 7),
        backwardDeclaration: String(payload.backwardDeclaration || ""),
        swornNotSimultaneouslyTuesdayAndThursday: Boolean(
          payload.swornNotSimultaneouslyTuesdayAndThursday ?? true
        )
      };

      const execution = await executeWorkflowGuaranteed(
        "chaos_return_workflow",
        workflowInput
      );

      const out = execution.output || {};
      const savedReturn = recordCompletedReturn({
        returnId,
        orderId: workflowInput.orderId,
        itemName: workflowInput.itemName,
        workflowId: execution.workflowId,
        createdAt: new Date().toISOString(),
        decisionStatus: out.decisionStatus || "DECIDED",
        decision: out.decision || "APPROVED_CHAOS_STORE_CREDIT",
        rmaNumber: out.rmaNumber || `RMA-${returnId}`,
        verdictTitle: out.verdictTitle || "Decision Reached by Chaos Tribunal",
        verdictSummary: out.verdictSummary || "Binding decision rendered.",
        refundAmount: out.refundAmount ?? 0,
        storeCreditAmount: out.storeCreditAmount ?? 0,
        consolationCoupon: out.consolationCoupon ?? null,
        rubberStampsApplied: out.rubberStampsApplied ?? 2,
        stampsTrail: out.stampsTrail || [],
        pointlessChecksReport: out.pointlessChecksReport || []
      });

      return jsonResponse(
        200,
        {
          ok: true,
          returnDecision: savedReturn,
          workflowExecution: execution
        },
        cfg.corsOrigin
      );
    }

    if (upperMethod === "GET" && pathname === "/api/workflows/executions") {
      const executions = await listChaosExecutions(query.limit || 15);
      return jsonResponse(200, { ok: true, executions }, cfg.corsOrigin);
    }

    const execMatch = pathname.match(/^\/api\/workflows\/executions\/([^/]+)$/);
    if (upperMethod === "GET" && execMatch) {
      const wfId = decodeURIComponent(execMatch[1]);
      const execution = await getChaosExecutionById(wfId);
      return jsonResponse(200, { ok: true, execution }, cfg.corsOrigin);
    }

    if (upperMethod === "POST" && pathname === "/api/support-chat") {
      const msg = String(body?.message || "");
      const idx =
        msg
          .split("")
          .reduce((acc, ch) => acc + ch.charCodeAt(0), 0) %
        SUPPORT_BOT_REPLIES.length;
      return jsonResponse(
        200,
        {
          ok: true,
          reply: SUPPORT_BOT_REPLIES[idx],
          queuePosition: 94218 + (msg.length * 137)
        },
        cfg.corsOrigin
      );
    }

    return jsonResponse(
      404,
      {
        ok: false,
        error: `Chaos API endpoint '${pathname}' fell behind a filing cabinet.`
      },
      cfg.corsOrigin
    );
  } catch (err) {
    return jsonResponse(
      500,
      {
        ok: false,
        error: err.message || "Unexpected warehouse implosion"
      },
      cfg.corsOrigin
    );
  }
}
