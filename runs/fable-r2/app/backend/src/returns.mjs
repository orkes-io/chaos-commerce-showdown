import { RETURN_REASONS } from './catalog.mjs';
import { FLOWS, findOrStart, settleByCorrelation } from './executions.mjs';
import { MAX_QTY } from './pricing.mjs';
import { cleanId, cleanText, deriveId } from './sanitize.mjs';

const DEFAULT_CHECK_COUNT = 6;

// The pointless-check answers are kept (the workflow quotes them back) but never trusted.
function cleanAnswers(answers) {
  if (!answers || typeof answers !== 'object' || Array.isArray(answers)) return {};
  const cleaned = {};
  for (const [key, value] of Object.entries(answers).slice(0, 12)) {
    const name = cleanText(key, 30);
    if (name) cleaned[name] = typeof value === 'boolean' ? value : cleanText(value, 80);
  }
  return cleaned;
}

function completedChecks(main) {
  return (main.tasks ?? [])
    .filter((task) => task.referenceTaskName?.startsWith('run_check') && task.status === 'COMPLETED')
    .map((task) => task.outputData?.result)
    .filter((check) => check && typeof check === 'object')
    .sort((a, b) => a.step - b.step);
}

function toReturnView(returnId, settled) {
  const { main } = settled;
  const output = settled.done ? settled.output : {};
  const checks = Array.isArray(output.checks) && output.checks.length ? output.checks : completedChecks(main);
  const view = {
    returnId,
    orderId: cleanText(main.input?.orderId, 40),
    sku: cleanText(main.input?.sku, 60),
    workflowId: main.workflowId,
    status: settled.done ? 'DECIDED' : 'IN_REVIEW',
    checks,
    checksTotal: checks[0]?.of ?? DEFAULT_CHECK_COUNT,
  };
  if (!settled.done) return view;
  return {
    ...view,
    decision: output.verdict?.decision,
    verdict: output.verdict,
    rescued: settled.rescued,
    ...(settled.rescueWorkflowId ? { rescueWorkflowId: settled.rescueWorkflowId } : {}),
  };
}

export class OrderNotReadyError extends Error {}

export function createReturnService({ conductor, orders, registerWorkflows }) {
  // A return is a chaos_return execution whose correlation id is the return id.
  async function getReturn(returnId, { waitMs = 0, workflowId } = {}) {
    const id = cleanId(returnId);
    if (!id) return null;
    const settled = await settleByCorrelation(conductor, FLOWS.return, id, { waitMs, includeTasks: true, workflowId });
    return settled ? toReturnView(id, settled) : null;
  }

  // Opens a return case. There is one case per order line: asking again returns the same case.
  // Anything can be submitted; unknown orders and items are for the workflow to deny.
  async function openReturn(body) {
    const orderId = cleanId(body.orderId);
    const displayOrderId = orderId || cleanText(body.orderId, 40);
    const sku = cleanText(body.sku, 60);
    const returnId = deriveId('RT', `${displayOrderId}|${sku}`);

    const existing = await getReturn(returnId);
    if (existing) return { ret: existing, created: false };

    const order = orderId ? await orders.getOrder(orderId, { waitMs: 5000 }) : null;
    if (order && order.status !== 'COMPLETED') throw new OrderNotReadyError(orderId);

    const qty = Math.floor(Number(body.qty));
    const reasonCode = RETURN_REASONS.some((reason) => reason.id === body.reason) ? body.reason : 'other';
    const { created, workflowId } = await findOrStart(
      conductor,
      FLOWS.return,
      returnId,
      () => ({
        returnId,
        orderId: displayOrderId,
        sku,
        qty: Number.isFinite(qty) && qty >= 1 ? Math.min(qty, MAX_QTY) : 1,
        reasonCode,
        answers: cleanAnswers(body.answers),
        order: order
          ? {
              found: true,
              status: order.status,
              lines: (order.lines ?? []).map(({ sku: lineSku, name, qty: lineQty, unitPriceCents, returnable }) => ({
                sku: lineSku,
                name,
                qty: lineQty,
                unitPriceCents,
                returnable,
              })),
            }
          : { found: false },
      }),
      { registerWorkflows },
    );
    return { ret: await getReturn(returnId, { workflowId }), created };
  }

  return { openReturn, getReturn };
}
