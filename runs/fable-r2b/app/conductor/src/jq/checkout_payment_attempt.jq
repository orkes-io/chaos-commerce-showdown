# One payment attempt. Processors are tried in order; the fifth and last one
# (the napkin IOU) accepts everything, which is why payment cannot fail.
(.attempt | if type == "number" and . >= 1 then floor else 1 end) as $i
| (.cart.seed // 0) as $seed
| ($seed % 3 + 2) as $acceptAt
| [
    (.cart.payment.label // "A firm handshake"),
    "Fax-Based Payment Gateway",
    "A Guy Named Dale",
    "Carrier-Pigeon Wire Transfer",
    "IOU Written on a Napkin"
  ] as $processors
| [
    "Declined: the card felt nervous.",
    "Declined: insufficient vibes.",
    "Timed out while the gateway finished its sandwich.",
    "Declined: the processor is on hold with itself.",
    "Declined: Mercury is in retrograde.",
    "Declined: we forgot what we were doing.",
    "Declined: the fax machine is out of toner again."
  ] as $declines
| ($i >= $acceptAt or $i >= 5) as $approved
| {
    attempt: $i,
    processor: ($processors[(if $i > 5 then 5 else $i end) - 1]),
    approved: $approved,
    message: (if $approved
      then "Approved. Nobody is more surprised than we are."
      else $declines[($seed + $i) % ($declines | length)] end)
  }
