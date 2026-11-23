# Refund branch: the price minus our fees, but never less than one cent.
.ret as $r
| $r.item.priceCents as $price
| [
    {label: "Item price", amountCents: $price},
    {label: "Restocking Fee (15%)", amountCents: (0 - (($price * 15 / 100 | ceil) % 1000000000000000))},
    {label: "Oath Processing Fee", amountCents: -199},
    {label: "Refund Refund Fee", amountCents: -99}
  ] as $lines
| ([$lines[].amountCents] | add) as $net
| (if $net < 1 then 1 else $net end) as $refund
| {
    refundCents: $refund,
    breakdown: (if $net < 1
      then $lines + [{label: "Goodwill Top-Up (refunds may not be negative)", amountCents: ($refund - $net)}]
      else $lines end),
    paidTo: "your original payment method, or the nearest one we can find"
  }
