import { inline, OWNER_EMAIL } from './lib.js';
import { intakeReturn, runPointlessCheck, tallyChecks, decideReturn } from './scripts.js';

export const RETURN_WORKFLOW = 'chaos_return';
export const MANAGER_REVIEW_TASK = 'manager_review';

// Seven pointless checks, a manager who is at lunch, then a decision. The only
// pause is a WAIT timer that Conductor ends by itself after 4 seconds (a nudge
// can end it sooner), so every return reaches decide_return without anyone
// having to do anything.
export const returnWorkflow = {
  name: RETURN_WORKFLOW,
  description:
    'Chaos Commerce returns: checks eligibility, runs 7 pointless checks that affect nothing, waits 4 seconds for a manager who never answers, then always issues a decision (APPROVED, STORE_CREDIT or DENIED).',
  version: 1,
  schemaVersion: 2,
  ownerEmail: OWNER_EMAIL,
  restartable: true,
  // ALERT_ONLY on purpose: a slow return is flagged, never killed undecided.
  timeoutSeconds: 300,
  timeoutPolicy: 'ALERT_ONLY',
  inputParameters: [
    'requestId', 'orderId', 'orderState', 'orderNumber', 'orderLines',
    'productId', 'quantity', 'alreadyReturnedQty', 'reason', 'answers', 'chaosSeed',
  ],
  tasks: [
    inline('intake_return', intakeReturn, {
      orderState: '${workflow.input.orderState}',
      orderNumber: '${workflow.input.orderNumber}',
      orderLines: '${workflow.input.orderLines}',
      productId: '${workflow.input.productId}',
      quantity: '${workflow.input.quantity}',
      alreadyReturnedQty: '${workflow.input.alreadyReturnedQty}',
      reason: '${workflow.input.reason}',
    }),
    {
      name: 'bureaucracy_loop',
      taskReferenceName: 'bureaucracy_loop',
      type: 'DO_WHILE',
      evaluatorType: 'graaljs',
      inputParameters: { bureaucracy_loop: '${bureaucracy_loop.output}' },
      loopCondition: "(function(){ return $.bureaucracy_loop['iteration'] < 7; })();",
      loopOver: [
        inline('run_pointless_check', runPointlessCheck, {
          iteration: '${bureaucracy_loop.output.iteration}',
          seed: '${workflow.input.chaosSeed}',
          regretLevel: '${workflow.input.answers.regretLevel}',
          triedLikingIt: '${workflow.input.answers.triedLikingIt}',
          productName: '${intake_return.output.result.productName}',
        }),
      ],
    },
    inline('tally_checks', tallyChecks, { loop: '${bureaucracy_loop.output}' }),
    {
      name: MANAGER_REVIEW_TASK,
      taskReferenceName: MANAGER_REVIEW_TASK,
      type: 'WAIT',
      inputParameters: { duration: '4s' },
    },
    inline('decide_return', decideReturn, {
      eligible: '${intake_return.output.result.eligible}',
      code: '${intake_return.output.result.code}',
      reason: '${intake_return.output.result.reason}',
      productName: '${intake_return.output.result.productName}',
      refundableCents: '${intake_return.output.result.refundableCents}',
      passed: '${tally_checks.output.result.passed}',
      failed: '${tally_checks.output.result.failed}',
      inconclusive: '${tally_checks.output.result.inconclusive}',
      managerNudged: '${manager_review.output.nudged}',
    }),
    {
      name: 'file_decision',
      taskReferenceName: 'file_decision',
      type: 'JSON_JQ_TRANSFORM',
      inputParameters: {
        intake: '${intake_return.output.result}',
        checks: '${tally_checks.output.result.checks}',
        verdict: '${decide_return.output.result}',
        queryExpression:
          '{decision: .verdict.decision, code: .verdict.code, headline: .verdict.headline, explanation: .verdict.explanation, ' +
          'refundCents: .verdict.refundCents, refundMethod: .verdict.refundMethod, managerNote: .verdict.managerNote, ' +
          'checksSummary: .verdict.checksSummary, checks: .checks, orderNumber: .intake.orderNumber, productId: .intake.productId, ' +
          'productName: .intake.productName, quantity: .intake.quantity, reason: .intake.reason}',
      },
    },
  ],
  outputParameters: {
    return: '${file_decision.output.result}',
  },
};
