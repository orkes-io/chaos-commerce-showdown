import crypto from "node:crypto";
import { getConfig } from "./config.mjs";
import {
  SHIPPING_OPTIONS,
  previewPromoCode,
  generateChaosBotReply,
} from "./catalog.mjs";
import {
  checkConductorHealth,
  executeWorkflowAndWait,
  getWorkflowExecution,
  searchWorkflowExecutions,
  startWorkflow,
} from "./conductor-client.mjs";
import {
  listProducts,
  getProductById,
  addProductReview,
  cacheOrderExecution,
  cacheReturnExecution,
  getCachedOrders,
  getCachedReturns,
} from "./store.mjs";

function jsonResponse(statusCode, data) {
  const config = getConfig();
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": config.corsOrigin,
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
    body: JSON.stringify(data),
  };
}

function mergeByWorkflowId(conductorList, cachedList) {
  const map = new Map();
  for (const item of cachedList) {
    if (item?.workflowId) map.set(item.workflowId, item);
  }
  for (const item of conductorList) {
    if (item?.workflowId) map.set(item.workflowId, item);
  }
  return [...map.values()].sort((a, b) => (b.startTime || 0) - (a.startTime || 0));
}

export async function routeApiRequest({ method, pathname, query = {}, body = null }) {
  const upperMethod = String(method || "GET").toUpperCase();

  if (upperMethod === "OPTIONS") {
    return jsonResponse(204, {});
  }

  // GET /api/health
  if (upperMethod === "GET" && pathname === "/api/health") {
    const conductor = await checkConductorHealth();
    return jsonResponse(200, {
      service: "chaos-commerce-backend",
      status: "ok",
      aiApisUsedAtRuntime: false,
      conductor,
      timestamp: new Date().toISOString(),
    });
  }

  // GET /api/products
  if (upperMethod === "GET" && pathname === "/api/products") {
    return jsonResponse(200, {
      products: listProducts(),
      shippingOptions: SHIPPING_OPTIONS,
    });
  }

  // GET /api/products/:id
  const productMatch = pathname.match(/^\/api\/products\/([^/]+)$/);
  if (upperMethod === "GET" && productMatch) {
    const product = getProductById(decodeURIComponent(productMatch[1]));
    if (!product) {
      return jsonResponse(404, { error: "Product vanished into the warehouse abyss." });
    }
    return jsonResponse(200, { product });
  }

  // POST /api/products/:id/reviews
  const reviewMatch = pathname.match(/^\/api\/products\/([^/]+)\/reviews$/);
  if (upperMethod === "POST" && reviewMatch) {
    const productId = decodeURIComponent(reviewMatch[1]);
    const result = addProductReview(productId, body || {});
    if (!result) {
      return jsonResponse(404, { error: "Product not found." });
    }
    return jsonResponse(201, result);
  }

  // POST /api/promo/preview
  if (upperMethod === "POST" && pathname === "/api/promo/preview") {
    const preview = previewPromoCode(body?.code, body?.subtotal);
    return jsonResponse(200, preview);
  }

  // POST /api/checkout
  if (upperMethod === "POST" && pathname === "/api/checkout") {
    const payload = body || {};
    const orderReference = `CHAOS-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;

    const catalogMap = new Map(listProducts().map((p) => [p.id, p]));
    const rawItems = Array.isArray(payload.items) ? payload.items : [];
    const items = rawItems.map((item) => {
      const matched = catalogMap.get(item.id);
      return {
        id: matched?.id || item.id || "mystery-item",
        name: matched?.name || item.name || "Mystery Regret Item",
        price: matched ? matched.price : Number(item.price) || 99.99,
        quantity: Math.max(1, Number(item.quantity) || 1),
      };
    });

    const wfInput = {
      orderReference,
      customerName: String(payload.customerName || "Valued Victim").trim() || "Valued Victim",
      customerEmail:
        String(payload.customerEmail || "shopper@chaos-commerce.example").trim() ||
        "shopper@chaos-commerce.example",
      shippingAddress:
        String(payload.shippingAddress || "742 Impulse Buy Terrace").trim() ||
        "742 Impulse Buy Terrace",
      shippingMethod: String(payload.shippingMethod || "standard_free"),
      promoCode: String(payload.promoCode || "").trim(),
      algorithmTip: Math.max(0, Number(payload.algorithmTip) || 0),
      items,
    };

    try {
      if (query.async === "true") {
        const workflowId = await startWorkflow("chaos_checkout", wfInput, {
          correlationId: orderReference,
        });
        const config = getConfig();
        return jsonResponse(202, {
          workflowId,
          orderReference,
          status: "RUNNING",
          conductorUiUrl: `${config.conductorUiUrl}/execution/${workflowId}`,
        });
      }

      const execution = await executeWorkflowAndWait("chaos_checkout", wfInput, {
        correlationId: orderReference,
      });
      cacheOrderExecution(execution);
      return jsonResponse(200, { execution });
    } catch (err) {
      return jsonResponse(502, {
        error: "Could not execute chaos_checkout workflow on Conductor.",
        detail: err?.message || String(err),
      });
    }
  }

  // GET /api/orders
  if (upperMethod === "GET" && pathname === "/api/orders") {
    const conductorOrders = await searchWorkflowExecutions("chaos_checkout", 15);
    const merged = mergeByWorkflowId(conductorOrders, getCachedOrders());
    return jsonResponse(200, { orders: merged });
  }

  // GET /api/orders/:workflowId
  const orderMatch = pathname.match(/^\/api\/orders\/([^/]+)$/);
  if (upperMethod === "GET" && orderMatch) {
    const workflowId = decodeURIComponent(orderMatch[1]);
    const execution = await getWorkflowExecution(workflowId);
    if (!execution) {
      return jsonResponse(404, { error: "Checkout workflow execution not found." });
    }
    cacheOrderExecution(execution);
    return jsonResponse(200, { execution });
  }

  // POST /api/returns
  if (upperMethod === "POST" && pathname === "/api/returns") {
    const payload = body || {};
    const orderId = String(payload.orderId || "CHAOS-MANUAL").trim() || "CHAOS-MANUAL";

    const wfInput = {
      orderId,
      customerName: String(payload.customerName || "Remorseful Shopper").trim() || "Remorseful Shopper",
      itemName: String(payload.itemName || "Regrettable Item").trim() || "Regrettable Item",
      orderTotal: Math.max(0.01, Number(payload.orderTotal) || 149.99),
      reason: String(payload.reason || "Item brought chaos into my home").trim(),
      moonPhase: String(payload.moonPhase || "Full Moon").trim(),
      raccoonDeclaration: String(payload.raccoonDeclaration || "I am not a raccoon").trim(),
      barleycornWeight: Number(payload.barleycornWeight) || 42,
      boxAura: String(payload.boxAura || "Serene Beige").trim(),
      haikuOfRegret: String(
        payload.haikuOfRegret || "I bought this dumb thing\nNow my wallet softly weeps\nPlease take it back now",
      ).trim(),
      whisperedApology: Boolean(payload.whisperedApology),
      termsRead: Boolean(payload.termsRead),
    };

    try {
      if (query.async === "true") {
        const workflowId = await startWorkflow("chaos_return", wfInput, {
          correlationId: orderId,
        });
        const config = getConfig();
        return jsonResponse(202, {
          workflowId,
          orderId,
          status: "RUNNING",
          conductorUiUrl: `${config.conductorUiUrl}/execution/${workflowId}`,
        });
      }

      const execution = await executeWorkflowAndWait("chaos_return", wfInput, {
        correlationId: orderId,
      });
      cacheReturnExecution(execution);
      return jsonResponse(200, { execution });
    } catch (err) {
      return jsonResponse(502, {
        error: "Could not execute chaos_return workflow on Conductor.",
        detail: err?.message || String(err),
      });
    }
  }

  // GET /api/returns
  if (upperMethod === "GET" && pathname === "/api/returns") {
    const conductorReturns = await searchWorkflowExecutions("chaos_return", 15);
    const merged = mergeByWorkflowId(conductorReturns, getCachedReturns());
    return jsonResponse(200, { returns: merged });
  }

  // GET /api/returns/:workflowId
  const returnMatch = pathname.match(/^\/api\/returns\/([^/]+)$/);
  if (upperMethod === "GET" && returnMatch) {
    const workflowId = decodeURIComponent(returnMatch[1]);
    const execution = await getWorkflowExecution(workflowId);
    if (!execution) {
      return jsonResponse(404, { error: "Return workflow execution not found." });
    }
    cacheReturnExecution(execution);
    return jsonResponse(200, { execution });
  }

  // GET /api/workflows/:workflowId
  const wfMatch = pathname.match(/^\/api\/workflows\/([^/]+)$/);
  if (upperMethod === "GET" && wfMatch) {
    const workflowId = decodeURIComponent(wfMatch[1]);
    const execution = await getWorkflowExecution(workflowId);
    if (!execution) {
      return jsonResponse(404, { error: "Workflow execution not found." });
    }
    return jsonResponse(200, { execution });
  }

  // POST /api/support (ChaosBot 9000 — 0% AI!)
  if (upperMethod === "POST" && pathname === "/api/support") {
    return jsonResponse(200, {
      reply: generateChaosBotReply(body?.message),
      poweredByAi: false,
    });
  }

  return jsonResponse(404, { error: `Unknown Chaos Commerce endpoint: ${upperMethod} ${pathname}` });
}
