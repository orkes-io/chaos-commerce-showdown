import fs from "node:fs";
import path from "node:path";
import { CHAOS_PRODUCTS, addReview, findProduct, getAllReviews } from "./catalog.js";
import { config } from "./config.js";
import {
  checkConductorHealth,
  getWorkflowExecutionTrace,
  listCompletedWorkflowTraces,
  runWorkflowToCompletion
} from "./conductor.js";

export interface HttpRequestLike {
  method: string;
  path: string;
  query: URLSearchParams;
  headers: Record<string, string | undefined>;
  bodyText: string;
}

export interface HttpResponseLike {
  statusCode: number;
  headers: Record<string, string>;
  body: string | Buffer;
  isBase64Encoded?: boolean;
}

const MIME_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2"
};

function corsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": config.corsOrigin,
    "Access-Control-Allow-Methods": "GET,POST,PUT,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Max-Age": "86400"
  };
}

function jsonResponse(statusCode: number, payload: unknown): HttpResponseLike {
  return {
    statusCode,
    headers: {
      ...corsHeaders(),
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    },
    body: JSON.stringify(payload)
  };
}

function parseJsonBody(bodyText: string): Record<string, any> {
  if (!bodyText || !bodyText.trim()) return {};
  try {
    return JSON.parse(bodyText);
  } catch {
    throw new Error("Invalid JSON request body");
  }
}

export async function handleAppRequest(req: HttpRequestLike): Promise<HttpResponseLike> {
  const method = req.method.toUpperCase();
  const urlPath = req.path.replace(/\/+$/, "") || "/";

  if (method === "OPTIONS") {
    return {
      statusCode: 204,
      headers: corsHeaders(),
      body: ""
    };
  }

  try {
    // 1. Health & Conductor Diagnostics
    if (method === "GET" && urlPath === "/api/health") {
      const conductor = await checkConductorHealth();
      return jsonResponse(200, {
        ok: conductor.reachable,
        store: "Chaos Commerce™ — Proudly Still Open Despite 19 Court Orders",
        runtimeAiApisUsed: false,
        conductor
      });
    }

    // 2. Catalog + Reviews
    if (method === "GET" && urlPath === "/api/products") {
      const allReviews = getAllReviews();
      const enriched = CHAOS_PRODUCTS.map((p) => {
        const prodReviews = allReviews.filter((r) => r.productId === p.id);
        const avgStars =
          prodReviews.length > 0
            ? Math.round(
                (prodReviews.reduce((s, r) => s + r.stars, 0) / prodReviews.length) * 10
              ) / 10
            : 3.5;
        return {
          ...p,
          reviewCount: prodReviews.length,
          averageStars: avgStars,
          reviews: prodReviews
        };
      });
      return jsonResponse(200, { products: enriched });
    }

    // Product-specific reviews
    const reviewMatch = urlPath.match(/^\/api\/products\/([^/]+)\/reviews$/);
    if (reviewMatch) {
      const productId = decodeURIComponent(reviewMatch[1]);
      const product = findProduct(productId);
      if (!product) {
        return jsonResponse(404, { error: `Unknown cursed SKU: ${productId}` });
      }

      if (method === "GET") {
        return jsonResponse(200, { reviews: getAllReviews(productId) });
      }

      if (method === "POST") {
        const body = parseJsonBody(req.bodyText);
        const rawStars = Number(body.stars || 5);
        const stars = ([1, 2, 3, 4, 5].includes(rawStars) ? rawStars : 5) as 1 | 2 | 3 | 4 | 5;
        const created = addReview({
          productId,
          author: String(body.author || "Frazzled Shopper"),
          stars,
          title: String(body.title || ""),
          body: String(body.body || ""),
          dodgeAttemptsBeforeSurrender: Number(body.dodgeAttemptsBeforeSurrender || 0)
        });
        return jsonResponse(201, { review: created });
      }
    }

    // 3. Checkout -> Runs `chaos_checkout_workflow` on Conductor!
    if (method === "POST" && urlPath === "/api/checkout") {
      const body = parseJsonBody(req.bodyText);
      const orderId =
        String(body.orderId || "").trim() ||
        `CHC-${Math.floor(100000 + Math.random() * 900000)}`;

      const workflowInput = {
        orderId,
        customerName: String(body.customerName || "Regretful Shopper").trim() || "Regretful Shopper",
        customerEmail: String(body.customerEmail || "victim@chaos.example").trim() || "victim@chaos.example",
        shippingAddress:
          String(body.shippingAddress || "742 Evergreen Terrace, Roof Chimney").trim() ||
          "742 Evergreen Terrace",
        shippingTier: String(body.shippingTier || "raccoons"),
        paymentMethod: String(body.paymentMethod || "credit_card_of_regret"),
        couponCode: String(body.couponCode || "").trim(),
        chaosInsurance: Boolean(body.chaosInsurance),
        items: Array.isArray(body.items) && body.items.length > 0
          ? body.items
          : [{ productId: CHAOS_PRODUCTS[0].id, quantity: 1 }]
      };

      const trace = await runWorkflowToCompletion(
        "chaos_checkout_workflow",
        workflowInput,
        orderId
      );

      if (trace.status !== "COMPLETED") {
        return jsonResponse(502, {
          error: `Checkout workflow ended in unexpected status: ${trace.status}`,
          workflowId: trace.workflowId,
          trace
        });
      }

      return jsonResponse(200, {
        orderId,
        workflowId: trace.workflowId,
        status: trace.status,
        conductorExecutionUrl: trace.conductorExecutionUrl,
        order: trace.output,
        trace
      });
    }

    // 4. List Orders from Conductor
    if (method === "GET" && urlPath === "/api/orders") {
      const traces = await listCompletedWorkflowTraces("chaos_checkout_workflow", 20);
      const orders = traces
        .filter((t) => t.status === "COMPLETED")
        .map((t) => ({
          orderId: String(t.output?.orderId || t.correlationId || t.workflowId.slice(0, 8)),
          workflowId: t.workflowId,
          status: t.status,
          conductorExecutionUrl: t.conductorExecutionUrl,
          startTime: t.startTime,
          durationMs: t.durationMs,
          ...t.output
        }));
      return jsonResponse(200, { orders });
    }

    // 5. Returns -> Runs `chaos_return_workflow` on Conductor!
    if (method === "POST" && urlPath === "/api/returns") {
      const body = parseJsonBody(req.bodyText);
      const returnId =
        String(body.returnId || "").trim() ||
        `RET-${Math.floor(100000 + Math.random() * 900000)}`;
      const orderId = String(body.orderId || "CHC-LEGACY-1999").trim() || "CHC-LEGACY-1999";

      const workflowInput = {
        returnId,
        orderId,
        itemName:
          String(body.itemName || CHAOS_PRODUCTS[0].name).trim() || CHAOS_PRODUCTS[0].name,
        itemPrice: Math.max(0.01, Number(body.itemPrice || 749.5)),
        reason: String(body.reason || "existential_regret"),
        moonPhase: String(body.moonPhase || "suspiciously_cheese"),
        eyeContactSeconds: Number(body.eyeContactSeconds ?? 18),
        originalAirPercent: Number(body.originalAirPercent ?? 80),
        tapeStripCount: Number(body.tapeStripCount ?? 7),
        tearsShed: Number(body.tearsShed ?? 4),
        sworeHubrisOath: Boolean(body.sworeHubrisOath),
        didNotFeedAfterMidnight: Boolean(body.didNotFeedAfterMidnight),
        apologyText: String(body.apologyText || "")
      };

      const trace = await runWorkflowToCompletion(
        "chaos_return_workflow",
        workflowInput,
        returnId
      );

      if (trace.status !== "COMPLETED") {
        return jsonResponse(502, {
          error: `Return workflow ended in unexpected status: ${trace.status}`,
          workflowId: trace.workflowId,
          trace
        });
      }

      return jsonResponse(200, {
        returnId,
        orderId,
        workflowId: trace.workflowId,
        status: trace.status,
        conductorExecutionUrl: trace.conductorExecutionUrl,
        decision: trace.output,
        trace
      });
    }

    // 6. List Return Decisions from Conductor
    if (method === "GET" && urlPath === "/api/returns") {
      const traces = await listCompletedWorkflowTraces("chaos_return_workflow", 20);
      const returns = traces
        .filter((t) => t.status === "COMPLETED")
        .map((t) => ({
          returnId: String(t.output?.returnId || t.correlationId || t.workflowId.slice(0, 8)),
          workflowId: t.workflowId,
          status: t.status,
          conductorExecutionUrl: t.conductorExecutionUrl,
          startTime: t.startTime,
          durationMs: t.durationMs,
          ...t.output
        }));
      return jsonResponse(200, { returns });
    }

    // 7. Inspect any Conductor Workflow Execution Trace
    const wfMatch = urlPath.match(/^\/api\/workflows\/([^/]+)$/);
    if (method === "GET" && wfMatch) {
      const workflowId = decodeURIComponent(wfMatch[1]);
      const trace = await getWorkflowExecutionTrace(workflowId);
      if (!trace) {
        return jsonResponse(404, { error: `Workflow execution ${workflowId} not found` });
      }
      return jsonResponse(200, { trace });
    }

    if (urlPath.startsWith("/api/")) {
      return jsonResponse(404, { error: `No Chaos API endpoint at ${method} ${urlPath}` });
    }

    // 8. Static Frontend Serving (for local single-command server on http://localhost:3000)
    if (method === "GET" || method === "HEAD") {
      const distRoot = config.frontendDistDir;
      const safeRelative = path
        .normalize(decodeURIComponent(urlPath))
        .replace(/^(\.\.(\/|\\|$))+/, "")
        .replace(/^[/\\]+/, "");

      let candidate = path.join(distRoot, safeRelative || "index.html");
      if (!fs.existsSync(candidate) || fs.statSync(candidate).isDirectory()) {
        candidate = path.join(distRoot, "index.html");
      }

      if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
        const ext = path.extname(candidate).toLowerCase();
        const contentType = MIME_TYPES[ext] || "application/octet-stream";
        const content = fs.readFileSync(candidate);
        return {
          statusCode: 200,
          headers: {
            "Content-Type": contentType,
            "Cache-Control": ext === ".html" ? "no-cache" : "public, max-age=3600"
          },
          body: content
        };
      }

      return jsonResponse(503, {
        error: "Frontend bundle not built yet. Run `npm run build:frontend` or `npm start`."
      });
    }

    return jsonResponse(405, { error: "Method Not Allowed" });
  } catch (err: any) {
    console.error(`[Chaos Backend Error] ${method} ${urlPath}:`, err);
    return jsonResponse(500, {
      error: err?.message || "Unexpected meltdown in Sub-Basement 4B"
    });
  }
}
