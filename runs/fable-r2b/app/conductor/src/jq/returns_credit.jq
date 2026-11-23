# Store credit branch: generous on paper.
.ret as $r
| {
    creditCents: (($r.item.priceCents * 110 / 100 | ceil) % 1000000000000000),
    creditCode: "SORRY-\($r.seed)-NOTSORRY",
    terms: "Worth 110% of the item price. Valid only on items we do not sell. Expired yesterday."
  }
