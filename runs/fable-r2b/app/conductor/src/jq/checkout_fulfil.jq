# Decorates each line with a warehouse status. Purely cosmetic: this task is
# optional, and the receipt falls back to the plain lines if it fails.
.cart as $c
| [
    "Allocated. We think.",
    "Allocated to someone else, but we're working on it.",
    "Substituted with a similar item (a brick).",
    "Backordered until morale improves.",
    "In stock, location unknown."
  ] as $notes
| {
    lines: [
      $c.lines | to_entries[]
      | .value + {fulfilment: $notes[($c.seed + .key) % ($notes | length)]}
    ],
    trackingNumber: "TRK-\($c.seed)-LOST",
    carrier: $c.shipping.label,
    eta: $c.shipping.eta
  }
