import crypto from "node:crypto";
import { getConfig } from "./config.mjs";
import {
  SHIPPING_METHODS,
  PROMO_CODES_HINT,
} from "./catalog.mjs";
import {
  listProducts,
  getProductById,
  addProductReview,
  listOrders,
  getOrderById,
  saveOrder,
  listReturns,
  saveReturn,
} from "./store.mjs";
import {
  getConductorHealth,
  executeWorkflow,
  listRecentConductorExecutions,
} from "./conductor.mjs";

function corsHeaders(config) {
  return {
    "Access-Control-Allow-Origin": config.corsOrigin,
    "Access-Control-Allow-Methods": "GET,POST,PUT,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
  };
}

function jsonResponse(statusCode, payload, config) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...corsHeaders(config),
    },
    body: JSON.stringify(payload),
  };
}

function shortId() {
  return crypto.randomBytes(3).toString("hex").toUpperCase();
}

function deterministicChadReply(message = "") {
  const lower = String(message).toLowerCase();
  if (lower.includes("refund") || lower.includes("return") || lower.includes("money")) {
    return "Hi! I'm Chad from No-Support™. Did you submit Form 27B/6 during a Waning Regret moon without making eye contact with the cardboard? Until then, your money belongs to the CEO's yacht polish fund.";
  }
  if (lower.includes("star") || lower.includes("review") || lower.includes("button")) {
    return "Our 1-Star button is powered by free-range artisanal JavaScript reflexes. If you can't catch it, legally that means you loved your purchase!";
  }
  if (lower.includes("price") || lower.includes("expensive") || lower.includes("cheap")) {
    return "Our pricing algorithm is a blindfolded raccoon walking across a Bloomberg terminal. All totals are spiritually non-negotiable.";
  }
  if (lower.includes("ship") || lower.includes("where") || lower.includes("track")) {
    return "According to GPS, your package is currently either 400 feet directly above your chimney OR floating past Greenland on a mid-sized iceberg.";
  }
  const canned = [
    "Thank you for contacting Chaos Commerce! Your current queue position is: NaN (Estimated wait: 14 fiscal years).",
    "Have you tried lowering your expectations, unplugging your router, and apologizing to the package?",
    "I have escalated your concern directly to `/dev/null` with MAXIMUM priority!",
    "Interesting point! Unfortunately, reading customer messages voids my lunch break.",
  ];
  const idx = message.length % canned.length;
  return canned[idx];
}

export async function handleApiRequest({ method, pathname, body }) {
  const config = getConfig();
  const upperMethod = (method || "GET").toUpperCase();

  if (upperMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers: corsHeaders(config),
      body: "",
    };
  }

  // Normalize optional stage prefix when deployed behind API Gateway stages (e.g. /prod/api/...)
  const apiIndex = pathname.indexOf("/api/");
  const cleanPath =
    apiIndex >= 0 ? pathname.slice(apiIndex) : pathname.replace(/\/+$/, "") || "/";

  let parsedBody = {};
  if (body && typeof body === "string") {
    try {
      parsedBody = JSON.parse(body);
    } catch {
      return jsonResponse(400, { error: "Malformed JSON body." }, config);
    }
  } else if (body && typeof body === "object") {
    parsedBody = body;
  }

  try {
    if (upperMethod === "GET" && cleanPath === "/api/health") {
      const conductor = await getConductorHealth();
      return jsonResponse(
        200,
        {
          ok: true,
          service: "chaos-commerce-backend",
          runtimeAiCalls: false,
          conductor,
        },
        config
      );
    }

    if (upperMethod === "GET" && cleanPath === "/api/catalog") {
      return jsonResponse(
        200,
        {
          products: listProducts(),
          shippingMethods: SHIPPING_METHODS,
          promoHints: PROMO_CODES_HINT,
          conductorUiUrl: config.conductorUiUrl,
        },
        config
      );
    }

    if (upperMethod === "GET" && cleanPath === "/api/products") {
      return jsonResponse(200, { products: listProducts() }, config);
    }

    const singleProductMatch = cleanPath.match(/^\/api\/products\/([^/]+)$/);
    if (upperMethod === "GET" && singleProductMatch) {
      const product = getProductById(decodeURIComponent(singleProductMatch[1]));
      if (!product) {
        return jsonResponse(404, { error: "Product vanished into thin air." }, config);
      }
      return jsonResponse(200, { product }, config);
    }

    const reviewMatch = cleanPath.match(/^\/api\/products\/([^/]+)\/reviews$/);
    if (upperMethod === "POST" && reviewMatch) {
      const productId = decodeURIComponent(reviewMatch[1]);
      const rating = Number(parsedBody.rating);
      if (rating === 1) {
        return jsonResponse(
          422,
          {
            error:
              "Nice try using an API request! 1-Star ratings were outlawed by Corporate Decree #404.",
          },
          config
        );
      }
      if (!Number.isInteger(rating) || rating < 2 || rating > 5) {
        return jsonResponse(
          400,
          { error: "Rating must be between 2 and 5 stars." },
          config
        );
      }
      const author =
        String(parsedBody.author || "Anonymous Regretter").trim().slice(0, 50) ||
        "Anonymous Regretter";
      const title =
        String(
          parsedBody.title ||
            (rating === 5
              ? "UNHINGED FURY!! DO NOT BUY!!"
              : rating === 2
              ? "Life-changing perfection, weeping with joy!"
              : "Deeply bewildered purchase")
        )
          .trim()
          .slice(0, 120);
      const reviewBody =
        String(parsedBody.body || "").trim().slice(0, 1000) ||
        (rating === 5
          ? "THIS PRODUCT ATE MY HOMEWORK AND INSULTED MY ANCESTORS!!"
          : "Sublime quality! Exquisite! Would pay triple!");

      const badge =
        rating === 5
          ? "Verified Furious Victim"
          : rating === 2
          ? "Ecstatic Praise Poet"
          : "Confused Bystander";

      const updated = addProductReview(productId, {
        id: `rev-${Date.now()}-${shortId()}`,
        author,
        verified: badge,
        rating,
        title,
        body: reviewBody,
        date: "Just now",
      });

      if (!updated) {
        return jsonResponse(404, { error: "Product not found." }, config);
      }
      return jsonResponse(201, { product: updated }, config);
    }

    if (upperMethod === "GET" && cleanPath === "/api/orders") {
      return jsonResponse(200, { orders: listOrders() }, config);
    }

    if (upperMethod === "POST" && cleanPath === "/api/checkout") {
      const rawItems = Array.isArray(parsedBody.items) ? parsedBody.items : [];
      const normalizedItems =
        rawItems.length > 0
          ? rawItems.map((it) => {
              const catalogItem = getProductById(it.id);
              const price =
                catalogItem && typeof catalogItem.price === "number"
                  ? catalogItem.price
                  : Math.max(0.01, Number(it.price) || 99.99);
              return {
                id: String(it.id || "mystery-sku"),
                name: String(catalogItem?.name || it.name || "Unidentified Chaos Parcel"),
                price,
                quantity: Math.max(1, Math.min(99, Math.floor(Number(it.quantity) || 1))),
              };
            })
          : [
              {
                id: "empty-cart-air",
                name: "Mandatory Empty-Cart Atmospheric Inspection Fee",
                price: 49.99,
                quantity: 1,
              },
            ];

      const orderId = `ORD-${shortId()}-${String(Date.now()).slice(-4)}`;
      const workflowInput = {
        orderId,
        customerName:
          String(parsedBody.customerName || "Valued Financial Hostage").trim() ||
          "Valued Financial Hostage",
        customerEmail:
          String(parsedBody.customerEmail || "regret@chaos.example").trim() ||
          "regret@chaos.example",
        shippingAddress:
          String(
            parsedBody.shippingAddress || "742 Evergreen Sinkhole, Apt 404"
          ).trim() || "742 Evergreen Sinkhole, Apt 404",
        shippingMethod: String(parsedBody.shippingMethod || "GLACIAL").trim(),
        promoCode: String(parsedBody.promoCode || "").trim(),
        paymentLast4:
          String(parsedBody.paymentCard || parsedBody.paymentLast4 || "4242")
            .replace(/\D/g, "")
            .slice(-4) || "4242",
        items: normalizedItems,
      };

      const execution = await executeWorkflow(
        config.checkoutWorkflowName,
        workflowInput,
        orderId
      );

      if (execution.status !== "COMPLETED") {
        return jsonResponse(
          502,
          {
            error: `Checkout workflow ended in unexpected state: ${execution.status}`,
            conductor: execution,
          },
          config
        );
      }

      const orderRecord = saveOrder({
        orderId,
        createdAt: new Date().toISOString(),
        workflowId: execution.workflowId,
        conductorExecutionUrl: execution.conductorExecutionUrl,
        status: execution.output?.status || "COMPLETED_NO_TAKEBACKS",
        grandTotal: execution.output?.grandTotal ?? 0,
        receipt: execution.output?.receipt || {},
        taskTimeline: execution.taskTimeline,
      });

      return jsonResponse(
        201,
        {
          order: orderRecord,
          conductor: execution,
        },
        config
      );
    }

    if (upperMethod === "GET" && cleanPath === "/api/returns") {
      return jsonResponse(200, { returns: listReturns() }, config);
    }

    if (upperMethod === "POST" && cleanPath === "/api/returns") {
      const orderId = String(parsedBody.orderId || "ORD-CHAOS-1999").trim();
      const matchedOrder = getOrderById(orderId);
      const defaultItemName =
        matchedOrder?.receipt?.lineItems?.[0]?.name ||
        "Single Artisanal Left Sock (Pre-Lost)";
      const defaultOrderTotal =
        matchedOrder?.grandTotal ||
        matchedOrder?.receipt?.invoice?.grandTotal ||
        9499.99;

      const returnId = `RET-${shortId()}-${String(Date.now()).slice(-4)}`;
      const workflowInput = {
        returnId,
        orderId,
        itemName: String(parsedBody.itemName || defaultItemName).trim(),
        orderTotal: Number(parsedBody.orderTotal ?? defaultOrderTotal) || 99.99,
        reasonCode: String(parsedBody.reasonCode || "TOO_HAUNTED").trim(),
        lunarPhase: String(parsedBody.lunarPhase || "CLOUDY").trim(),
        madeEyeContact: String(parsedBody.madeEyeContact ?? "yes"),
        boxCornerCrispness: Number(parsedBody.boxCornerCrispness ?? 50),
        apologyNote: String(parsedBody.apologyNote || "").trim(),
        tearsShed: Number(parsedBody.tearsShed ?? 0),
        serialNumberBackwards: String(
          parsedBody.serialNumberBackwards || ""
        ).trim(),
      };

      const execution = await executeWorkflow(
        config.returnWorkflowName,
        workflowInput,
        returnId
      );

      if (execution.status !== "COMPLETED") {
        return jsonResponse(
          502,
          {
            error: `Return tribunal workflow ended in unexpected state: ${execution.status}`,
            conductor: execution,
          },
          config
        );
      }

      const returnRecord = saveReturn({
        returnId,
        orderId,
        createdAt: new Date().toISOString(),
        workflowId: execution.workflowId,
        conductorExecutionUrl: execution.conductorExecutionUrl,
        decision: execution.output?.decision || "DENIED",
        decisionTier: execution.output?.decisionTier || "DENIED_WITH_PREJUDICE",
        refundIssued: execution.output?.refundIssued ?? 0,
        dossier: execution.output?.dossier || {},
        taskTimeline: execution.taskTimeline,
      });

      return jsonResponse(
        201,
        {
          returnRecord,
          conductor: execution,
        },
        config
      );
    }

    if (upperMethod === "GET" && cleanPath === "/api/workflows/recent") {
      const executions = await listRecentConductorExecutions(20);
      return jsonResponse(
        200,
        {
          executions,
          conductorUiUrl: config.conductorUiUrl,
          conductorApiUrl: config.conductorApiUrl,
        },
        config
      );
    }

    if (upperMethod === "POST" && cleanPath === "/api/support-chat") {
      return jsonResponse(
        200,
        {
          agent: "Chad (Senior Specialist in Customer Gaslighting)",
          reply: deterministicChadReply(parsedBody.message || ""),
        },
        config
      );
    }

    return jsonResponse(
      404,
      { error: `Chaos API endpoint not found: ${upperMethod} ${cleanPath}` },
      config
    );
  } catch (err) {
    return jsonResponse(
      500,
      {
        error: err.message || "Unexpected meltdown in Chaos Commerce backend.",
      },
      config
    );
  }
}
