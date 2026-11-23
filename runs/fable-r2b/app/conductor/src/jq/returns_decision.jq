# Final decision letter. Exactly one of refund / credit / denial is set, by the
# branch that ran. An unrecognised code is treated as store credit so that the
# customer is never left without an answer.
.ret as $r
| .verdict as $v
| (.refund | if type == "object" then . else null end) as $refund
| (.credit | if type == "object" then . else null end) as $credit
| (.denial | if type == "object" then . else null end) as $denial
| (if $v.code == "APPROVED_REFUND" and $refund != null then "APPROVED_REFUND"
   elif $v.code == "DENIED" and $denial != null then "DENIED"
   else "STORE_CREDIT" end) as $code
| {
    status: "DECIDED",
    decidedByDefault: false,
    code: $code,
    returnId: $r.returnId,
    orderId: $r.orderId,
    orderFound: $r.orderFound,
    filedAt: $r.filedAt,
    customerName: $r.customerName,
    item: $r.item,
    reason: $r.reason,
    headline: (if $code == "APPROVED_REFUND" then "Return approved. A refund is, technically, on its way."
               elif $code == "DENIED" then "Return denied."
               else "Return approved for store credit." end),
    explanation: (if $code == "APPROVED_REFUND" then "Against all odds your return was approved. Your refund has been calculated below, fees included."
                  elif $code == "DENIED" then $denial.ground
                  else "We would rather not part with actual money, so please enjoy this store credit instead." end),
    refund: (if $code == "APPROVED_REFUND" then $refund else null end),
    credit: (if $code == "STORE_CREDIT"
      then ($credit // {
        creditCents: $r.item.priceCents,
        creditCode: "SORRY-\($r.seed)",
        terms: "Worth the item price. Valid until we notice."
      })
      else null end),
    denial: (if $code == "DENIED" then $denial else null end),
    oath: $v.oath,
    checks: $v.checks,
    checksRun: $v.checksRun,
    checksPassed: $v.checksPassed,
    checksConsulted: 0,
    footnote: "\($v.checksRun) checks were run. \($v.checksPassed) passed. 0 were consulted in reaching this decision."
  }
