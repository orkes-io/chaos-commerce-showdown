import fs from "node:fs";
import path from "node:path";
import express from "express";
import cors from "cors";
import {
  DISSERVICE_REPLIES,
  LIVE_REGRET_TICKER,
  PROMO_CODES,
  RETURN_REASONS,
  SHIPPING_METHODS,
  ZODIAC_SIGNS,
  evaluatePromoCode,
} from "./catalog.mjs";
import { FRONTEND_DIST_DIR, loadConfig } from "./config.mjs";
import { ConductorApiClient } from "./conductorClient.mjs";
import {
  addReview,
  formatExecutionSummary,
  getProductWithReviews,
  listProductsWithReviews,
} from "./store.mjs";

export function createApp({
  config = loadConfig(),
  serveStatic = false,
  frontendDistDir = FRONTEND_DIST_DIR,
  getWorkerStatus = null,
} = {}) {
  const app = express();
  const conductor = new ConductorApiClient(config);

  const corsOptions =
    config.corsOrigin === "*"
      ? { origin: true }
      : {
          origin: config.corsOrigin
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
        };

  app.use(cors(corsOptions));
  app.use(express.json({ limit: "1mb" }));

  // Health & public runtime config (never exposes secrets)
  app.get("/api/health", async (_req, res) => {
    try {
      const conductorHealth = await conductor.healthCheck();
      res.json({
        status: "CHAOTICALLY_OPERATIONAL",
        aiApisUsedAtRuntime: false,
        conductor: conductorHealth,
        workflows: config.workflows,
        workers: typeof getWorkerStatus === "function" ? getWorkerStatus() : { embedded: false },
      });
    } catch (err) {
      res.status(503).json({
        status: "CONDUCTOR_UNREACHABLE",
        error: err.message,
        conductorServerUrl: config.conductorServerUrl,
      });
    }
  });

  app.get("/api/config", (_req, res) => {
    res.json({
      storeName: "Chaos Commerce",
      conductorUiUrl: config.conductorUiUrl,
      workflows: config.workflows,
      shippingMethods: SHIPPING_METHODS,
      zodiacSigns: ZODIAC_SIGNS,
      returnReasons: RETURN_REASONS,
      regretTicker: LIVE_REGRET_TICKER,
      promoHints: Object.keys(PROMO_CODES),
    });
  });

  // Catalog & Reviews
  app.get("/api/products", (_req, res) => {
    res.json({
      products: listProductsWithReviews(),
      shippingMethods: SHIPPING_METHODS,
      regretTicker: LIVE_REGRET_TICKER,
    });
  });

  app.get("/api/products/:id", (req, res) => {
    const product = getProductWithReviews(req.params.id);
    if (!product) {
      return res.status(404).json({ error: "Product lost in Warehouse B." });
    }
    return res.json(product);
  });

  app.post("/api/products/:id/reviews", (req, res) => {
    try {
      const created = addReview(req.params.id, req.body || {});
      if (!created) {
        return res.status(404).json({ error: "Product not found." });
      }
      return res.status(201).json({
        review: created,
        product: getProductWithReviews(req.params.id),
      });
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
  });

  // Promo code preview
  app.post("/api/promo/preview", (req, res) => {
    const { promoCode, subtotal } = req.body || {};
    const result = evaluatePromoCode(promoCode, Number(subtotal) || 0);
    res.json(result);
  });

  // Checkout -> starts real Conductor workflow `chaos_checkout_workflow`
  app.post("/api/checkout", async (req, res) => {
    try {
      const body = req.body || {};
      const items = Array.isArray(body.items) ? body.items : [];
      if (items.length === 0) {
        return res.status(400).json({
          error: "Your cart is empty. Please add at least one questionable life choice first.",
        });
      }

      const orderId = `CHS-ORD-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;
      const workflowInput = {
        orderId,
        customerName: String(body.customerName || "Valued Victim").trim() || "Valued Victim",
        customerEmail: String(body.customerEmail || "victim@chaos.invalid").trim() || "victim@chaos.invalid",
        shippingAddress:
          String(body.shippingAddress || "742 Regret Terrace, Reno, NV").trim() ||
          "742 Regret Terrace, Reno, NV",
        shippingMethod: String(body.shippingMethod || "pigeon"),
        promoCode: String(body.promoCode || "").trim(),
        paymentMethod: String(body.paymentMethod || "Imaginary Platinum Card"),
        includeCardboardBox: body.includeCardboardBox !== false,
        includeShippingInsurance: Boolean(body.includeShippingInsurance),
        items: items.map((i) => ({
          productId: i.productId || i.id,
          title: i.title,
          price: i.price,
          quantity: i.quantity || 1,
        })),
      };

      const workflowId = await conductor.startWorkflow(
        config.workflows.checkout,
        workflowInput,
        orderId
      );

      const shouldWait =
        req.query.wait === "true" || body.waitForCompletion === true;

      if (shouldWait) {
        const execution = await conductor.waitForCompletion(workflowId);
        return res.status(201).json({
          orderId,
          workflowId,
          conductorUiUrl: `${config.conductorUiUrl}/execution/${workflowId}`,
          execution: formatExecutionSummary(execution, config.conductorUiUrl),
        });
      }

      return res.status(202).json({
        orderId,
        workflowId,
        status: "RUNNING",
        conductorUiUrl: `${config.conductorUiUrl}/execution/${workflowId}`,
      });
    } catch (err) {
      return res.status(502).json({
        error: "Failed to trigger Conductor checkout workflow.",
        detail: err.message,
      });
    }
  });

  // Returns -> starts real Conductor workflow `chaos_return_workflow`
  app.post("/api/returns", async (req, res) => {
    try {
      const body = req.body || {};
      const orderId = String(body.orderId || "").trim() || `CHS-ORD-MYSTERY-${Math.floor(100 + Math.random() * 900)}`;
      const workflowInput = {
        orderId,
        orderWorkflowId: String(body.orderWorkflowId || ""),
        orderTotal: Math.max(0.01, Number(body.orderTotal) || 499.99),
        customerName: String(body.customerName || "Regretful Shopper").trim() || "Regretful Shopper",
        itemTitle: String(body.itemTitle || "Questionable Chaos Purchase").trim() || "Questionable Chaos Purchase",
        reason: String(body.reason || RETURN_REASONS[0]),
        zodiacSign: String(body.zodiacSign || ZODIAC_SIGNS[0]),
        apologyText: String(body.apologyText || ""),
        moonlightConfirmed: Boolean(body.moonlightConfirmed),
        boxAirPreserved: Boolean(body.boxAirPreserved),
        spiderChecksPassed: Boolean(body.spiderChecksPassed),
      };

      const workflowId = await conductor.startWorkflow(
        config.workflows.returnFlow,
        workflowInput,
        orderId
      );

      const shouldWait =
        req.query.wait === "true" || body.waitForCompletion === true;

      if (shouldWait) {
        const execution = await conductor.waitForCompletion(workflowId);
        return res.status(201).json({
          orderId,
          workflowId,
          conductorUiUrl: `${config.conductorUiUrl}/execution/${workflowId}`,
          execution: formatExecutionSummary(execution, config.conductorUiUrl),
        });
      }

      return res.status(202).json({
        orderId,
        workflowId,
        status: "RUNNING",
        conductorUiUrl: `${config.conductorUiUrl}/execution/${workflowId}`,
      });
    } catch (err) {
      return res.status(502).json({
        error: "Failed to trigger Conductor return workflow.",
        detail: err.message,
      });
    }
  });

  // Poll any Conductor workflow execution live
  app.get("/api/workflows/:workflowId", async (req, res) => {
    try {
      const execution = await conductor.getWorkflow(req.params.workflowId, true);
      return res.json(formatExecutionSummary(execution, config.conductorUiUrl));
    } catch (err) {
      return res.status(404).json({
        error: "Workflow execution not found on Conductor.",
        detail: err.message,
      });
    }
  });

  // Recent Orders (read directly from Conductor so Lambda stays stateless!)
  app.get("/api/orders", async (_req, res) => {
    try {
      const search = await conductor.searchWorkflows(config.workflows.checkout, 15);
      const hits = Array.isArray(search?.results) ? search.results : [];
      const detailed = await Promise.all(
        hits.slice(0, 10).map(async (item) => {
          try {
            const full = await conductor.getWorkflow(item.workflowId, false);
            return formatExecutionSummary(full, config.conductorUiUrl);
          } catch {
            return {
              workflowId: item.workflowId,
              workflowName: item.workflowType,
              status: item.status,
              correlationId: item.correlationId || "",
              conductorUiUrl: `${config.conductorUiUrl}/execution/${item.workflowId}`,
              output: {},
              input: {},
            };
          }
        })
      );
      return res.json({ orders: detailed });
    } catch (err) {
      return res.status(502).json({ error: "Could not load orders from Conductor.", detail: err.message });
    }
  });

  // Recent Returns (read directly from Conductor!)
  app.get("/api/returns", async (_req, res) => {
    try {
      const search = await conductor.searchWorkflows(config.workflows.returnFlow, 15);
      const hits = Array.isArray(search?.results) ? search.results : [];
      const detailed = await Promise.all(
        hits.slice(0, 10).map(async (item) => {
          try {
            const full = await conductor.getWorkflow(item.workflowId, false);
            return formatExecutionSummary(full, config.conductorUiUrl);
          } catch {
            return {
              workflowId: item.workflowId,
              workflowName: item.workflowType,
              status: item.status,
              correlationId: item.correlationId || "",
              conductorUiUrl: `${config.conductorUiUrl}/execution/${item.workflowId}`,
              output: {},
              input: {},
            };
          }
        })
      );
      return res.json({ returns: detailed });
    } catch (err) {
      return res.status(502).json({ error: "Could not load returns from Conductor.", detail: err.message });
    }
  });

  // Deterministic unhelpful Customer Disservice bot (zero AI APIs)
  app.post("/api/disservice", (req, res) => {
    const message = String(req.body?.message || "").trim();
    const index =
      message.split("").reduce((sum, ch) => sum + ch.charCodeAt(0), 0) %
      DISSERVICE_REPLIES.length;
    res.json({
      agent: "ChazBot 0.01 (Powered by Spite, Not AI)",
      reply: DISSERVICE_REPLIES[index],
      ticketStatus: "SHREDDED",
    });
  });

  // Optional static frontend serving for local single-command startup (http://localhost:3000)
  if (serveStatic && fs.existsSync(frontendDistDir)) {
    app.use(express.static(frontendDistDir));
    app.get("*", (req, res, next) => {
      if (req.path.startsWith("/api/")) return next();
      return res.sendFile(path.join(frontendDistDir, "index.html"));
    });
  }

  return app;
}
