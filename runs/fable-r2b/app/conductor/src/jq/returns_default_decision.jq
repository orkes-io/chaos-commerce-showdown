# Decision of last resort, issued when the returns workflow failed or timed out.
# The fault was ours, so the customer gets the full price back with no fees.
.ret as $r
| (.failure | if type == "object" then . else {} end) as $x
| {
    status: "DECIDED",
    decidedByDefault: true,
    decidedInsteadOf: {
      workflowId: ($x.workflowId | if type == "string" then . else null end),
      reason: ($x.reason | if type == "string" then .[0:300] else "The returns process stopped before it finished." end)
    },
    code: "APPROVED_BY_DEFAULT",
    returnId: $r.returnId,
    orderId: $r.orderId,
    orderFound: $r.orderFound,
    filedAt: $r.filedAt,
    customerName: $r.customerName,
    item: $r.item,
    reason: $r.reason,
    headline: "Return approved by default.",
    explanation: "Our returns department fell over while handling your return. Under Policy 0 (\"if we break it, you win\") the return is approved in full, with no fees.",
    refund: {
      refundCents: $r.item.priceCents,
      breakdown: [{label: "Item price", amountCents: $r.item.priceCents}],
      paidTo: "your original payment method, or the nearest one we can find"
    },
    credit: null,
    denial: null,
    oath: {received: false, exact: false, text: null},
    checks: [],
    checksRun: 0,
    checksPassed: 0,
    checksConsulted: 0,
    footnote: "0 checks were consulted in reaching this decision, which is the usual number."
  }
