// The whole HTTP API as one function: (request) -> response. The local server and the AWS
// Lambda handler are thin adapters around it, so both run exactly the same code.

import { PAYMENT_METHODS, PRODUCTS, RETURN_REASONS, SHIPPING_SPEEDS, findProduct } from './catalog.mjs';
import { loadConfig } from './config.mjs';
import { ConductorError, createConductorClient } from './conductor.mjs';
import { reconcile } from './executions.mjs';
import { createOrderService } from './orders.mjs';
import { buildQuote } from './pricing.mjs';
import { OrderNotReadyError, createReturnService } from './returns.mjs';
import { missingWorkflows, registerWorkflows } from './workflows.mjs';

export const MAX_BODY_BYTES = 64 * 1024;

class HttpError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function parseBody(raw) {
  if (raw === undefined || raw === null || raw === '') return {};
  if (Buffer.byteLength(raw) > MAX_BODY_BYTES) {
    throw new HttpError(413, 'BODY_TOO_LARGE', 'That request is larger than our entire warehouse. Please send less.');
  }
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new HttpError(400, 'INVALID_JSON', 'The request body is not valid JSON. We have standards. Not many, but this is one.');
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new HttpError(400, 'INVALID_BODY', 'The request body must be a JSON object.');
  }
  return parsed;
}

export function createApp({ config = loadConfig(), conductor = createConductorClient(config), log = console } = {}) {
  const register = () => registerWorkflows(conductor);
  const orders = createOrderService({ conductor, config, registerWorkflows: register });
  const returns = createReturnService({ conductor, orders, registerWorkflows: register });

  function corsHeaders(origin) {
    const allowAny = config.allowedOrigins.includes('*');
    const allowed = allowAny ? '*' : config.allowedOrigins.find((candidate) => candidate === origin);
    return {
      ...(allowed ? { 'Access-Control-Allow-Origin': allowed } : {}),
      ...(allowAny ? {} : { Vary: 'Origin' }),
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Idempotency-Key',
      'Access-Control-Max-Age': '600',
    };
  }

  const routes = [
    ['GET', /^\/api\/health$/, async () => {
      let missing = null;
      try {
        missing = await missingWorkflows(conductor);
      } catch {
        // reported below as unreachable
      }
      const ok = Array.isArray(missing) && missing.length === 0;
      return [ok ? 200 : 503, {
        status: ok ? 'ok' : 'degraded',
        store: 'Chaos Commerce',
        conductor: { url: conductor.baseUrl, reachable: missing !== null },
        workflows: { registered: ok, missing: missing ?? [] },
      }];
    }],
    ['GET', /^\/api\/catalog$/, async () => [200, {
      products: PRODUCTS,
      paymentMethods: PAYMENT_METHODS,
      shippingSpeeds: SHIPPING_SPEEDS,
      returnReasons: RETURN_REASONS,
    }]],
    ['GET', /^\/api\/products$/, async () => [200, { products: PRODUCTS }]],
    ['GET', /^\/api\/products\/([^/]+)$/, async (_request, sku) => {
      const product = findProduct(sku);
      if (!product) throw new HttpError(404, 'PRODUCT_NOT_FOUND', 'We do not sell that. Astonishing, given what we do sell.');
      return [200, { product }];
    }],
    ['POST', /^\/api\/quote$/, async (request) => [200, { quote: buildQuote(parseBody(request.body).items) }]],
    ['POST', /^\/api\/checkout$/, async (request) => {
      const { order, created } = await orders.checkout(parseBody(request.body), request.headers['idempotency-key']);
      if (!order) throw new ConductorError('The order was started but could not be read back');
      return [order.status === 'COMPLETED' ? (created ? 201 : 200) : 202, { order, replayed: !created }];
    }],
    ['GET', /^\/api\/orders\/([^/]+)$/, async (_request, orderId) => {
      const order = await orders.getOrder(orderId, { waitMs: 1500 });
      if (!order) throw new HttpError(404, 'ORDER_NOT_FOUND', 'No such order. To be fair, we lose track of most of them too.');
      return [200, { order }];
    }],
    ['POST', /^\/api\/returns$/, async (request) => {
      const { ret, created } = await returns.openReturn(parseBody(request.body));
      if (!ret) throw new ConductorError('The return was started but could not be read back');
      return [created ? 202 : 200, { return: ret, existing: !created }];
    }],
    ['GET', /^\/api\/returns\/([^/]+)$/, async (_request, returnId) => {
      const ret = await returns.getReturn(returnId);
      if (!ret) throw new HttpError(404, 'RETURN_NOT_FOUND', 'No such return. Have you tried returning it again?');
      return [200, { return: ret }];
    }],
  ];

  // request: { method, path, headers (lower-cased names), body (string) }
  async function handle(request) {
    const headers = {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      ...corsHeaders(request.headers?.origin),
    };
    const respond = (status, payload, extra = {}) => ({
      status,
      headers: { ...headers, ...extra },
      body: payload === undefined ? '' : JSON.stringify(payload),
    });
    const fail = (status, code, message, extra) => respond(status, { error: { code, message } }, extra);

    if (request.method === 'OPTIONS') return respond(204);

    let decodedPath;
    try {
      decodedPath = decodeURIComponent(request.path).replace(/\/+$/, '') || '/';
    } catch {
      return fail(400, 'BAD_PATH', 'That URL is not a real URL.');
    }

    try {
      let pathMatched = false;
      for (const [method, pattern, handler] of routes) {
        const match = pattern.exec(decodedPath);
        if (!match) continue;
        pathMatched = true;
        if (method !== request.method) continue;
        const [status, payload] = await handler({ ...request, headers: request.headers ?? {} }, ...match.slice(1));
        return respond(status, payload);
      }
      if (pathMatched) return fail(405, 'METHOD_NOT_ALLOWED', 'Wrong method. Bold of you to try, though.');
      return fail(404, 'NOT_FOUND', 'There is nothing at this address. We checked. Briefly.');
    } catch (error) {
      if (error instanceof HttpError) return fail(error.status, error.code, error.message);
      if (error instanceof OrderNotReadyError) {
        return fail(409, 'ORDER_NOT_READY', 'That order is still being checked out. Give it a moment, then try the return again.', { 'Retry-After': '3' });
      }
      if (error instanceof ConductorError && error.unavailable) {
        log.error(`[chaos-commerce] ${error.message}`);
        return fail(
          503,
          'WORKFLOW_ENGINE_UNAVAILABLE',
          'Our workflow engine is not answering, so nothing was started and nothing was lost. Please try again in a moment.',
          { 'Retry-After': '5' },
        );
      }
      log.error('[chaos-commerce] unexpected error', error);
      return fail(500, 'INTERNAL_ERROR', 'Something broke that was not supposed to be part of the joke.');
    }
  }

  return {
    handle,
    conductor,
    config,
    registerWorkflows: register,
    reconcile: () => reconcile(conductor),
  };
}
