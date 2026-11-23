# Normalises a return request. Every field has a default so a return started
# with {} still reaches a decision. The two wait durations are clamped here
# because a WAIT task with no duration would wait forever.
def text(d; m): if type == "string" and length > 0 then .[0:m] else d end;
def obj: if type == "object" then . else {} end;
# floor and ceil yield floats here ("30.0"); the modulo turns them back into
# true integers. "30.0s" is not a valid WAIT duration, for one.
def int: floor % 1000000000000000;
def clamp(lo; hi; d): if type == "number" then (if . < lo then lo elif . > hi then hi else int end) else d end;

(.request | obj) as $r
| ($r.checkPauseSeconds | clamp(1; 5; 1)) as $pause
| ($r.oathWindowSeconds | clamp(1; 600; 60)) as $window
| {
    returnId: ($r.returnId | text("RMA-UNKNOWN"; 40)),
    seed: ($r.seed | if type == "number" then (if . < 0 then -. else . end | int) % 1000000 else 0 end),
    filedAt: ($r.filedAt | text("at a time nobody wrote down"; 40)),
    orderId: ($r.orderId | text("an order we cannot find"; 60)),
    orderFound: ($r.orderFound == true),
    customerName: ($r.customerName | text("Valued Customer #7"; 80)),
    item: ($r.item | obj | {
      id: (.id | text("mystery-item"; 60)),
      name: (.name | text("an item we will assume was a toaster"; 120)),
      emoji: (.emoji | text("📦"; 16)),
      priceCents: (.priceCents | if type == "number" and . >= 0 and . <= 99999999999 then int else 0 end)
    }),
    reason: ($r.reason | text("No reason given, which is itself a reason."; 200)),
    affidavit: ($r.affidavit | obj | {
      boxSmell: (.boxSmell | text("not described"; 200)),
      moonPhase: (.moonPhase | text("unknown"; 60)),
      regretSquares: (.regretSquares | clamp(0; 9; 0)),
      keepWillingness: (.keepWillingness | clamp(0; 100; 100))
    }),
    oathText: "I am sorry for what I did to the box.",
    checkPause: "\($pause)s",
    oathWindow: "\($window)s",
    oathWindowSeconds: $window,
    totalChecks: 6
  }
