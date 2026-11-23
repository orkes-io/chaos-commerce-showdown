# Final receipt. Pricing and payment are always present here; fulfilment may be
# missing because that task is optional, so it has fallbacks.
.cart as $c
| .pricing as $p
| (.fulfilment | if type == "object" and (.lines | type) == "array" then . else null end) as $f
| {
    status: "CONFIRMED",
    rescued: false,
    orderId: $c.orderId,
    placedAt: $c.placedAt,
    customer: $c.customer,
    lines: ($f.lines // [$c.lines[] | . + {fulfilment: "Status unavailable. Assume the worst."}]),
    itemCount: $p.itemCount,
    subtotalCents: $p.subtotalCents,
    charges: $p.charges,
    totalCents: $p.totalCents,
    coupon: $c.coupon,
    payment: (.payment + {method: $c.payment.label}),
    shipping: {
      method: $c.shipping.label,
      eta: $c.shipping.eta,
      trackingNumber: ($f.trackingNumber // "TRK-PENDING-LOST")
    },
    loyaltyPoints: (0 - (($p.totalCents / 100 | floor) % 1000000000000000)),
    message: "Thank you for your purchase. No further questions, please."
  }
