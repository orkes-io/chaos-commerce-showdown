// Translates Conductor executions into the shapes the storefront sees. Raw
// workflow objects never leave the backend.

export const CHECKOUT_WORKFLOW = 'chaos_checkout';
export const RETURN_WORKFLOW = 'chaos_return';
export const MANAGER_REVIEW_TASK = 'manager_review';
export const TOTAL_POINTLESS_CHECKS = 7;

const ACTIVE = new Set(['RUNNING', 'PAUSED']);
const REFUNDING_DECISIONS = new Set(['APPROVED', 'STORE_CREDIT']);

export function isActive(workflow) {
  return ACTIVE.has(workflow.status);
}

function isoTime(workflow) {
  const millis = workflow.createTime || workflow.startTime;
  return millis ? new Date(millis).toISOString() : null;
}

export function toOrderView(workflow, returnWorkflows = []) {
  const order = workflow.status === 'COMPLETED' ? workflow.output?.order ?? null : null;
  const status = order ? 'CONFIRMED' : isActive(workflow) ? 'PROCESSING' : 'FAILED';
  const view = {
    orderId: workflow.workflowId,
    status,
    placedAt: isoTime(workflow),
    order,
    returns: returnWorkflows.map(toReturnSummary).filter((summary) => summary.status !== 'FAILED'),
  };
  if (status === 'FAILED') view.problem = `The checkout workflow ended as ${workflow.status} instead of completing.`;
  return view;
}

function returnStatus(workflow) {
  if (workflow.status === 'COMPLETED' && workflow.output?.return?.decision) return 'DECIDED';
  return isActive(workflow) ? 'IN_REVIEW' : 'FAILED';
}

function toReturnSummary(workflow) {
  const status = returnStatus(workflow);
  return {
    returnId: workflow.workflowId,
    productId: workflow.input?.productId ?? null,
    quantity: workflow.input?.quantity ?? null,
    status,
    decision: status === 'DECIDED' ? workflow.output.return.decision : null,
  };
}

// Units of a product that earlier returns of the same order already cover:
// refunded ones plus those still in review. Denied and failed returns do not
// count, so the customer can try again.
export function countReturnedUnits(returnWorkflows, productId) {
  let units = 0;
  for (const workflow of returnWorkflows) {
    if (workflow.input?.productId !== productId) continue;
    const status = returnStatus(workflow);
    const quantity = Number.isInteger(workflow.input?.quantity) ? workflow.input.quantity : 0;
    if (status === 'IN_REVIEW') units += quantity;
    if (status === 'DECIDED' && REFUNDING_DECISIONS.has(workflow.output.return.decision)) units += quantity;
  }
  return units;
}

export function toReturnView(workflow) {
  const status = returnStatus(workflow);
  const tasks = Array.isArray(workflow.tasks) ? workflow.tasks : [];
  let checks;
  let stage;
  if (status === 'DECIDED') {
    checks = workflow.output.return.checks ?? [];
    stage = 'DECIDED';
  } else {
    checks = tasks
      .filter((task) => task.taskDefName === 'run_pointless_check' && task.status === 'COMPLETED' && task.outputData?.result)
      .map((task) => task.outputData.result)
      .sort((a, b) => a.index - b.index);
    const manager = tasks.find((task) => task.referenceTaskName === MANAGER_REVIEW_TASK);
    stage = manager ? 'MANAGER_REVIEW' : 'POINTLESS_CHECKS';
  }
  const view = {
    returnId: workflow.workflowId,
    orderId: workflow.input?.orderId ?? null,
    productId: workflow.input?.productId ?? null,
    quantity: workflow.input?.quantity ?? null,
    status,
    stage,
    submittedAt: isoTime(workflow),
    checks,
    totalChecks: TOTAL_POINTLESS_CHECKS,
    decision: status === 'DECIDED' ? workflow.output.return : null,
  };
  if (status === 'FAILED') view.problem = `The returns workflow ended as ${workflow.status} without a decision.`;
  return view;
}
