# Turns whatever arrived as workflow input into a cart that can always be priced.
# Every field has a default, so a checkout started with {} still completes.
def text(d; m): if type == "string" and length > 0 then .[0:m] else d end;
def obj: if type == "object" then . else {} end;
# floor and ceil yield floats here ("30.0"); the modulo turns them back into
# true integers. "30.0s" is not a valid WAIT duration, for one.
def int: floor % 1000000000000000;
def cents: if type == "number" and . >= 0 and . <= 99999999999 then int else 0 end;
def qty: if type == "number" and . >= 1 then (if . > 99 then 99 else int end) else 1 end;

(.order | obj) as $o
| {
    orderId: ($o.orderId | text("CC-UNKNOWN"; 40)),
    seed: ($o.seed | if type == "number" then (if . < 0 then -. else . end | int) % 1000000 else 0 end),
    placedAt: ($o.placedAt | text("at a time nobody wrote down"; 40)),
    customer: ($o.customer | obj | {
      name: (.name | text("Valued Customer #7"; 80)),
      email: (.email | text(""; 120))
    }),
    lines: [
      ($o.lines | if type == "array" then .[0:50] else [] end)[]
      | select(type == "object")
      | {
          id: (.id | text("mystery-item"; 60)),
          name: (.name | text("Mystery Item"; 120)),
          emoji: (.emoji | text("📦"; 16)),
          qty: (.qty | qty),
          unitPriceCents: (.unitPriceCents | cents)
        }
    ],
    coupon: ($o.coupon | text(""; 40)),
    shipping: ($o.shipping | obj | {
      id: (.id | text("pigeon"; 30)),
      label: (.label | text("Carrier Pigeon"; 80)),
      priceCents: (if (.priceCents | type) == "number" then (.priceCents | cents) else 1200 end),
      eta: (.eta | text("3 to 900 business days"; 160))
    }),
    payment: ($o.payment | obj | {
      id: (.id | text("handshake"; 30)),
      label: (.label | text("A firm handshake"; 80))
    })
  }
