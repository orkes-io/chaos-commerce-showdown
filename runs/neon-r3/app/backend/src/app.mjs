import crypto from 'node:crypto';
import { getConfig } from './config.mjs';
import { getChadGptReply } from './data/catalog.mjs';
import {
  checkConductorHealth,
  getWorkflowExecution,
  listWorkflowExecutions,
  startAndAwaitWorkflow,
} from './services/conductorClient.mjs';
import { addProductReview, getAllProducts, getProductById } from './services/storeState.mjs';

function buildCorsHeaders() {
  const { corsOrigin } = getConfig();
  return {
    'Access-Control-Allow-Origin': corsOrigin,
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Requested-With',
    'Content-Type': 'application/json; charset=utf-8',
  };
}

function jsonResponse(statusCode, payload) {
  return {
    statusCode,
    headers: buildCorsHeaders(),
    body: JSON.stringify(payload),
  };
}

function makeShortId(prefix) {
  const ts = Date.now().toString(36).toUpperCase().slice(-4);
  const rand = crypto.randomBytes(2).toString('hex').toUpperCase();
  return `${prefix}-${ts}${rand}`;
}

function formatOrderExecution(exec) {
  const receipt = exec.output?.receipt || null;
  return {
    orderId: exec.output?.orderId || exec.input?.orderId || exec.correlationId || exec.workflowId,
    workflowId: exec.workflowId,
    workflowName: exec.workflowName,
    status: exec.status,
    createTime: exec.createTime,
    endTime: exec.endTime,
    executionTimeMs: exec.executionTimeMs,
    conductorUiUrl: exec.conductorUiUrl,
    receipt,
    tasks: exec.tasks,
  };
}

function formatReturnExecution(exec) {
  const decision = exec.output?.decision || null;
  return {
    returnId: exec.output?.returnId || exec.input?.returnId || exec.correlationId || exec.workflowId,
    orderId: exec.output?.orderId || exec.input?.orderId || 'UNKNOWN',
    workflowId: exec.workflowId,
    workflowName: exec.workflowName,
    status: exec.status,
    createTime: exec.createTime,
    endTime: exec.endTime,
    executionTimeMs: exec.executionTimeMs,
    conductorUiUrl: exec.conductorUiUrl,
    decision,
    tasks: exec.tasks,
  };
}

function normalizePath(rawPath) {
  const cleaned = String(rawPath || '/').split('?')[0];
  // Strip API Gateway stage prefix if present (e.g. /prod/api/products -> /api/products)
  const apiIdx = cleaned.indexOf('/api/');
  if (apiIdx > 0) {
    return cleaned.slice(apiIdx);
  }
  if (cleaned.endsWith('/api')) {
    return '/api';
  }
  return cleaned;
}

export async function handleApiRequest({ method, path, body }) {
  const upperMethod = String(method || 'GET').toUpperCase();
  const route = normalizePath(path);

  if (upperMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: buildCorsHeaders(),
      body: '',
    };
  }

  let parsedBody = {};
  if (body && typeof body === 'string') {
    try {
      parsedBody = JSON.parse(body);
    } catch {
      return jsonResponse(400, { error: 'Invalid JSON request body' });
    }
  } else if (body && typeof body === 'object') {
    parsedBody = body;
  }

  try {
    // Health & Conductor status
    if (upperMethod === 'GET' && route === '/api/health') {
      const conductor = await checkConductorHealth();
      return jsonResponse(200, {
        service: 'chaos-commerce-backend',
        status: 'ok',
        runtime: getConfig().isLambda ? 'aws-lambda' : 'local-node',
        aiApisUsedAtRuntime: false,
        conductor,
      });
    }

    // Catalog: list products
    if (upperMethod === 'GET' && route === '/api/products') {
      const products = getAllProducts();
      return jsonResponse(200, {
        storeName: 'Chaos Commerce™',
        slogan: 'Disrupting Common Sense Since Five Minutes Ago',
        products,
      });
    }

    // Catalog: single product
    const productMatch = route.match(/^\/api\/products\/([^/]+)$/);
    if (upperMethod === 'GET' && productMatch) {
      const product = getProductById(decodeURIComponent(productMatch[1]));
      if (!product) {
        return jsonResponse(404, { error: 'Product vanished into our strip-mall storage unit.' });
      }
      return jsonResponse(200, { product });
    }

    // Submit review
    const reviewMatch = route.match(/^\/api\/products\/([^/]+)\/reviews$/);
    if (upperMethod === 'POST' && reviewMatch) {
      const productId = decodeURIComponent(reviewMatch[1]);
      const review = addProductReview(productId, parsedBody);
      if (!review) {
        return jsonResponse(404, { error: 'Product not found.' });
      }
      return jsonResponse(201, { review, product: getProductById(productId) });
    }

    // Checkout via Conductor workflow (ALWAYS completes!)
    if (upperMethod === 'POST' && route === '/api/checkout') {
      const rawItems = Array.isArray(parsedBody.items) ? parsedBody.items : [];
      if (rawItems.length === 0) {
        return jsonResponse(400, { error: 'Your cart is empty. Add at least one terrible decision first.' });
      }

      const hydratedItems = rawItems.map((entry) => {
        const catalogItem = getProductById(entry.id);
        const qty = Math.max(1, Math.min(99, Math.round(Number(entry.quantity) || 1)));
        if (catalogItem) {
          return {
            id: catalogItem.id,
            name: catalogItem.name,
            unitPrice: catalogItem.price,
            quantity: qty,
          };
        }
        return {
          id: String(entry.id || 'mystery-item'),
          name: String(entry.name || 'Unidentified Chaos Object'),
          unitPrice: Math.max(0.01, Number(entry.unitPrice) || 99.99),
          quantity: qty,
        };
      });

      const orderId = makeShortId('CHAOS-ORD');
      const workflowInput = {
        orderId,
        customerName: String(parsedBody.customerName || 'Valued Victim').trim() || 'Valued Victim',
        customerEmail: String(parsedBody.customerEmail || 'regret@example.com').trim() || 'regret@example.com',
        shippingAddress:
          String(parsedBody.shippingAddress || '123 Regret Blvd, Chaos City').trim() || '123 Regret Blvd, Chaos City',
        items: hydratedItems,
        promoCode: String(parsedBody.promoCode || '').trim(),
        tipPercent: Number.isFinite(Number(parsedBody.tipPercent)) ? Number(parsedBody.tipPercent) : 20,
        paymentMethodLabel:
          String(parsedBody.paymentMethodLabel || 'Imaginary Platinum Card').trim() || 'Imaginary Platinum Card',
      };

      const execution = await startAndAwaitWorkflow('chaos_checkout_workflow', workflowInput, {
        correlationId: orderId,
      });

      return jsonResponse(201, {
        order: formatOrderExecution(execution),
      });
    }

    // List recent orders from Conductor
    if (upperMethod === 'GET' && route === '/api/orders') {
      const executions = await listWorkflowExecutions('chaos_checkout_workflow', 25);
      return jsonResponse(200, {
        orders: executions.map(formatOrderExecution),
      });
    }

    // Submit return via Conductor workflow (ALWAYS reaches a decision!)
    if (upperMethod === 'POST' && route === '/api/returns') {
      const returnId = makeShortId('CHAOS-RET');
      const workflowInput = {
        returnId,
        orderId: String(parsedBody.orderId || 'CHAOS-ORD-MYSTERY').trim() || 'CHAOS-ORD-MYSTERY',
        customerName: String(parsedBody.customerName || 'Dissatisfied Patron').trim() || 'Dissatisfied Patron',
        itemName: String(parsedBody.itemName || 'Questionable Merchandise').trim() || 'Questionable Merchandise',
        orderTotal: Math.max(0, Number(parsedBody.orderTotal) || 499.99),
        reasonCode: String(parsedBody.reasonCode || 'OTHER').trim() || 'OTHER',
        reasonText: String(parsedBody.reasonText || 'I have made a huge mistake.').trim(),
        lunarPhase: String(parsedBody.lunarPhase || 'Waxing Gibbous').trim(),
        staredAtProduct: Boolean(parsedBody.staredAtProduct),
        keptOriginalAir: Boolean(parsedBody.keptOriginalAir),
        apologyToCeo: String(parsedBody.apologyToCeo || '').trim(),
      };

      const execution = await startAndAwaitWorkflow('chaos_return_workflow', workflowInput, {
        correlationId: returnId,
      });

      return jsonResponse(201, {
        returnRequest: formatReturnExecution(execution),
      });
    }

    // List recent returns from Conductor
    if (upperMethod === 'GET' && route === '/api/returns') {
      const executions = await listWorkflowExecutions('chaos_return_workflow', 25);
      return jsonResponse(200, {
        returns: executions.map(formatReturnExecution),
      });
    }

    // Inspect any Conductor workflow execution live
    const wfMatch = route.match(/^\/api\/workflows\/([^/]+)$/);
    if (upperMethod === 'GET' && wfMatch) {
      const execution = await getWorkflowExecution(decodeURIComponent(wfMatch[1]));
      return jsonResponse(200, { workflow: execution });
    }

    // Deterministic parody support chatbot (zero AI APIs)
    if (upperMethod === 'POST' && route === '/api/support/chat') {
      const reply = getChadGptReply(parsedBody.message);
      return jsonResponse(200, {
        bot: 'ChadGPT-0.01 (Not AI — 14 If-Statements)',
        reply,
        timestamp: new Date().toISOString(),
      });
    }

    return jsonResponse(404, { error: `Unknown Chaos Commerce API route: ${upperMethod} ${route}` });
  } catch (err) {
    return jsonResponse(502, {
      error: 'Chaos Commerce backend hit a snag communicating with Conductor.',
      detail: err.message,
    });
  }
}
