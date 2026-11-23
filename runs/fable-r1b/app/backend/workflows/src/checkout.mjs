import { script, JS_HASH, JQ_DEFS, OWNER_EMAIL } from "./helpers.mjs";

const FALLBACK_ITEM = `{id: "nothing-deluxe", name: "Nothing (Deluxe Edition)", unitPrice: 49.99, qty: 1}`;

const normalizeOrder = script`
${JQ_DEFS}
try (
  {
    orderId: (.orderId | text("CC-ANONYMOUS"; 64)),
    customer: {
      name: ((.customer | obj | .name) | text("Valued Customer"; 80)),
      email: ((.customer | obj | .email) | text("no-reply@chaos-commerce.example"; 120))
    },
    coupon: (.coupon | text(""; 40)),
    shipping: (.shipping | text("standard"; 40)),
    placedAt: (.placedAt | text(""; 40)),
    items: ([
      (.items | if type == "array" then .[] else empty end)
      | select(type == "object")
      | {
          id: (.id | text("mystery-item"; 64)),
          name: (.name | text("Mystery Item"; 120)),
          unitPrice: (.unitPrice | num(0) | clamp(-100000; 10000000)),
          qty: (.qty | num(1) | floor | clamp(1; 99))
        }
    ] | .[0:50])
  }
  | if (.items | length) == 0
    then .items = [${FALLBACK_ITEM}] | .emptyCartUpsell = true
    else .emptyCartUpsell = false
    end
) catch {
  orderId: "CC-ANONYMOUS",
  customer: {name: "Valued Customer", email: "no-reply@chaos-commerce.example"},
  coupon: "", shipping: "standard", placedAt: "",
  items: [${FALLBACK_ITEM}],
  emptyCartUpsell: true,
  recoveredFromGarbage: true
}
`;

const priceOrder = script`
${JQ_DEFS}
def abs: if . < 0 then -. else . end;
try (
  (.order | obj) as $o
  | (($o.items // []) | map(. + {lineTotal: ((.unitPrice * .qty) | cents)})) as $lines
  | ($lines | map(.lineTotal) | add // 0 | cents) as $subtotal
  | ($subtotal | abs) as $base
  | {
      standard: {label: "Standard Shipping (6-8 business years)", amount: 74.00},
      express: {label: "Express Shipping (Standard, but we feel rushed)", amount: 148.00},
      catapult: {label: "Catapult Delivery (no tracking, some screaming)", amount: 9.99},
      pickup: {label: "In-Store Pickup Fee (we have no stores)", amount: 31.00}
    } as $shipping
  | ($shipping[($o.shipping // "standard")] // $shipping.standard) as $ship
  | (
      [
        {code: "CONVENIENCE", label: "Convenience Fee", amount: ($base * 0.12 | cents)},
        {code: "INCONVENIENCE", label: "Inconvenience Fee", amount: 4.99},
        {code: "SHIPPING", label: $ship.label, amount: $ship.amount}
      ]
      + (if (($o.coupon // "") | length) > 0
         then [{code: "COUPON", label: ("Coupon '" + $o.coupon + "' Redemption Surcharge"), amount: ($base * 0.10 | cents)}]
         else [] end)
      + (if $subtotal < 0
         then [{code: "NEGATIVITY", label: "Negative Price Correction Fee", amount: (($base * 2 + 1) | cents)}]
         else [] end)
    ) as $baseFees
  | ($baseFees + [{
      code: "FEE_FEE",
      label: "Fee Processing Fee (a fee for processing the fees)",
      amount: (($baseFees | map(.amount) | add) * 0.05 | cents)
    }]) as $fees
  | (($subtotal + ($fees | map(.amount) | add)) | cents) as $total
  | {
      lines: $lines,
      subtotal: $subtotal,
      fees: $fees,
      total: (if $total < 0.01 then 0.01 else $total end),
      currency: "USD"
    }
) catch {
  lines: [],
  subtotal: 49.99,
  fees: [{code: "MYSTERY", label: "Mystery Fee (our calculator caught fire)", amount: 0.01}],
  total: 50.00,
  currency: "USD",
  recoveredFromGarbage: true
}
`;

const attemptPayment = script`
(function () {
  ${JS_HASH}
  var processors = ["ChaosPay", "PayPerhaps", "A Guy Named Dale"];
  var excuses = [
    "Declined: the card reader is on its lunch break.",
    "Declined: your bank laughed and hung up.",
    "Declined: the payment fell behind the server rack.",
    "Declined: we charged somebody else by mistake. They seemed fine with it.",
    "Declined: insufficient vibes.",
    "Declined: processor returned HTTP 418 and a photo of a teapot."
  ];
  try {
    var attempt = Number($.attempt) || 1;
    var h = hash(String($.orderId) + ":pay:" + attempt);
    var approved = (h % 100) < 40;
    var firstExcuse = hash(String($.orderId) + ":excuse");
    return {
      attempt: attempt,
      processor: processors[(attempt - 1) % processors.length],
      approved: approved,
      message: approved ? "Approved. Nobody is more surprised than we are." : excuses[(firstExcuse + attempt) % excuses.length]
    };
  } catch (e) {
    return { attempt: 0, processor: "Panic", approved: false, message: "Declined: the card reader panicked." };
  }
})();
`;

const paymentLoopCondition = script`
(function () {
  var loop = $.payment_attempts;
  var iteration = loop ? loop["iteration"] : 99;
  if (!(iteration < 3)) { return false; }
  var last = $.attempt_payment;
  return !(last && last.result && last.result.approved === true);
})();
`;

const capturePayment = script`
try ({
  method: "CARD",
  status: "PAID",
  processor: (.attempt.processor // "ChaosPay"),
  attempts: (.attempt.attempt // 1),
  amount: (.total // 0),
  note: (.attempt.message // "Approved.")
}) catch {method: "CARD", status: "PAID", processor: "ChaosPay", attempts: 1, amount: 0, note: "Approved."}
`;

const acceptIou = script`
try ({
  method: "IOU",
  status: "PAID_ISH",
  processor: "A napkin with 'IOU' written on it",
  attempts: (.attempts // 3),
  amount: (.total // 0),
  note: "Every payment processor declined, so we accepted an IOU instead. We trust you. We should not."
}) catch {method: "IOU", status: "PAID_ISH", processor: "A napkin", attempts: 3, amount: 0, note: "IOU accepted."}
`;

const reserveInventory = script`
(function () {
  ${JS_HASH}
  var outcomes = [
    "Reserved. It is the last one, allegedly.",
    "Out of stock. Substituting a similarly shaped object.",
    "Backordered until 2094. Shipping the box now and the contents later.",
    "Found behind the warehouse fridge. Mostly fine.",
    "In stock in a warehouse we can no longer find.",
    "Reserved for you and, due to a clerical error, four other people."
  ];
  var reservations = [];
  try {
    var lines = $.lines || [];
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      var h = hash(String($.orderId) + ":stock:" + i + ":" + line.id);
      reservations.push({ id: line.id, name: line.name, qty: line.qty, status: outcomes[h % outcomes.length] });
    }
  } catch (e) {
    reservations = [{ id: "unknown", name: "Your order", qty: 1, status: "The warehouse is not answering. Shipping something anyway." }];
  }
  return { reservations: reservations };
})();
`;

const chooseCarrier = script`
(function () {
  ${JS_HASH}
  var carriers = [
    { name: "Gerald (a trained pigeon)", eta: "3-5 business moons" },
    { name: "Dale's Hatchback", eta: "Whenever Dale wakes up" },
    { name: "The Postal Service of a Country That No Longer Exists", eta: "1987" },
    { name: "A Balloon, Released Hopefully", eta: "Depends on the wind" },
    { name: "Certified Tortoise Express", eta: "Before the heat death of the universe (not guaranteed)" }
  ];
  try {
    var h = hash(String($.orderId) + ":ship");
    var carrier = $.shipping === "catapult"
      ? { name: "The Catapult", eta: "Already overshot your house" }
      : carriers[h % carriers.length];
    return { carrier: carrier.name, eta: carrier.eta, trackingNumber: "CHAOS-" + (100000 + (h % 900000)) + "-LOL" };
  } catch (e) {
    return { carrier: "Gerald (a trained pigeon)", eta: "Eventually", trackingNumber: "CHAOS-000000-LOL" };
  }
})();
`;

const buildConfirmation = script`
${JQ_DEFS}
try (
  (.order | obj) as $o | (.pricing | obj) as $p
  | {
      orderId: ($o.orderId // "CC-ANONYMOUS"),
      status: "CONFIRMED",
      customer: ($o.customer // {}),
      placedAt: ($o.placedAt // ""),
      confirmedAtEpochSeconds: (now | floor),
      items: ($p.lines // []),
      subtotal: ($p.subtotal // 0),
      fees: ($p.fees // []),
      total: ($p.total // 0),
      currency: ($p.currency // "USD"),
      payment: (.paid // .iou // {method: "IOU", status: "PAID_ISH", processor: "A napkin", attempts: 3, amount: ($p.total // 0), note: "IOU accepted."}),
      paymentAttempts: ([.loop | obj | to_entries[] | select(.value | type == "object") | .value.attempt_payment.result | select(. != null)] | sort_by(.attempt)),
      inventory: ((.inventory | obj | .reservations) // []),
      delivery: (.delivery // {carrier: "Gerald (a trained pigeon)", eta: "Eventually", trackingNumber: "CHAOS-000000-LOL"}),
      emptyCartUpsell: ($o.emptyCartUpsell // false),
      message: (if ($o.emptyCartUpsell // false)
                then "Your cart was empty, so we sold you Nothing (Deluxe Edition). Order confirmed."
                else "Order confirmed. Against all odds, and several of our own policies." end)
    }
) catch {orderId: "CC-ANONYMOUS", status: "CONFIRMED", items: [], fees: [], total: 0, currency: "USD", message: "Order confirmed. We lost the details, but it is definitely confirmed."}
`;

export const chaosCheckout = {
  name: "chaos_checkout",
  description:
    "Chaos Commerce checkout. Normalizes any cart (even an empty or garbage one), adds absurd fees, tries up to three flaky payment processors and falls back to an IOU, reserves inventory and picks a carrier in parallel, then confirms the order. Every path ends in a confirmed order; no step depends on an external worker.",
  version: 1,
  schemaVersion: 2,
  ownerEmail: OWNER_EMAIL,
  restartable: true,
  timeoutPolicy: "ALERT_ONLY",
  timeoutSeconds: 300,
  inputParameters: ["orderId", "customer", "items", "coupon", "shipping", "placedAt"],
  tasks: [
    {
      name: "normalize_order",
      taskReferenceName: "normalize_order",
      type: "JSON_JQ_TRANSFORM",
      inputParameters: {
        orderId: "${workflow.input.orderId}",
        customer: "${workflow.input.customer}",
        items: "${workflow.input.items}",
        coupon: "${workflow.input.coupon}",
        shipping: "${workflow.input.shipping}",
        placedAt: "${workflow.input.placedAt}",
        queryExpression: normalizeOrder,
      },
    },
    {
      name: "price_order",
      taskReferenceName: "price_order",
      type: "JSON_JQ_TRANSFORM",
      inputParameters: {
        order: "${normalize_order.output.result}",
        queryExpression: priceOrder,
      },
    },
    {
      name: "payment_attempts",
      taskReferenceName: "payment_attempts",
      type: "DO_WHILE",
      evaluatorType: "graaljs",
      inputParameters: { payment_attempts: "${payment_attempts.output}" },
      loopCondition: paymentLoopCondition,
      loopOver: [
        {
          name: "attempt_payment",
          taskReferenceName: "attempt_payment",
          type: "INLINE",
          inputParameters: {
            evaluatorType: "graaljs",
            orderId: "${normalize_order.output.result.orderId}",
            attempt: "${payment_attempts.output.iteration}",
            expression: attemptPayment,
          },
        },
      ],
    },
    {
      name: "payment_outcome",
      taskReferenceName: "payment_outcome",
      type: "SWITCH",
      evaluatorType: "graaljs",
      expression: "$.approved === true ? 'paid' : 'iou'",
      inputParameters: { approved: "${attempt_payment.output.result.approved}" },
      decisionCases: {
        paid: [
          {
            name: "capture_payment",
            taskReferenceName: "capture_payment",
            type: "JSON_JQ_TRANSFORM",
            inputParameters: {
              attempt: "${attempt_payment.output.result}",
              total: "${price_order.output.result.total}",
              queryExpression: capturePayment,
            },
          },
        ],
      },
      defaultCase: [
        {
          name: "accept_iou",
          taskReferenceName: "accept_iou",
          type: "JSON_JQ_TRANSFORM",
          inputParameters: {
            attempts: "${payment_attempts.output.iteration}",
            total: "${price_order.output.result.total}",
            queryExpression: acceptIou,
          },
        },
      ],
    },
    {
      name: "fulfilment_fork",
      taskReferenceName: "fulfilment_fork",
      type: "FORK_JOIN",
      forkTasks: [
        [
          {
            name: "reserve_inventory",
            taskReferenceName: "reserve_inventory",
            type: "INLINE",
            inputParameters: {
              evaluatorType: "graaljs",
              orderId: "${normalize_order.output.result.orderId}",
              lines: "${price_order.output.result.lines}",
              expression: reserveInventory,
            },
          },
        ],
        [
          {
            name: "choose_carrier",
            taskReferenceName: "choose_carrier",
            type: "INLINE",
            inputParameters: {
              evaluatorType: "graaljs",
              orderId: "${normalize_order.output.result.orderId}",
              shipping: "${normalize_order.output.result.shipping}",
              expression: chooseCarrier,
            },
          },
        ],
      ],
    },
    {
      name: "fulfilment_join",
      taskReferenceName: "fulfilment_join",
      type: "JOIN",
      joinOn: ["reserve_inventory", "choose_carrier"],
    },
    {
      name: "build_confirmation",
      taskReferenceName: "build_confirmation",
      type: "JSON_JQ_TRANSFORM",
      inputParameters: {
        order: "${normalize_order.output.result}",
        pricing: "${price_order.output.result}",
        loop: "${payment_attempts.output}",
        paid: "${capture_payment.output.result}",
        iou: "${accept_iou.output.result}",
        inventory: "${reserve_inventory.output.result}",
        delivery: "${choose_carrier.output.result}",
        queryExpression: buildConfirmation,
      },
    },
  ],
  outputParameters: {
    orderId: "${build_confirmation.output.result.orderId}",
    status: "${build_confirmation.output.result.status}",
    confirmation: "${build_confirmation.output.result}",
  },
};
