# Collects the attempts made by the payment loop and names the processor that
# finally took the money. If no attempt was approved the house issues its own IOU.
[
  (.loop | if type == "object" then . else {} end)
  | to_entries[]
  | select(.key | test("^[0-9]+$"))
  | {n: (.key | tonumber), a: (.value.attempt_payment.result? // null)}
  | select(.a != null)
]
| sort_by(.n)
| map(.a) as $attempts
| ($attempts | map(select(.approved == true)) | last) as $winner
| {
    attempts: $attempts,
    attemptsNeeded: ($attempts | length),
    settled: true,
    settledBy: ($winner.processor // "House IOU (issued automatically)")
  }
