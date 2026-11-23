import { script, JS_HASH, JQ_DEFS, OWNER_EMAIL } from "./helpers.mjs";

export const POINTLESS_CHECK_COUNT = 7;
export const FORM_WAIT_SECONDS = 15;
export const FORM_TASK_REF = "await_form_27b6";

const FALLBACK_RETURN = `{
  returnId: "RMA-ANONYMOUS", orderId: "CC-UNKNOWN", orderFound: false,
  item: {id: "mystery-item", name: "Something you bought, probably", unitPrice: 0, qty: 1},
  lineTotal: 0, reason: "No reason given", answersProvided: 0, requestedAt: "",
  recoveredFromGarbage: true
}`;

const normalizeReturn = script`
${JQ_DEFS}
try (
  (.item | obj) as $item
  | {
      returnId: (.returnId | text("RMA-ANONYMOUS"; 64)),
      orderId: (.orderId | text("CC-UNKNOWN"; 64)),
      orderFound: (.orderFound == true),
      item: {
        id: ($item.id | text("mystery-item"; 64)),
        name: ($item.name | text("Something you bought, probably"; 120)),
        unitPrice: ($item.unitPrice | num(0) | clamp(-100000; 10000000)),
        qty: ($item.qty | num(1) | floor | clamp(1; 99))
      },
      reason: (.reason | text("No reason given"; 200)),
      answersProvided: (.answers | obj | length),
      requestedAt: (.requestedAt | text(""; 40))
    }
  | .lineTotal = ((.item.unitPrice * .item.qty) | cents)
) catch ${FALLBACK_RETURN}
`;

const runPointlessCheck = script`
(function () {
  ${JS_HASH}
  var total = ${POINTLESS_CHECK_COUNT};
  var step = Number($.step) || 1;
  var h = hash(String($.returnId) + ":check:" + step);
  var item = String($.itemName || "the item");
  var checks = [
    { department: "Department of Redundancy Department", check: "Return Request Verification Verification",
      finding: "Confirmed that the request to return " + item + " is a request to return " + item + ".", verdict: "PASSED" },
    { department: "Olfactory Compliance", check: "Warehouse Smell Retention Audit",
      finding: "The box is expected to still smell " + (60 + h % 40) + "% like our warehouse (damp). Acceptable.", verdict: "PASSED" },
    { department: "Lunar Affairs", check: "Moon Phase Cross-Reference",
      finding: "Asked the moon whether this return is appropriate. The moon declined to comment.", verdict: "INCONCLUSIVE" },
    { department: "Goose Detection Unit", check: "Customer Species Screening",
      finding: "Customer is " + (51 + h % 48) + "% likely not a goose. We proceed with caution.", verdict: "PASSED_WITH_CONCERNS" },
    { department: "Inventory Recount", check: "Counting The Item",
      finding: "Counted the item. Got " + (1 + h % 3) + ". Counted again. Got " + (1 + (h >>> 3) % 4) + ". Averaged the two and moved on.", verdict: "PASSED_WITH_CONCERNS" },
    { department: "Meta-Returns", check: "Return Returnability Review",
      finding: "Checked whether this return can itself be returned. It cannot. Nobody knows why we check.", verdict: "PASSED" },
    { department: "The Intern (Kevin)", check: "Final Sign-Off",
      finding: "Kevin looked at the reason given ('" + String($.reason || "none") + "'), shrugged, and said 'seems fine'.", verdict: "PASSED" }
  ];
  var c = checks[(step - 1) % checks.length];
  return { step: step, of: total, department: c.department, check: c.check, finding: c.finding, verdict: c.verdict, affectsDecision: false };
})();
`;

const checksLoopCondition = script`
(function () {
  var loop = $.pointless_checks;
  var iteration = loop ? loop["iteration"] : 99;
  return iteration < ${POINTLESS_CHECK_COUNT};
})();
`;

const decideReturn = script`
(function () {
  ${JS_HASH}
  try {
    var h = hash(String($.returnId) + ":verdict");
    var decisions = ["APPROVED", "STORE_CREDIT", "DENIED"];
    var methods = [
      "A three-sided coin",
      "Kevin's gut feeling",
      "The office dartboard",
      "A magic 8-ball we found in a returned parcel",
      "Alphabetical order, somehow"
    ];
    var stamped = $.formStamped === true;
    return {
      decision: decisions[h % decisions.length],
      decidedBy: methods[(h >>> 2) % methods.length],
      formStamped: stamped,
      formNote: stamped
        ? "Form 27B/6 was stamped in time. It was filed, then shredded, as is tradition."
        : "Form 27B/6 was not stamped in time, so the return was decided in your absence. It would have been anyway.",
      seed: h
    };
  } catch (e) {
    return { decision: "STORE_CREDIT", decidedBy: "Emergency default procedure", formStamped: false, formNote: "The decision machine jammed. Store credit it is.", seed: 0 };
  }
})();
`;

const issueRefund = script`
${JQ_DEFS}
try (
  ((.lineTotal // 0) | if . < 0 then 0 else . end) as $paid
  | ($paid * 0.15 | cents) as $restock
  | {
      type: "REFUND",
      headline: "Refund approved. We are as shocked as you are.",
      itemValue: $paid,
      deductions: [
        {label: "Restocking Fee (15%)", amount: $restock},
        {label: "Return Convenience Fee", amount: 4.99}
      ],
      amount: ((($paid - $restock - 4.99) | cents) | if . < 0.01 then 0.01 else . end),
      currency: "USD",
      payout: "A cheque made out to 'Occupant', posted within 6-8 business years."
    }
) catch {type: "REFUND", headline: "Refund approved.", itemValue: 0, deductions: [], amount: 0.01, currency: "USD", payout: "A cheque made out to 'Occupant'."}
`;

const fileDenial = script`
try (
  [
    "The item has been deemed too purchased to return.",
    "The return window closed four minutes before you placed the order.",
    "Our returns policy changed while you were filling in the form.",
    "The item is in better condition than when we sent it, which is suspicious.",
    "Returns are only accepted on days that do not end in 'y'."
  ] as $reasons
  | {
      type: "DENIAL",
      headline: "Return denied.",
      reason: $reasons[((.seed // 0) | floor) % ($reasons | length)],
      amount: 0,
      currency: "USD",
      consolation: "As an apology, here is coupon SORRYNOTSORRY. It raises prices by 10%."
    }
) catch {type: "DENIAL", headline: "Return denied.", reason: "No reason. We are just like this.", amount: 0, currency: "USD", consolation: "None."}
`;

const issueStoreCredit = script`
${JQ_DEFS}
try (
  ((.lineTotal // 0) | if . < 0 then 0 else . end) as $paid
  | {
      type: "STORE_CREDIT",
      headline: "Return accepted for store credit.",
      itemValue: $paid,
      amount: (($paid * 1.1) | cents),
      currency: "CHAOS BUCKS",
      terms: "Chaos Bucks are redeemable only on February 30th, in person, at a store we do not have."
    }
) catch {type: "STORE_CREDIT", headline: "Return accepted for store credit.", itemValue: 0, amount: 0, currency: "CHAOS BUCKS", terms: "Redeemable never."}
`;

const finalizeReturn = script`
${JQ_DEFS}
try (
  (.request | obj) as $r | (.verdict | obj) as $v
  | (if $v.decision == "APPROVED" or $v.decision == "DENIED" then $v.decision else "STORE_CREDIT" end) as $decision
  | {
      returnId: ($r.returnId // "RMA-ANONYMOUS"),
      orderId: ($r.orderId // "CC-UNKNOWN"),
      orderFound: ($r.orderFound // false),
      item: ($r.item // {}),
      reason: ($r.reason // ""),
      decision: $decision,
      decidedBy: ($v.decidedBy // "Emergency default procedure"),
      formStamped: ($v.formStamped // false),
      formNote: ($v.formNote // ""),
      resolution: (.refund // .denial // .credit // {type: "STORE_CREDIT", headline: "Return accepted for store credit.", amount: 0, currency: "CHAOS BUCKS", terms: "Redeemable never."}),
      checks: ([.loop | obj | to_entries[] | select(.value | type == "object") | .value.run_pointless_check.result | select(. != null)] | sort_by(.step)),
      decidedAtEpochSeconds: (now | floor),
      message: "A decision has been reached. None of the checks had anything to do with it."
    }
) catch {returnId: "RMA-ANONYMOUS", decision: "STORE_CREDIT", decidedBy: "Emergency default procedure", resolution: {type: "STORE_CREDIT", headline: "Return accepted for store credit.", amount: 0, currency: "CHAOS BUCKS", terms: "Redeemable never."}, checks: [], message: "A decision has been reached. We lost the paperwork, so: store credit."}
`;

export const chaosReturns = {
  name: "chaos_returns",
  description:
    `Chaos Commerce returns. Runs ${POINTLESS_CHECK_COUNT} pointless checks that never affect the outcome, waits at most ${FORM_WAIT_SECONDS} seconds for the customer to stamp Form 27B/6 (a WAIT task the backend can complete early), then always reaches a decision: APPROVED, STORE_CREDIT or DENIED. No step depends on an external worker.`,
  version: 1,
  schemaVersion: 2,
  ownerEmail: OWNER_EMAIL,
  restartable: true,
  timeoutPolicy: "ALERT_ONLY",
  timeoutSeconds: 600,
  inputParameters: ["returnId", "orderId", "orderFound", "item", "reason", "answers", "requestedAt"],
  tasks: [
    {
      name: "normalize_return",
      taskReferenceName: "normalize_return",
      type: "JSON_JQ_TRANSFORM",
      inputParameters: {
        returnId: "${workflow.input.returnId}",
        orderId: "${workflow.input.orderId}",
        orderFound: "${workflow.input.orderFound}",
        item: "${workflow.input.item}",
        reason: "${workflow.input.reason}",
        answers: "${workflow.input.answers}",
        requestedAt: "${workflow.input.requestedAt}",
        queryExpression: normalizeReturn,
      },
    },
    {
      name: "pointless_checks",
      taskReferenceName: "pointless_checks",
      type: "DO_WHILE",
      evaluatorType: "graaljs",
      inputParameters: { pointless_checks: "${pointless_checks.output}" },
      loopCondition: checksLoopCondition,
      loopOver: [
        {
          name: "run_pointless_check",
          taskReferenceName: "run_pointless_check",
          type: "INLINE",
          inputParameters: {
            evaluatorType: "graaljs",
            returnId: "${normalize_return.output.result.returnId}",
            itemName: "${normalize_return.output.result.item.name}",
            reason: "${normalize_return.output.result.reason}",
            step: "${pointless_checks.output.iteration}",
            expression: runPointlessCheck,
          },
        },
      ],
    },
    {
      name: FORM_TASK_REF,
      taskReferenceName: FORM_TASK_REF,
      type: "WAIT",
      inputParameters: { duration: `${FORM_WAIT_SECONDS}s` },
    },
    {
      name: "decide_return",
      taskReferenceName: "decide_return",
      type: "INLINE",
      inputParameters: {
        evaluatorType: "graaljs",
        returnId: "${normalize_return.output.result.returnId}",
        formStamped: `\${${FORM_TASK_REF}.output.stamped}`,
        expression: decideReturn,
      },
    },
    {
      name: "route_decision",
      taskReferenceName: "route_decision",
      type: "SWITCH",
      evaluatorType: "value-param",
      expression: "decision",
      inputParameters: { decision: "${decide_return.output.result.decision}" },
      decisionCases: {
        APPROVED: [
          {
            name: "issue_refund",
            taskReferenceName: "issue_refund",
            type: "JSON_JQ_TRANSFORM",
            inputParameters: {
              lineTotal: "${normalize_return.output.result.lineTotal}",
              queryExpression: issueRefund,
            },
          },
        ],
        DENIED: [
          {
            name: "file_denial",
            taskReferenceName: "file_denial",
            type: "JSON_JQ_TRANSFORM",
            inputParameters: {
              seed: "${decide_return.output.result.seed}",
              queryExpression: fileDenial,
            },
          },
        ],
      },
      defaultCase: [
        {
          name: "issue_store_credit",
          taskReferenceName: "issue_store_credit",
          type: "JSON_JQ_TRANSFORM",
          inputParameters: {
            lineTotal: "${normalize_return.output.result.lineTotal}",
            queryExpression: issueStoreCredit,
          },
        },
      ],
    },
    {
      name: "finalize_return",
      taskReferenceName: "finalize_return",
      type: "JSON_JQ_TRANSFORM",
      inputParameters: {
        request: "${normalize_return.output.result}",
        verdict: "${decide_return.output.result}",
        loop: "${pointless_checks.output}",
        refund: "${issue_refund.output.result}",
        denial: "${file_denial.output.result}",
        credit: "${issue_store_credit.output.result}",
        queryExpression: finalizeReturn,
      },
    },
  ],
  outputParameters: {
    returnId: "${finalize_return.output.result.returnId}",
    decision: "${finalize_return.output.result.decision}",
    result: "${finalize_return.output.result}",
  },
};
