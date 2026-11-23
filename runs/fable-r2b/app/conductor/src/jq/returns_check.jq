# One pointless check. Verdicts are recorded faithfully and then ignored:
# returns_decide.jq never reads them.
(.n | if type == "number" and . >= 1 then floor else 1 end) as $n
| .ret as $r
| [
    {
      department: "Bureau of Box Sniffing",
      name: "Olfactory audit of the cardboard",
      note: "Customer reports the box smelled \"\($r.affidavit.boxSmell)\". Our nose disagrees on principle."
    },
    {
      department: "Department of Lunar Compliance",
      name: "Moon phase cross-check",
      note: "Declared moon phase: \($r.affidavit.moonPhase). The moon declined to comment."
    },
    {
      department: "Office of Receipt Origami",
      name: "Verifying the receipt was folded correctly",
      note: "Receipt for \($r.orderId) was folded into a swan. Policy requires a crane."
    },
    {
      department: "Regret Authenticity Unit",
      name: "Measuring sincerity of regret",
      note: "Measured \($r.seed % 900 + 100) milliregrets across \($r.affidavit.regretSquares) declared squares of regret."
    },
    {
      department: "Committee for Asking a Guy Named Dale",
      name: "Dale is thinking about it",
      note: "Dale says he remembers \($r.item.name). Dale is thinking of a different item."
    },
    {
      department: "Division of Redundant Divisions Division",
      name: "Re-running check 1 to be sure",
      note: "Check 1 was re-run. The result was different. Both results stand."
    }
  ] as $checks
| ["PASS", "FAIL", "INCONCLUSIVE", "PASS (regrettably)", "FAIL (with distinction)"] as $verdicts
| $checks[(if $n > ($checks | length) then ($checks | length) else $n end) - 1]
  + {
      n: $n,
      total: ($checks | length),
      verdict: $verdicts[($r.seed + $n * 7) % ($verdicts | length)],
      consulted: false
    }
