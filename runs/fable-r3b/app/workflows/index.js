import { checkoutWorkflow } from './checkout.js';
import { returnWorkflow } from './returns.js';

export { CHECKOUT_WORKFLOW } from './checkout.js';
export { RETURN_WORKFLOW, MANAGER_REVIEW_TASK } from './returns.js';

export const workflowDefinitions = [checkoutWorkflow, returnWorkflow];
