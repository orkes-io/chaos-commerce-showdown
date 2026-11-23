import { OWNER_EMAIL, jq, inline, drillGate } from "./helpers.js";

const normalizeCart = jq(
  "normalize_cart",
  { lines: "${workflow.input.lines}" },
  String.raw`
  (.lines // []) as $raw
  | (if ($raw | length) == 0
     then [{productId: "mandatory-mystery-item", name: "Mandatory Mystery Item", emoji: "❓", unitPriceCents: 1313, quantity: 1,
            note: "Your cart was empty, which we took personally. We added something."}]
     else $raw end)
  | map(. + {quantity: ((.quantity // 1) | if . < 1 then 1 elif . > 99 then 99 else . end),
             unitPriceCents: (.unitPriceCents // 0)})
  | map(. + {lineTotalCents: (.unitPriceCents * .quantity)})
  | {lines: ., itemCount: (map(.quantity) | add), subtotalCents: (map(.lineTotalCents) | add),
     cartWasEmpty: (($raw | length) == 0)}`,
);

const priceOrder = jq(
  "price_order",
  {
    subtotalCents: "${normalize_cart.output.result.subtotalCents}",
    itemCount: "${normalize_cart.output.result.itemCount}",
    coupon: "${workflow.input.coupon}",
  },
  String.raw`
  .subtotalCents as $sub | .itemCount as $n | (.coupon // "") as $coupon
  | ([{code: "CONVENIENCE", label: "Convenience Fee", amountCents: 499},
      {code: "INCONVENIENCE", label: "Inconvenience Fee (calculating the Convenience Fee was a hassle)", amountCents: 501},
      {code: "GRAVITY", label: "Gravity Surcharge (\($n) item(s) held down at $0.42 each)", amountCents: (42 * $n)},
      {code: "TAX", label: "Sales Tax (we guessed 13.37%)", amountCents: (($sub * 1337 / 10000) | floor)}]
     + (if $coupon != ""
        then [{code: "COUPON", label: "Coupon Handling Charge for \"\($coupon)\" (coupons cost money to process)",
               amountCents: (($sub * 15 / 100) | floor)}]
        else [] end)) as $base
  | ($base + [{code: "FEE_FEE", label: "Fee Processing Fee (a 10% fee on the fees)",
               amountCents: ((($base | map(.amountCents) | add) * 10 / 100) | floor)},
              {code: "LOYALTY", label: "Loyalty Discount (you're welcome)", amountCents: -1}]) as $fees
  | ($sub + ($fees | map(.amountCents) | add)) as $pre
  | ((($pre / 100) | floor) * 100 + 99) as $total
  | {subtotalCents: $sub,
     fees: ($fees + [{code: "ROUNDING", label: "Rounding (up, to a number we find attractive)", amountCents: ($total - $pre)}]),
     totalCents: $total}`,
);

const consultInventory = jq(
  "consult_inventory",
  { lines: "${normalize_cart.output.result.lines}", seed: "${workflow.input.seed}" },
  String.raw`
  (.seed // 0) as $seed
  | [.lines | to_entries[] | (($seed + .key * 7) % 5) as $roll
     | {productId: .value.productId, name: .value.name,
        status: (if $roll == 0 then "SUBSTITUTED" elif $roll == 1 then "HIDING" else "ALLEGEDLY_IN_STOCK" end),
        note: (if $roll == 0 then "Out of stock. Substituted with a brick of similar weight."
               elif $roll == 1 then "In stock, but hiding. Gary is looking for it."
               else "In stock, according to a spreadsheet last opened in 2014." end)}]
  | {items: ., substitutions: (map(select(.status == "SUBSTITUTED")) | length), blocksCheckout: false}`,
);

const vibeCheck = inline(
  "vibe_check",
  { seed: "${workflow.input.seed}" },
  `(function () {
    var seed = Number($.seed) || 0;
    var vibes = ['immaculate', 'rancid', 'suspiciously normal', 'like a Tuesday', 'legally distinct from fraud', 'haunted'];
    var score = seed % 101;
    var vibe = vibes[seed % vibes.length];
    return {
      score: score,
      vibe: vibe,
      verdict: score > 66 ? 'SUSPICIOUS_BUT_SOLVENT' : 'FINE_PROBABLY',
      proceed: true,
      note: 'Fraud check by vibes: ' + vibe + ' (' + score + '/100). We need the sale, so we are proceeding either way.'
    };
  })();`,
);

const attemptPayment = inline(
  "attempt_payment",
  {
    seed: "${workflow.input.seed}",
    attempt: "${payment_saga.output.iteration}",
    methodId: "${workflow.input.paymentMethod.id}",
    methodLabel: "${workflow.input.paymentMethod.label}",
  },
  `(function () {
    var attempt = Number($.attempt) || 1;
    var roll = ((Number($.seed) || 0) + attempt * 37) % 10;
    var excuses = {
      magic_beans: 'The beans were counted. Two were lentils.',
      found_card: 'The card we found in the parking lot has been reported found.',
      exposure: 'Exposure is not legal tender. Yet.',
      firstborn: 'Your firstborn failed the credit check.',
      iou: 'The IOU was written in disappearing ink.'
    };
    var approved = $.methodId !== 'exposure' && roll < 3 + attempt * 2;
    return {
      attempt: attempt,
      approved: approved,
      status: approved ? 'CHARGED' : 'DECLINED',
      message: approved
        ? 'Attempt ' + attempt + ': ' + $.methodLabel + ' accepted. Nobody is more surprised than us.'
        : 'Attempt ' + attempt + ': declined. ' + (excuses[$.methodId] || 'Our payment hamster is on a break.')
    };
  })();`,
);

const paymentSaga = {
  name: "payment_saga",
  taskReferenceName: "payment_saga",
  type: "DO_WHILE",
  evaluatorType: "graaljs",
  inputParameters: { payment_saga: "${payment_saga.output}" },
  loopCondition: `(function () { var last = $.attempt_payment ? $.attempt_payment.result : null; var approved = last ? last.approved === true : false; return !approved && $.payment_saga['iteration'] < 3; })();`,
  loopOver: [attemptPayment],
};

const paymentInputs = {
  totalCents: "${price_order.output.result.totalCents}",
  methodLabel: "${workflow.input.paymentMethod.label}",
};

// "CHARGED" is the only way to get a receipt. Every other outcome, including one we did
// not anticipate, opens a tab instead, so the order is confirmed either way.
const settlePayment = {
  name: "settle_payment",
  taskReferenceName: "settle_payment",
  type: "SWITCH",
  evaluatorType: "value-param",
  expression: "paymentStatus",
  inputParameters: { paymentStatus: "${attempt_payment.output.result.status}" },
  decisionCases: {
    CHARGED: [
      jq(
        "issue_receipt",
        paymentInputs,
        String.raw`{status: "CHARGED", amountCents: .totalCents,
          note: "Charged to: \(.methodLabel // "something"). A receipt has been mailed to an address we made up."}`,
      ),
    ],
  },
  defaultCase: [
    jq(
      "open_tab",
      paymentInputs,
      String.raw`{status: "TAB_OPENED", amountCents: .totalCents,
        note: "Every payment attempt failed, so we opened a tab. A man named Gary will be in touch. Your order is confirmed anyway; we have a quota."}`,
    ),
  ],
};

const arrangeShipping = inline(
  "arrange_shipping",
  { seed: "${workflow.input.seed}", address: "${workflow.input.customer.address}" },
  `(function () {
    var seed = Number($.seed) || 0;
    var carriers = [
      { carrier: 'A Guy Named Dale', eta: 'whenever Dale feels like it' },
      { carrier: 'Trebuchet Express', eta: 'instantly, somewhere within 300 metres of your address' },
      { carrier: 'Migratory Geese (seasonal)', eta: 'by spring, weather and geese permitting' },
      { carrier: 'The Postal Service of a Country That No Longer Exists', eta: '3 to 900 business days' },
      { carrier: 'Our Intern, On Foot', eta: 'he left in 2019 and we remain hopeful' }
    ];
    var pick = carriers[seed % carriers.length];
    var address = $.address ? String($.address) : '';
    return {
      carrier: pick.carrier,
      eta: pick.eta,
      trackingNumber: 'CC' + (seed % 1000000) + 'LOL',
      destination: address.length ? address : 'No address given, so we will ship it to ours and wave.',
      note: 'Tracking updates are available by shouting.'
    };
  })();`,
);

const confirmOrder = jq(
  "confirm_order",
  {
    workflowId: "${workflow.workflowId}",
    placedAt: "${workflow.input.placedAt}",
    customer: "${workflow.input.customer}",
    paymentMethod: "${workflow.input.paymentMethod}",
    cart: "${normalize_cart.output.result}",
    pricing: "${price_order.output.result}",
    inventory: "${consult_inventory.output.result}",
    vibes: "${vibe_check.output.result}",
    saga: "${payment_saga.output}",
    receipt: "${issue_receipt.output.result}",
    tab: "${open_tab.output.result}",
    shipping: "${arrange_shipping.output.result}",
  },
  String.raw`
  {orderNumber: ("CHAOS-" + (.workflowId[0:8] | ascii_upcase)),
   status: "CONFIRMED",
   rescued: false,
   placedAt: .placedAt,
   customer: .customer,
   lines: .cart.lines,
   itemCount: .cart.itemCount,
   cartWasEmpty: .cart.cartWasEmpty,
   subtotalCents: .pricing.subtotalCents,
   fees: .pricing.fees,
   totalCents: .pricing.totalCents,
   payment: ((.receipt // .tab) + {
     method: .paymentMethod,
     attempts: ([.saga | to_entries[] | select(.key | test("^[0-9]+$"))
                 | {n: (.key | tonumber), result: .value.attempt_payment.result}]
                | sort_by(.n) | map(.result))}),
   inventory: .inventory,
   vibeCheck: .vibes,
   shipping: .shipping,
   message: "Order confirmed. Against all odds, and several of our own policies."}`,
);

export const checkout = {
  name: "chaos_checkout",
  description:
    "Chaos Commerce checkout. Normalizes the cart, runs three pointless checks in parallel, tries to take payment up to three times and opens a tab if that fails, then confirms the order. No step can block the order, and chaos_checkout_rescue confirms it if this workflow fails or times out.",
  version: 1,
  schemaVersion: 2,
  ownerEmail: OWNER_EMAIL,
  restartable: true,
  timeoutPolicy: "TIME_OUT_WF",
  timeoutSeconds: 120,
  failureWorkflow: "chaos_checkout_rescue",
  inputParameters: [
    "checkoutId",
    "seed",
    "placedAt",
    "customer",
    "lines",
    "coupon",
    "paymentMethod",
    "disasterDrill",
  ],
  tasks: [
    drillGate("Disaster drill: the checkout system was set on fire on purpose."),
    normalizeCart,
    {
      name: "pointless_checks",
      taskReferenceName: "pointless_checks",
      type: "FORK_JOIN",
      forkTasks: [[priceOrder], [consultInventory], [vibeCheck]],
    },
    {
      name: "join_checks",
      taskReferenceName: "join_checks",
      type: "JOIN",
      joinOn: ["price_order", "consult_inventory", "vibe_check"],
    },
    paymentSaga,
    settlePayment,
    arrangeShipping,
    confirmOrder,
  ],
  outputParameters: { order: "${confirm_order.output.result}" },
};

// Runs as the failureWorkflow of chaos_checkout (and is started directly by the backend
// for a checkout an operator terminated). Its input is the original checkout input plus
// workflowId / reason / failureStatus. One defensive transform, so there is nothing left to fail.
export const checkoutRescue = {
  name: "chaos_checkout_rescue",
  description:
    "Confirms an order whose chaos_checkout execution failed, timed out or was terminated, using only the original checkout input. This is what makes checkout always complete.",
  version: 1,
  schemaVersion: 2,
  ownerEmail: OWNER_EMAIL,
  restartable: true,
  timeoutPolicy: "ALERT_ONLY",
  timeoutSeconds: 60,
  inputParameters: [
    "workflowId",
    "reason",
    "failureStatus",
    "placedAt",
    "customer",
    "lines",
    "paymentMethod",
  ],
  tasks: [
    jq(
      "write_order_on_napkin",
      {
        failedWorkflowId: "${workflow.input.workflowId}",
        failureStatus: "${workflow.input.failureStatus}",
        placedAt: "${workflow.input.placedAt}",
        customer: "${workflow.input.customer}",
        lines: "${workflow.input.lines}",
        paymentMethod: "${workflow.input.paymentMethod}",
      },
      String.raw`
      ((.lines // []) | if type == "array" then . else [] end) as $raw
      | (.customer | if type == "object" then . else {} end) as $c
      | {name: (($c.name // "") | tostring | if . == "" then "Valued Customer" else . end),
         address: (($c.address // "") | tostring)} as $customer
      | (.paymentMethod | if type == "object" then . else {id: "iou", label: "A Handwritten IOU"} end) as $method
      | ($raw | map(select(type == "object"))
         | map({productId: ((.productId // "unknown") | tostring), name: ((.name // "Something You Wanted") | tostring),
                emoji: ((.emoji // "📦") | tostring),
                unitPriceCents: ((.unitPriceCents // 0) | if type == "number" and . > 0 then floor else 0 end),
                quantity: ((.quantity // 1) | if type == "number" then (if . < 1 then 1 elif . > 99 then 99 else floor end) else 1 end)})
         | map(. + {lineTotalCents: (.unitPriceCents * .quantity)})) as $lines
      | (if ($lines | length) == 0
         then [{productId: "mandatory-mystery-item", name: "Mandatory Mystery Item", emoji: "❓", unitPriceCents: 1313,
                quantity: 1, lineTotalCents: 1313, note: "We could not read your cart, so we guessed."}]
         else $lines end) as $lines
      | ($lines | map(.lineTotalCents) | add) as $sub
      | ((.failedWorkflowId // "napkin00") | tostring) as $id
      | {orderNumber: ("CHAOS-" + ($id[0:8] | ascii_upcase)),
         status: "CONFIRMED",
         rescued: true,
         rescuedFrom: {workflowId: .failedWorkflowId, status: (.failureStatus // "UNKNOWN")},
         placedAt: ((.placedAt // "") | tostring),
         customer: $customer,
         lines: $lines,
         itemCount: ($lines | map(.quantity) | add),
         cartWasEmpty: (($raw | length) == 0),
         subtotalCents: $sub,
         fees: [{code: "NAPKIN", label: "Emergency Napkin Fee (we wrote your order on one)", amountCents: 299}],
         totalCents: ($sub + 299),
         payment: {status: "TAB_OPENED", amountCents: ($sub + 299), method: $method, attempts: [],
                   note: "The payment system is currently on fire, so we opened a tab. A man named Gary will be in touch."},
         inventory: {items: [], substitutions: 0, blocksCheckout: false},
         vibeCheck: {score: 0, vibe: "smoky", verdict: "FINE_PROBABLY", proceed: true,
                     note: "Fraud check skipped. The vibes were unavailable due to fire."},
         shipping: {carrier: "Whoever Is Still In The Building", eta: "eventually",
                    trackingNumber: "CC-NAPKIN", destination: $customer.address,
                    note: "Tracking updates are available by shouting."},
         message: "Our checkout system caught fire, so we wrote your order on a napkin. Order confirmed anyway."}`,
    ),
  ],
  outputParameters: { order: "${write_order_on_napkin.output.result}" },
};
