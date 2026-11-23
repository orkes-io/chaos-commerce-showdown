import { PAYMENT_METHODS, SHIPPING_SPEEDS } from './catalog.mjs';
import { FLOWS, findOrStart, settleByCorrelation } from './executions.mjs';
import { buildQuote } from './pricing.mjs';
import { cleanId, cleanText, deriveId, randomKey } from './sanitize.mjs';

const labelOf = (options, id, fallback) => options.find((option) => option.id === id)?.label ?? fallback;

function toOrderView(orderId, settled) {
  const base = { orderId, workflowId: settled.main.workflowId };
  if (!settled.done) {
    return {
      ...base,
      status: 'PROCESSING',
      message: 'Your order is working its way through checkout. It will complete; it always does.',
    };
  }
  return {
    ...(settled.output.order ?? {}),
    ...base,
    status: 'COMPLETED',
    rescued: settled.rescued,
    ...(settled.rescueWorkflowId ? { rescueWorkflowId: settled.rescueWorkflowId } : {}),
  };
}

export function createOrderService({ conductor, config, registerWorkflows }) {
  // An order is a chaos_checkout execution whose correlation id is the order id.
  async function getOrder(orderId, { waitMs = 0, workflowId } = {}) {
    const id = cleanId(orderId);
    if (!id) return null;
    const settled = await settleByCorrelation(conductor, FLOWS.order, id, { waitMs, workflowId });
    return settled ? toOrderView(id, settled) : null;
  }

  // Starts checkout (or finds the one already started for this idempotency key) and waits
  // briefly so the usual response is the finished order.
  async function checkout(body, idempotencyHeader) {
    const key = cleanText(idempotencyHeader || body.idempotencyKey, 128);
    const orderId = deriveId('CC', key.length >= 8 ? key : randomKey());
    const { created, workflowId } = await findOrStart(
      conductor,
      FLOWS.order,
      orderId,
      () => ({
        orderId,
        customer: { name: cleanText(body.customer?.name, 60) },
        paymentMethod: labelOf(PAYMENT_METHODS, body.paymentMethod, 'Mystery Method'),
        shippingSpeed: labelOf(SHIPPING_SPEEDS, body.shippingSpeed, 'Slow'),
        placedAt: new Date().toISOString(),
        quote: buildQuote(body.items),
      }),
      { registerWorkflows },
    );
    const order = await getOrder(orderId, { waitMs: config.checkoutWaitMs, workflowId });
    return { order, created };
  }

  return { checkout, getOrder };
}
