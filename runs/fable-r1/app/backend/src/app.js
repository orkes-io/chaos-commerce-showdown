// The Chaos Commerce HTTP API, independent of how it is hosted.
// createApp returns handle({ method, path, headers, body }) -> { status, headers, body },
// which lambda.js adapts to AWS Lambda and scripts/start.js adapts to a local Node server.

import { paymentMethods, products } from "./catalog.js";
import { getOrder, placeOrder } from "./checkout.js";
import { ConductorError } from "./conductor.js";
import { loadDefinitions } from "./definitions.js";
import { StepClosedError, answerReturn, getReturn, startReturn } from "./returns.js";
import { isExecutionId } from "./sanitize.js";

const MAX_BODY_BYTES = 64 * 1024;

class HttpError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const notFound = (what) => new HttpError(404, "NOT_FOUND", `${what} not found. We looked everywhere (we looked in one place).`);

const parseBody = (body) => {
  if (body === null || body === undefined || body === "") return {};
  if (Buffer.byteLength(body) > MAX_BODY_BYTES) {
    throw new HttpError(413, "BODY_TOO_LARGE", "That request is too large. Even we have limits.");
  }
  try {
    return JSON.parse(body);
  } catch {
    throw new HttpError(400, "INVALID_JSON", "The request body is not valid JSON.");
  }
};

const executionId = (value, what) => {
  if (!isExecutionId(value)) throw notFound(what);
  return value;
};

export const createApp = ({ config, conductor }) => {
  const corsHeaders = (origin) => {
    const headers = {
      "access-control-allow-methods": "GET,POST,OPTIONS",
      "access-control-allow-headers": "content-type",
      "access-control-max-age": "600",
    };
    if (config.allowedOrigins.includes("*")) return { ...headers, "access-control-allow-origin": "*" };
    if (origin && config.allowedOrigins.includes(origin.replace(/\/+$/, ""))) {
      return { ...headers, "access-control-allow-origin": origin, vary: "origin" };
    }
    return {};
  };

  const routes = [
    ["GET", /^\/api\/health$/, async () => {
      const definitions = loadDefinitions();
      try {
        const registered = await Promise.all(
          definitions.map(({ name, version }) => conductor.hasWorkflowDefinition(name, version)),
        );
        const workflows = Object.fromEntries(definitions.map(({ name }, index) => [name, registered[index]]));
        const ok = registered.every(Boolean);
        return [ok ? 200 : 503, { ok, conductor: { reachable: true, workflows } }];
      } catch (error) {
        if (!(error instanceof ConductorError)) throw error;
        console.error(`[chaos-commerce] ${error.message}`);
        return [503, { ok: false, conductor: { reachable: false, workflows: {} } }];
      }
    }],
    ["GET", /^\/api\/products$/, async () => [200, { products, paymentMethods }]],
    ["POST", /^\/api\/checkout$/, async ({ body }) => {
      const result = await placeOrder({ conductor, config, body: parseBody(body) });
      return [result.status === "CONFIRMED" ? 201 : 202, result];
    }],
    ["GET", /^\/api\/orders\/([^/]+)$/, async ({ params }) => {
      const order = await getOrder({ conductor, config, orderId: executionId(params[0], "Order") });
      if (!order) throw notFound("Order");
      return [200, order];
    }],
    ["POST", /^\/api\/returns$/, async ({ body }) => {
      const created = await startReturn({ conductor, config, body: parseBody(body) });
      return [201, created];
    }],
    ["GET", /^\/api\/returns\/([^/]+)$/, async ({ params }) => {
      const current = await getReturn({ conductor, config, returnId: executionId(params[0], "Return") });
      if (!current) throw notFound("Return");
      return [200, current];
    }],
    ["POST", /^\/api\/returns\/([^/]+)\/answers$/, async ({ params, body }) => {
      const current = await answerReturn({
        conductor,
        config,
        returnId: executionId(params[0], "Return"),
        body: parseBody(body),
      });
      if (!current) throw notFound("Return");
      return [200, current];
    }],
  ];

  const dispatch = async (request) => {
    const path = request.path.replace(/\/+$/, "") || "/";
    const matches = routes
      .map(([method, pattern, handler]) => ({ method, handler, match: pattern.exec(path) }))
      .filter(({ match }) => match);
    if (matches.length === 0) throw notFound("Page");
    const route = matches.find(({ method }) => method === request.method);
    if (!route) throw new HttpError(405, "METHOD_NOT_ALLOWED", `${request.method} is not allowed here.`);
    return route.handler({ params: route.match.slice(1), body: request.body });
  };

  const errorResponse = (error) => {
    if (error instanceof HttpError) {
      return [error.status, { error: { code: error.code, message: error.message, retryable: false } }];
    }
    if (error instanceof StepClosedError) {
      return [409, { error: { code: "STEP_CLOSED", message: error.message, retryable: false }, return: error.current }];
    }
    if (error instanceof ConductorError) {
      console.error(`[chaos-commerce] ${error.message}`);
      const unavailable = error.retryable || error.status === 0;
      return [
        unavailable ? 503 : 502,
        {
          error: {
            code: unavailable ? "WORKFLOW_ENGINE_UNAVAILABLE" : "WORKFLOW_ENGINE_ERROR",
            message: unavailable
              ? "Our back office is not answering the phone. Nothing was lost; please try again in a moment."
              : "Our back office said something we did not understand. Please try again.",
            retryable: true,
          },
        },
      ];
    }
    console.error("[chaos-commerce] Unexpected error", error);
    return [500, { error: { code: "INTERNAL_ERROR", message: "Something broke that was not supposed to. Even for us.", retryable: true } }];
  };

  return async (request) => {
    const cors = corsHeaders(request.headers?.origin);
    if (request.method === "OPTIONS") return { status: 204, headers: cors, body: "" };
    let status;
    let payload;
    try {
      [status, payload] = await dispatch(request);
    } catch (error) {
      [status, payload] = errorResponse(error);
    }
    return {
      status,
      headers: { ...cors, "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
      body: JSON.stringify(payload),
    };
  };
};
