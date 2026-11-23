# Prices the cart. All money is integer cents; totalCents is always
# subtotalCents plus the sum of the charges, so the receipt adds up.
# ceil yields a float here; the modulo turns it back into a true integer.
def int: ceil % 1000000000000000;
def pct(p): (. * p / 100) | int;

.cart as $c
| ([$c.lines[] | .qty * .unitPriceCents] | add // 0) as $subtotal
| ([$c.lines[] | select(.qty >= 3) | .qty * .unitPriceCents] | add // 0) as $bulk
| (
    [
      (if ($c.lines | length) == 0
        then {label: "Empty Cart Handling Fee", amountCents: 499, note: "Carrying nothing is harder than it looks."}
        else empty end),
      (if $bulk > 0
        then {label: "Bulk Purchase Surcharge (5%)", amountCents: ($bulk | pct(5)), note: "Buy more, pay more."}
        else empty end),
      (if ($c.coupon | length) > 0
        then {label: "Coupon \"\($c.coupon)\" Redemption Fee (10%)", amountCents: ($subtotal | pct(10)), note: "Coupons are a premium feature."}
        else empty end),
      {label: "Convenience Fee", amountCents: 499, note: "For your convenience."},
      {label: "Inconvenience Fee", amountCents: 499, note: "For ours."},
      {label: "Shipping: \($c.shipping.label)", amountCents: $c.shipping.priceCents, note: $c.shipping.eta},
      {label: "Tax (13.37%, vibes-based)", amountCents: ($subtotal * 1337 / 10000 | int), note: "We asked around."}
    ]
  ) as $fees
| ($fees + [
    {label: "Fee Processing Fee (3% of fees)", amountCents: (([$fees[].amountCents] | add // 0) | pct(3)), note: "Fees don't process themselves."},
    {label: "Loyalty Discount", amountCents: -1, note: "You're welcome."}
  ]) as $charges
| {
    itemCount: ([$c.lines[].qty] | add // 0),
    subtotalCents: $subtotal,
    charges: $charges,
    totalCents: ($subtotal + ([$charges[].amountCents] | add // 0))
  }
