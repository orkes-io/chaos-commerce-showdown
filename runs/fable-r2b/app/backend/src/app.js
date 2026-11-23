// HTTP API of the store, independent of how it is hosted. lambda.js adapts
// AWS Lambda events to it; the local server reuses that same Lambda handler.

import { loadConfig } from "./config.js";
import { ConductorError, createConductorClient } from "./conductor.js";
import { HttpError, createStore } from "./store.js";

const MAX_BODY_BYTES = 32 * 1024;

export function createApp({ config = loadConfig(), conductor, store } = {}) {
  conductor ??= createConductorClient({
    baseUrl: config.conductorUrl,
    authKey: config.conductorAuthKey,
    authSecret: config.conductorAuthSecret,
    authToken: config.conductorAuthToken,
  });
  store ??= createStore({ conductor, config });

  const routes = [
    ["GET", /^\/api\/health$/, async () => {
      const health = await store.health();
      return [health.ok ? 200 : 503, health];
    }],
    ["GET", /^\/api\/catalog$/, async () => [200, store.catalog()]],
    ["POST", /^\/api\/checkout$/, async (_, body) => [200, await store.placeOrder(body)]],
    ["GET", /^\/api\/checkout\/([^/]+)$/, async ([id]) => [200, await store.checkoutStatus(id)]],
    ["POST", /^\/api\/returns$/, async (_, body) => [200, await store.fileReturn(body)]],
    ["GET", /^\/api\/returns\/([^/]+)$/, async ([id]) => [200, await store.returnStatus(id)]],
    ["POST", /^\/api\/returns\/([^/]+)\/oath$/, async ([id], body) => [200, await store.swearOath(id, body)]],
  ];

  function corsHeaders(origin) {
    const headers = {
      "access-control-allow-methods": "GET,POST,OPTIONS",
      "access-control-allow-headers": "content-type",
      "access-control-max-age": "600",
    };
    if (config.allowedOrigins.includes("*")) return { ...headers, "access-control-allow-origin": "*" };
    const allowed = origin && config.allowedOrigins.includes(origin.replace(/\/+$/, ""));
    return { ...headers, vary: "origin", ...(allowed ? { "access-control-allow-origin": origin } : {}) };
  }

  // request: { method, path, headers (lower-case keys), body (string or null) }
  return async function handle(request) {
    const headers = {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...corsHeaders(request.headers?.origin),
    };
    const reply = (statusCode, payload) => ({ statusCode, headers, body: payload === null ? "" : JSON.stringify(payload) });
    const fail = (statusCode, error, message, extra = {}) => reply(statusCode, { error, message, ...extra });

    const method = String(request.method ?? "GET").toUpperCase();
    const path = String(request.path ?? "/").replace(/\/+$/, "") || "/";
    if (method === "OPTIONS") return reply(204, null);

    const matching = routes.filter(([, pattern]) => pattern.test(path));
    if (matching.length === 0) return fail(404, "NOT_FOUND", "There is nothing here. There rarely is.");
    const route = matching.find(([routeMethod]) => routeMethod === method);
    if (!route) return fail(405, "METHOD_NOT_ALLOWED", `${method} is not supported on ${path}.`);

    let body;
    if (method === "POST") {
      const raw = request.body ?? "";
      if (Buffer.byteLength(raw) > MAX_BODY_BYTES) return fail(413, "TOO_LARGE", "The request body is too large.");
      try {
        body = raw === "" ? {} : JSON.parse(raw);
      } catch {
        return fail(400, "BAD_JSON", "The request body is not valid JSON.");
      }
    }

    try {
      const [statusCode, payload] = await route[2](path.match(route[1]).slice(1), body);
      return reply(statusCode, payload);
    } catch (error) {
      if (error instanceof HttpError) return fail(error.status, error.code, error.message);
      if (error instanceof ConductorError && error.unavailable) {
        console.error(error.message);
        return fail(503, "CONDUCTOR_UNAVAILABLE", "The workflow engine behind the store cannot be reached. Nothing was lost; try again.", { retryable: true });
      }
      console.error(error);
      return fail(500, "INTERNAL_ERROR", "Something broke that was not supposed to. Try again.", { retryable: true });
    }
  };
}
