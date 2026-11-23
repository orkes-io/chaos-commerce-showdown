# Emergency receipt, issued when the main checkout failed or timed out.
# No fees are charged: if we broke the checkout, the order goes through at cost.
.cart as $c
| ([$c.lines[] | .qty * .unitPriceCents] | add // 0) as $subtotal
| (.failure | if type == "object" then . else {} end) as $x
| {
    status: "CONFIRMED",
    rescued: true,
    rescuedFrom: {
      workflowId: ($x.workflowId | if type == "string" then . else null end),
      reason: ($x.reason | if type == "string" then .[0:300] else "The checkout stopped before it finished." end)
    },
    orderId: $c.orderId,
    placedAt: $c.placedAt,
    customer: $c.customer,
    lines: [$c.lines[] | . + {fulfilment: "Allocated by hand, by whoever was nearest."}],
    itemCount: ([$c.lines[].qty] | add // 0),
    subtotalCents: $subtotal,
    charges: [
      {label: "Fees", amountCents: 0, note: "Waived. Our checkout fell over, so this one is at cost."}
    ],
    totalCents: $subtotal,
    coupon: $c.coupon,
    payment: {
      attempts: [],
      attemptsNeeded: 0,
      settled: true,
      settledBy: "House IOU (emergency edition)",
      method: $c.payment.label
    },
    shipping: {
      method: $c.shipping.label,
      eta: $c.shipping.eta,
      trackingNumber: "TRK-\($c.seed)-RESCUED"
    },
    loyaltyPoints: 0,
    message: "Our checkout fell over, so we finished your order by hand. It still counts."
  }
