# Reaches the decision. Only two things matter: whether the oath arrived before
# the window closed, and the seed. The check results are counted for the letter
# and otherwise ignored.
def squash: ascii_downcase | gsub("[^a-z]"; "");

. as $in
| $in.ret as $r
| [
    ($in.loop | if type == "object" then . else {} end)
    | to_entries[]
    | select(.key | test("^[0-9]+$"))
    | {n: (.key | tonumber), c: (.value.run_check.result? // null)}
    | select(.c != null)
  ]
| sort_by(.n)
| map(.c) as $checks
| ($in.oath | if type == "object" then .oath else null end
    | if type == "string" and length > 0 then .[0:300] else null end) as $oath
| ($oath != null) as $received
| ($received and (($oath | squash) == ($r.oathText | squash))) as $exact
| ($r.seed % 10) as $roll
| {
    code: (if ($received | not) then "DENIED"
           elif $roll <= 4 then "APPROVED_REFUND"
           elif $roll <= 7 then "STORE_CREDIT"
           else "DENIED" end),
    denialGround: (if ($received | not) then "NO_OATH" else "POLICY" end),
    oath: {received: $received, exact: $exact, text: $oath},
    checks: $checks,
    checksRun: ($checks | length),
    checksPassed: ($checks | map(select(.verdict | startswith("PASS"))) | length),
    checksConsulted: 0
  }
