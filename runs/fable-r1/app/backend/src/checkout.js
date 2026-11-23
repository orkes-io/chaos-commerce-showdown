import { randomUUID } from "node:crypto";
import { DEFAULT_PAYMENT_METHOD, findPaymentMethod, findProduct } from "./catalog.js";
import { WORKFLOWS } from "./definitions.js";
import { startOrFind, waitForResult } from "./executions.js";
import { idempotencyKey, quantity, record, seedFrom, text } from "./sanitize.js";

const MAX_LINES = 50;
const UNIDENTIFIED_PRICE_CENTS = 1313;

// Nothing in a cart can stop a checkout: unknown products are sold anyway as
// "unidentified items", and odd quantities are clamped rather than rejected.
const buildLines = (items) => {
  const quantities = new Map();
  for (const item of Array.isArray(items) ? items.slice(0, 500) : []) {
    const productId = text(record(item).productId, 64);
    if (productId === "") continue;
    if (!quantities.has(productId) && quantities.size >= MAX_LINES) continue;
    quantities.set(productId, Math.min(99, (quantities.get(productId) ?? 0) + quantity(record(item).quantity)));
  }
  return [...quantities].map(([productId, lineQuantity]) => {
    const product = findProduct(productId);
    return product
      ? { productId, name: product.name, emoji: product.emoji, unitPriceCents: product.priceCents, quantity: lineQuantity }
      : {
          productId: "unidentified-item",
          name: `Unidentified Item (you asked for "${productId}")`,
          emoji: "🫥",
          unitPriceCents: UNIDENTIFIED_PRICE_CENTS,
          quantity: lineQuantity,
          note: "We do not sell this. We charged you for it anyway.",
        };
  });
};

export const buildCheckoutInput = (body, { config, now = new Date() }) => {
  const request = record(body);
  const customer = record(request.customer);
  const checkoutId = idempotencyKey(request.checkoutId) ?? randomUUID();
  const method = findPaymentMethod(request.paymentMethod) ?? DEFAULT_PAYMENT_METHOD;
  return {
    checkoutId,
    seed: seedFrom(checkoutId),
    placedAt: now.toISOString(),
    customer: {
      name: text(customer.name, 80) || "Valued Customer",
      address: text(customer.address, 200),
    },
    lines: buildLines(request.items),
    coupon: text(request.coupon, 24).replace(/[^A-Za-z0-9_-]/g, "").toUpperCase(),
    paymentMethod: { id: method.id, label: method.label },
    disasterDrill: config.allowDisasterDrills && request.disasterDrill === true,
  };
};

const orderView = ({ config, orderId, outcome }) => ({
  orderId,
  status: outcome.done ? "CONFIRMED" : "PROCESSING",
  order: outcome.done ? outcome.result : null,
  links: {
    self: `/api/orders/${orderId}`,
    ...(config.conductorUiUrl ? { workflow: `${config.conductorUiUrl}/execution/${orderId}` } : {}),
  },
});

export const placeOrder = async ({ conductor, config, body }) => {
  const input = buildCheckoutInput(body, { config });
  const orderId = await startOrFind({
    conductor,
    name: WORKFLOWS.checkout.name,
    correlationId: `checkout:${input.checkoutId}`,
    input,
  });
  const outcome = await waitForResult({
    conductor,
    workflowId: orderId,
    kind: WORKFLOWS.checkout,
    timeoutMs: config.checkoutWaitMs,
  });
  return { checkoutId: input.checkoutId, ...orderView({ config, orderId, outcome }) };
};

// Returns null when the id is not a Chaos Commerce order.
export const getOrder = async ({ conductor, config, orderId, waitMs = 0 }) => {
  const outcome = await waitForResult({ conductor, workflowId: orderId, kind: WORKFLOWS.checkout, timeoutMs: waitMs });
  return outcome.workflow ? orderView({ config, orderId, outcome }) : null;
};

// What a return needs to know about the order it refers to, or null if there is no such order.
export const orderSnapshot = async ({ conductor, orderId }) => {
  const outcome = await waitForResult({ conductor, workflowId: orderId, kind: WORKFLOWS.checkout, timeoutMs: 5000 });
  if (!outcome.done) return null;
  const order = outcome.result;
  return {
    orderNumber: text(order.orderNumber, 40) || "UNKNOWN",
    totalCents: Number.isFinite(order.totalCents) ? order.totalCents : 0,
    customerName: text(record(order.customer).name, 80),
  };
};
