import { inline, OWNER_EMAIL } from './lib.js';
import { openOrder, priceOrder, attemptPayment, settlePayment, packOrder } from './scripts.js';

export const CHECKOUT_WORKFLOW = 'chaos_checkout';

// System tasks only: nothing here waits on a worker, a human or another
// service, so a started checkout runs to COMPLETED on the Conductor server
// alone. The payment loop is capped and settle_payment approves regardless.
export const checkoutWorkflow = {
  name: CHECKOUT_WORKFLOW,
  description:
    'Chaos Commerce checkout: prices the cart with absurd fees, argues with a payment gateway that always gives in (max 4 attempts), packs the parcels and confirms the order. Always completes.',
  version: 1,
  schemaVersion: 2,
  ownerEmail: OWNER_EMAIL,
  restartable: true,
  // ALERT_ONLY on purpose: a slow checkout is flagged, never killed.
  timeoutSeconds: 120,
  timeoutPolicy: 'ALERT_ONLY',
  inputParameters: ['checkoutId', 'customerName', 'items', 'chaosSeed'],
  tasks: [
    inline('open_order', openOrder, {
      customerName: '${workflow.input.customerName}',
      workflowId: '${workflow.workflowId}',
      seed: '${workflow.input.chaosSeed}',
    }),
    inline('price_order', priceOrder, {
      items: '${workflow.input.items}',
      seed: '${workflow.input.chaosSeed}',
    }),
    {
      name: 'payment_loop',
      taskReferenceName: 'payment_loop',
      type: 'DO_WHILE',
      evaluatorType: 'graaljs',
      inputParameters: {
        payment_loop: '${payment_loop.output}',
        approved: '${attempt_payment.output.result.approved}',
      },
      loopCondition: "(function(){ return $.payment_loop['iteration'] < 4 && $.approved !== true; })();",
      loopOver: [
        inline('attempt_payment', attemptPayment, {
          iteration: '${payment_loop.output.iteration}',
          seed: '${workflow.input.chaosSeed}',
        }),
      ],
    },
    inline('settle_payment', settlePayment, {
      loop: '${payment_loop.output}',
      totalCents: '${price_order.output.result.totalCents}',
    }),
    inline('pack_order', packOrder, {
      lines: '${price_order.output.result.lines}',
      seed: '${workflow.input.chaosSeed}',
    }),
    {
      name: 'confirm_order',
      taskReferenceName: 'confirm_order',
      type: 'JSON_JQ_TRANSFORM',
      inputParameters: {
        opened: '${open_order.output.result}',
        pricing: '${price_order.output.result}',
        payment: '${settle_payment.output.result}',
        shipment: '${pack_order.output.result}',
        queryExpression:
          '{orderNumber: .opened.orderNumber, status: "CONFIRMED", customerName: .opened.customerName, greeting: .opened.greeting, ' +
          'lines: .pricing.lines, itemCount: .pricing.itemCount, subtotalCents: .pricing.subtotalCents, fees: .pricing.fees, ' +
          'feesCents: .pricing.feesCents, totalCents: .pricing.totalCents, payment: .payment, shipment: .shipment}',
      },
    },
  ],
  outputParameters: {
    order: '${confirm_order.output.result}',
  },
};
