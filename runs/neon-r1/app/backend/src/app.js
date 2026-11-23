import express from "express";
import cors from "cors";
import { config } from "./config.js";
import {
  SHIPPING_METHODS,
  CHECKOUT_ADDONS,
  PAYMENT_METHODS,
  PROMO_CODES,
  calculateChaosPricing,
} from "./catalog.js";
import {
  getProducts,
  getProductById,
  addReview,
  recordOneStarDodge,
  getDodgeCount,
  saveOrder,
  getOrders,
  getOrderById,
  saveReturn,
  getReturns,
  getReturnById,
} from "./store.js";
import {
  checkConductorHealth,
  executeWorkflowAndWait,
  getWorkflowExecution,
  formatWorkflowTrace,
} from "./conductorClient.js";

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin: config.corsOrigin === "*" ? true : config.corsOrigin.split(","),
      methods: ["GET", "POST", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
    })
  );
  app.use(express.json({ limit: "1mb" }));

  // Health & public config
  app.get("/api/health", async (_req, res) => {
    const conductor = await checkConductorHealth();
    res.json({
      status: conductor.reachable ? "ok" : "degraded",
      service: "chaos-commerce-backend",
      runtime: config.isLambda ? "aws-lambda" : "local-node",
      conductor,
      timestamp: new Date().toISOString(),
    });
  });

  app.get("/api/config", (_req, res) => {
    res.json({
      storeName: "Chaos Commerce",
      conductorUiUrl: config.conductorUiUrl,
      oneStarDodgeReports: getDodgeCount(),
    });
  });

  // Catalog & products
  app.get("/api/catalog", (_req, res) => {
    res.json({
      products: getProducts(),
      shippingMethods: SHIPPING_METHODS,
      addons: CHECKOUT_ADDONS,
      paymentMethods: PAYMENT_METHODS,
      promoHints: Object.keys(PROMO_CODES),
      oneStarDodgeReports: getDodgeCount(),
    });
  });

  app.get("/api/products/:id", (req, res) => {
    const product = getProductById(req.params.id);
    if (!product) {
      return res.status(404).json({ error: "Product vanished into a sinkhole." });
    }
    return res.json(product);
  });

  // Reviews (with server-side 1-star sabotage backup!)
  app.post("/api/products/:id/reviews", (req, res) => {
    const product = getProductById(req.params.id);
    if (!product) {
      return res.status(404).json({ error: "Product not found." });
    }
    const review = addReview(req.params.id, req.body || {});
    return res.status(201).json({
      review,
      product,
      message: review.autoCorrectedFromOneStar
        ? "Nice try sneaking in a 1-star review via the API! Legal automatically upgraded it to 5 stars."
        : "Review published! Thank you for fueling our bafflingly high average.",
    });
  });

  app.post("/api/metrics/one-star-dodge", (_req, res) => {
    const total = recordOneStarDodge();
    res.json({ oneStarDodgeReports: total });
  });

  // Live pricing quote preview for the cart
  app.post("/api/quote", (req, res) => {
    const quote = calculateChaosPricing(req.body || {});
    res.json(quote);
  });

  // Checkout — ALWAYS runs Conductor workflow `chaos_checkout` and ALWAYS completes
  app.post("/api/checkout", async (req, res, next) => {
    try {
      const body = req.body || {};
      const orderId = `CHS-ORD-${Date.now().toString(36).toUpperCase()}-${Math.random()
        .toString(36)
        .slice(2, 6)
        .toUpperCase()}`;

      const customer = {
        name: String(body.customer?.name || "Brave Impulse Shopper").trim() || "Brave Impulse Shopper",
        email: String(body.customer?.email || "regret@chaoscommerce.invalid").trim() || "regret@chaoscommerce.invalid",
        address: String(body.customer?.address || "742 Evergreen Void, Somewhere").trim() || "742 Evergreen Void, Somewhere",
      };

      const workflowInput = {
        orderId,
        customer,
        items: Array.isArray(body.items) ? body.items : [],
        shippingMethod: body.shippingMethod || SHIPPING_METHODS[0].id,
        paymentMethod: body.paymentMethod || PAYMENT_METHODS[0].id,
        promoCode: body.promoCode || "",
        addons: Array.isArray(body.addons) ? body.addons : [],
      };

      const execution = await executeWorkflowAndWait("chaos_checkout", workflowInput, {
        version: 1,
        correlationId: orderId,
      });

      if (execution.status !== "COMPLETED") {
        throw new Error(
          `Conductor checkout workflow ended with status ${execution.status}: ${execution.reasonForIncompletion || "unknown error"}`
        );
      }

      const output = execution.output || {};
      const trace = formatWorkflowTrace(execution);

      const orderRecord = saveOrder({
        orderId: output.orderId || orderId,
        workflowId: execution.workflowId,
        status: output.status || "COMPLETED",
        createdAt: output.completedAt || new Date().toISOString(),
        customer,
        receipt: output.receipt || calculateChaosPricing(workflowInput),
        fulfillment: output.fulfillment || {},
        payment: output.payment || {},
        vibeCheck: output.vibeCheck || {},
        trackingNumber: output.trackingNumber,
        estimatedDelivery: output.estimatedDelivery,
        chaosCertificate: output.chaosCertificate,
        workflowTrace: trace,
      });

      return res.status(201).json({
        order: orderRecord,
        workflow: trace,
      });
    } catch (err) {
      return next(err);
    }
  });

  app.get("/api/orders", (_req, res) => {
    res.json({ orders: getOrders() });
  });

  app.get("/api/orders/:orderId", (req, res) => {
    const order = getOrderById(req.params.orderId);
    if (!order) {
      return res.status(404).json({ error: "Order not found." });
    }
    return res.json({ order });
  });

  // Returns — ALWAYS runs Conductor workflow `chaos_return_bureaucracy` and ALWAYS reaches a decision
  app.post("/api/returns", async (req, res, next) => {
    try {
      const body = req.body || {};
      const returnId = `CHS-RET-${Date.now().toString(36).toUpperCase()}-${Math.random()
        .toString(36)
        .slice(2, 6)
        .toUpperCase()}`;

      const linkedOrder = body.orderId ? getOrderById(body.orderId) : null;
      const firstItem = linkedOrder?.receipt?.items?.[0];

      const workflowInput = {
        returnId,
        orderId: String(body.orderId || linkedOrder?.orderId || "CHS-ORD-MYSTERY"),
        itemName: String(
          body.itemName || firstItem?.name || "Artisanal Single Paperclip (Pre-Bent)"
        ),
        paidAmount: Number(body.paidAmount || linkedOrder?.receipt?.grandTotal || 999.99),
        reason: String(body.reason || "It stared at me disrespectfully").trim() || "Deep buyer's remorse",
        moonPhase: String(body.moonPhase || "Waning Gibbous (Probably)").trim() || "Unknown Moon",
        regretLevel: String(body.regretLevel || "Severe").trim() || "Severe",
        captchaAnswer: String(body.captchaAnswer || "Clicked random squares aggressively"),
        customerEmail: String(
          body.customerEmail || linkedOrder?.customer?.email || "regret@chaoscommerce.invalid"
        ),
      };

      const execution = await executeWorkflowAndWait(
        "chaos_return_bureaucracy",
        workflowInput,
        {
          version: 1,
          correlationId: returnId,
        }
      );

      if (execution.status !== "COMPLETED") {
        throw new Error(
          `Conductor return workflow ended with status ${execution.status}: ${execution.reasonForIncompletion || "unknown error"}`
        );
      }

      const output = execution.output || {};
      const trace = formatWorkflowTrace(execution);

      const returnRecord = saveReturn({
        returnId: output.returnId || returnId,
        orderId: output.orderId || workflowInput.orderId,
        caseNumber: output.caseNumber,
        workflowId: execution.workflowId,
        status: execution.status,
        itemName: workflowInput.itemName,
        paidAmount: workflowInput.paidAmount,
        reason: workflowInput.reason,
        moonPhase: workflowInput.moonPhase,
        regretLevel: workflowInput.regretLevel,
        stampsCollected: output.stampsCollected,
        dossier: output.dossier || {},
        decision: output.decision || {},
        createdAt: new Date().toISOString(),
        workflowTrace: trace,
      });

      return res.status(201).json({
        returnRequest: returnRecord,
        workflow: trace,
      });
    } catch (err) {
      return next(err);
    }
  });

  app.get("/api/returns", (_req, res) => {
    res.json({ returns: getReturns() });
  });

  app.get("/api/returns/:returnId", (req, res) => {
    const rec = getReturnById(req.params.returnId);
    if (!rec) {
      return res.status(404).json({ error: "Return record not found." });
    }
    return res.json({ returnRequest: rec });
  });

  // Live Conductor workflow execution inspection
  app.get("/api/workflows/:workflowId", async (req, res, next) => {
    try {
      const execution = await getWorkflowExecution(req.params.workflowId);
      return res.json({
        workflow: formatWorkflowTrace(execution),
        output: execution.output || {},
      });
    } catch (err) {
      return next(err);
    }
  });

  // Error handler
  app.use((err, _req, res, _next) => {
    console.error("[api] Error:", err.message);
    res.status(500).json({
      error: "Our imaginary hamsters tripped over a cable.",
      details: err.message,
    });
  });

  return app;
}
