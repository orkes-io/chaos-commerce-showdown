# Denial branch: picks the ground for refusing.
.ret as $r
| [
    "The item was returned in a condition best described as \"returned\".",
    "Our records show you enjoyed the item for at least four seconds.",
    "The return window closed before the item was manufactured.",
    "Returns are only accepted on days that do not end in \"y\".",
    "The box was happier with you."
  ] as $grounds
| {
    ground: (if .verdict.denialGround == "NO_OATH"
      then "No Returns Oath was on file when the \($r.oathWindowSeconds)-second oath window closed, so the return was decided without you."
      else $grounds[$r.seed % ($grounds | length)] end),
    appeal: "You may appeal in writing. Appeals are filed under \"Returns\"."
  }
