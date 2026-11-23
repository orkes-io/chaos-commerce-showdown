import { OWNER_EMAIL, jq, inline, wait, drillGate } from "./helpers.js";

export const CUSTOMER_STEPS = 4;

const openCase = jq(
  "open_case",
  {
    workflowId: "${workflow.workflowId}",
    order: "${workflow.input.order}",
    orderId: "${workflow.input.orderId}",
    itemName: "${workflow.input.itemName}",
    statedReason: "${workflow.input.statedReason}",
    stepTimeoutSeconds: "${workflow.input.stepTimeoutSeconds}",
  },
  String.raw`
  (.order | if type == "object" then . else null end) as $order
  | ((.stepTimeoutSeconds // 45) | if type == "number" then (if . < 5 then 5 elif . > 300 then 300 else floor end) else 45 end) as $timeout
  | {caseNumber: ("RMA-" + (.workflowId[0:6] | ascii_upcase)),
     orderFound: ($order != null),
     orderId: (.orderId // ""),
     orderNumber: ($order.orderNumber // "UNKNOWN"),
     customerName: (($order.customerName // "") | if . == "" then "Valued Customer" else . end),
     itemName: ((.itemName // "") | if . == "" then "the whole regrettable order" else . end),
     statedReason: (.statedReason // ""),
     basisCents: (($order.totalCents // 0) | if type == "number" then . else 0 end),
     stepTimeoutSeconds: $timeout,
     stepTimeout: (($timeout | tostring) + "s")}`,
);

const checkMoonPhase = inline(
  "check_moon_phase",
  { epochMs: "${workflow.input.requestedAtEpochMs}" },
  `(function () {
    var synodic = 29.530588853;
    var days = (Number($.epochMs) || 0) / 86400000 - 10962.76;
    var age = ((days % synodic) + synodic) % synodic;
    var phases = ['New Moon', 'Waxing Crescent', 'First Quarter', 'Waxing Gibbous', 'Full Moon', 'Waning Gibbous', 'Last Quarter', 'Waning Crescent'];
    var index = Math.floor((age / synodic) * 8 + 0.5) % 8;
    var passed = index % 2 === 0;
    return {
      id: 'moon',
      label: 'Lunar Phase Compatibility',
      passed: passed,
      remark: 'The moon is a ' + phases[index] + '. ' + (passed ? 'Returns are cosmically permitted.' : 'The moon disapproves of this return. Noted, then ignored.')
    };
  })();`,
);

const checkItemFeelings = jq(
  "check_item_feelings",
  { seed: "${workflow.input.seed}", itemName: "${open_case.output.result.itemName}" },
  String.raw`
  ((.seed // 0) % 4) as $mood
  | ["I never liked them anyway.", "Please do not send me back. The warehouse is dark.", "Who is this?",
     "I have already been sold to someone else."][$mood] as $quote
  | {id: "feelings", label: "Item Feelings Interview", passed: ($mood % 2 == 0),
     remark: "We asked \(.itemName) how it feels about coming back. It said: \"\($quote)\""}`,
);

const checkBlameLedger = jq(
  "check_blame_ledger",
  { customerName: "${open_case.output.result.customerName}" },
  String.raw`
  (.customerName | length) as $n
  | {id: "blame", label: "Blame Ledger Cross-Reference", passed: ($n % 2 == 1),
     remark: "Searched the List of People We Blame for \"\(.customerName)\": \($n) match(es). All of them were us."}`,
);

const marinatePaperwork = wait("marinate_paperwork", { duration: "3s" });

const checkFax = jq(
  "check_fax_from_1997",
  { orderFound: "${open_case.output.result.orderFound}" },
  String.raw`{id: "fax", label: "Fax Confirmation From 1997", passed: true,
    remark: "We waited 3 seconds for a fax from 1997. It did not arrive. Policy counts this as a pass."}`,
);

const pickQuestion = jq(
  "pick_question",
  {
    step: "${paperwork_gauntlet.output.iteration}",
    customerName: "${open_case.output.result.customerName}",
    timeoutSeconds: "${open_case.output.result.stepTimeoutSeconds}",
  },
  String.raw`
  ((.step // 1) | if . < 1 then 1 elif . > 4 then 4 else . end) as $step
  | [{kind: "essay", title: "Statement of Disappointment",
      prompt: "In your own words, explain why you are disappointing us. Minimum three words. Maximum also three words.",
      inputType: "text", options: [], placeholder: "three words exactly"},
     {kind: "captcha", title: "Prove You Are Not a Satisfied Customer",
      prompt: "Which of these is a traffic light?",
      inputType: "choice", options: ["A feeling", "Tuesday", "The concept of debt", "A traffic light"], placeholder: ""},
     {kind: "signature", title: "Form 27B/6: Signature",
      prompt: "Sign the form by typing the name \"\(.customerName)\" backwards. Letter by letter. We check.",
      inputType: "text", options: [], placeholder: "your name, backwards"},
     {kind: "oath", title: "The Oath",
      prompt: "Type: I PROMISE I TRIED TURNING IT OFF AND ON AGAIN. All caps. We are hard of hearing.",
      inputType: "text", options: [], placeholder: "SHOUT IT"}][$step - 1]
  + {step: $step, of: 4, timeoutSeconds: .timeoutSeconds}`,
);

const askCustomer = wait("ask_customer", {
  duration: "${open_case.output.result.stepTimeout}",
  question: "${pick_question.output.result}",
});

const gradeAnswer = inline(
  "grade_answer",
  {
    answer: "${ask_customer.output.answer}",
    kind: "${pick_question.output.result.kind}",
    title: "${pick_question.output.result.title}",
    step: "${pick_question.output.result.step}",
    customerName: "${open_case.output.result.customerName}",
  },
  `(function () {
    var answered = $.answer !== null && $.answer !== undefined;
    var a = answered ? String($.answer).trim() : '';
    var words = a.length ? a.split(/\\s+/).length : 0;
    var name = String($.customerName);
    var passed = false;
    var remark = 'No answer before the deadline. The Returns Oracle answered on your behalf: "no comment".';
    if (answered && $.kind === 'essay') {
      passed = words === 3;
      remark = passed ? 'Exactly three words. Concise. Suspicious.' : 'You wrote ' + words + ' word(s). The minimum was three. The maximum was also three.';
    } else if (answered && $.kind === 'captcha') {
      passed = a === 'Tuesday';
      remark = passed ? 'Correct. Tuesday is, legally, a traffic light.' : (a === 'A traffic light' ? 'Incorrect. That was too obvious, so it was wrong.' : 'Incorrect. The correct answer was "Tuesday".');
    } else if (answered && $.kind === 'signature') {
      passed = a.toLowerCase() === Array.from(name).reverse().join('').toLowerCase();
      remark = passed ? 'Signature accepted. It is also now legally your name.' : 'That is not "' + name + '" backwards. Form 27B/6 has been filed under "Nice Try".';
    } else if (answered) {
      passed = a.length > 0 && a === a.toUpperCase() && a.indexOf('PROMISE') >= 0;
      remark = passed ? 'Oath received. Loudly.' : 'We could not hear you. The oath must be shouted and must contain a PROMISE.';
    }
    return { step: $.step, kind: $.kind, title: $.title, answered: answered, answer: a.substring(0, 200), passed: passed, remark: remark };
  })();`,
);

const paperworkGauntlet = {
  name: "paperwork_gauntlet",
  taskReferenceName: "paperwork_gauntlet",
  type: "DO_WHILE",
  evaluatorType: "graaljs",
  inputParameters: { paperwork_gauntlet: "${paperwork_gauntlet.output}" },
  loopCondition: `(function () { var last = $.grade_answer ? $.grade_answer.result : null; var answered = last ? last.answered === true : false; return answered && $.paperwork_gauntlet['iteration'] < ${CUSTOMER_STEPS}; })();`,
  loopOver: [pickQuestion, askCustomer, gradeAnswer],
};

const tallyChecks = jq(
  "tally_checks",
  {
    moon: "${check_moon_phase.output.result}",
    feelings: "${check_item_feelings.output.result}",
    blame: "${check_blame_ledger.output.result}",
    fax: "${check_fax_from_1997.output.result}",
    gauntlet: "${paperwork_gauntlet.output}",
  },
  String.raw`
  ([.moon, .feelings, .blame, .fax] | map(select(type == "object"))) as $auto
  | ([.gauntlet | to_entries[] | select(.key | test("^[0-9]+$"))
      | {n: (.key | tonumber), result: .value.grade_answer.result}]
     | sort_by(.n) | map(.result) | map(select(type == "object"))) as $customer
  | {automatedChecks: $auto,
     customerChecks: $customer,
     automatedPassed: ($auto | map(select(.passed == true)) | length),
     automatedTotal: ($auto | length),
     customerPassed: ($customer | map(select(.passed == true)) | length),
     customerAnswered: ($customer | map(select(.answered == true)) | length),
     customerTotal: 4,
     abandoned: (($customer | map(select(.answered == true)) | length) < 4)}`,
);

const consultOracle = inline(
  "consult_oracle",
  {
    orderFound: "${open_case.output.result.orderFound}",
    abandoned: "${tally_checks.output.result.abandoned}",
    customerPassed: "${tally_checks.output.result.customerPassed}",
    customerAnswered: "${tally_checks.output.result.customerAnswered}",
    customerTotal: "${tally_checks.output.result.customerTotal}",
    automatedPassed: "${tally_checks.output.result.automatedPassed}",
    automatedTotal: "${tally_checks.output.result.automatedTotal}",
  },
  `(function () {
    var passed = Number($.customerPassed) || 0;
    var total = Number($.customerTotal) || 4;
    var auto = Number($.automatedPassed) || 0;
    var sum = passed + auto;
    var decision;
    var reason;
    if ($.orderFound !== true) {
      decision = 'DENIED';
      reason = 'We have no record of that order, which is extremely plausible. Now that the paperwork is complete, we regret to inform you there is nothing to return.';
    } else if ($.abandoned === true) {
      decision = 'APPROVED';
      reason = 'You stopped answering after ' + (Number($.customerAnswered) || 0) + ' of ' + total + ' forms. Our system interprets silence as a lawyer. Refund approved out of fear.';
    } else if (passed >= total) {
      decision = 'DENIED';
      reason = 'Your paperwork was flawless. Nobody is that organised. Denied on suspicion of competence.';
    } else if (passed === 0) {
      decision = 'STORE_CREDIT';
      reason = 'You failed every single check, which is the most honest thing we have seen all week. Have some store credit.';
    } else if (sum % 2 === 0) {
      decision = 'APPROVED';
      reason = 'You passed ' + passed + ' of ' + total + ' forms and the universe passed ' + auto + ' of ' + (Number($.automatedTotal) || 0) + ' checks. ' + sum + ' is even, so refund approved.';
    } else {
      decision = 'STORE_CREDIT';
      reason = 'You passed ' + passed + ' of ' + total + ' forms and the universe passed ' + auto + ' of ' + (Number($.automatedTotal) || 0) + ' checks. ' + sum + ' is odd, and so are we: store credit.';
    }
    return { decision: decision, reason: reason, decidedBy: 'The Returns Oracle (a Magic 8-Ball we keep in a drawer)' };
  })();`,
);

const basis = { basisCents: "${open_case.output.result.basisCents}" };

// APPROVED and STORE_CREDIT are explicit. Anything else, including a value we did not
// anticipate, is filed as a denial, so every return leaves this switch with a resolution.
const applyDecision = {
  name: "apply_decision",
  taskReferenceName: "apply_decision",
  type: "SWITCH",
  evaluatorType: "value-param",
  expression: "decision",
  inputParameters: { decision: "${consult_oracle.output.result.decision}" },
  decisionCases: {
    APPROVED: [
      jq(
        "issue_refund",
        basis,
        String.raw`
        (.basisCents // 0) as $basis
        | (($basis * 15 / 100) | floor) as $restock
        | ([$basis - $restock - 499, 0] | max) as $refund
        | {type: "REFUND", amountCents: $refund,
           deductions: [{label: "Restocking Fee (the shelf had gotten used to being empty)", amountCents: $restock},
                        {label: "Refund Processing Fee", amountCents: 499}],
           method: "A cheque, written in pencil",
           eta: "3 to 900 business days",
           note: "You may keep the item. We do not want it back either."}`,
      ),
    ],
    STORE_CREDIT: [
      jq(
        "mint_store_credit",
        basis,
        String.raw`
        {type: "STORE_CREDIT", amountCents: (((.basisCents // 0) * 110 / 100) | floor),
         deductions: [],
         method: "ChaosCoins™",
         eta: "immediately",
         note: "Your ChaosCoins expired yesterday. They are non-transferable, non-redeemable and, technically, non-existent."}`,
      ),
    ],
  },
  defaultCase: [
    jq(
      "file_denial",
      basis,
      String.raw`
      {type: "NOTHING", amountCents: 0,
       deductions: [],
       method: "Coupon code SORRYNOTSORRY",
       eta: "never",
       note: "As a consolation, use coupon SORRYNOTSORRY on your next order. Like all our coupons, it adds 15%."}`,
    ),
  ],
};

const closeCase = jq(
  "close_case",
  {
    caseFile: "${open_case.output.result}",
    tally: "${tally_checks.output.result}",
    oracle: "${consult_oracle.output.result}",
    refund: "${issue_refund.output.result}",
    credit: "${mint_store_credit.output.result}",
    denial: "${file_denial.output.result}",
  },
  String.raw`
  (.refund // .credit // .denial) as $resolution
  | {caseNumber: .caseFile.caseNumber,
     status: "DECIDED",
     rescued: false,
     decision: (if $resolution.type == "REFUND" then "APPROVED" elif $resolution.type == "STORE_CREDIT" then "STORE_CREDIT" else "DENIED" end),
     reason: .oracle.reason,
     decidedBy: .oracle.decidedBy,
     resolution: $resolution,
     orderId: .caseFile.orderId,
     orderNumber: .caseFile.orderNumber,
     orderFound: .caseFile.orderFound,
     itemName: .caseFile.itemName,
     statedReason: .caseFile.statedReason,
     automatedChecks: .tally.automatedChecks,
     customerChecks: .tally.customerChecks,
     tally: {automatedPassed: .tally.automatedPassed, automatedTotal: .tally.automatedTotal,
             customerPassed: .tally.customerPassed, customerAnswered: .tally.customerAnswered,
             customerTotal: .tally.customerTotal, abandoned: .tally.abandoned}}`,
);

export const returns = {
  name: "chaos_returns",
  description:
    "Chaos Commerce returns. Opens a case, runs four pointless automated checks in parallel, walks the customer through up to four pointless forms (each a WAIT with a deadline, so an absent customer cannot stall it), then the Returns Oracle decides APPROVED, STORE_CREDIT or DENIED. chaos_returns_rescue decides if this workflow fails or times out.",
  version: 1,
  schemaVersion: 2,
  ownerEmail: OWNER_EMAIL,
  restartable: true,
  timeoutPolicy: "TIME_OUT_WF",
  timeoutSeconds: 1800,
  failureWorkflow: "chaos_returns_rescue",
  inputParameters: [
    "returnId",
    "seed",
    "requestedAt",
    "requestedAtEpochMs",
    "orderId",
    "order",
    "itemName",
    "statedReason",
    "stepTimeoutSeconds",
    "disasterDrill",
  ],
  tasks: [
    drillGate("Disaster drill: the returns department was collapsed on purpose."),
    openCase,
    {
      name: "automated_checks",
      taskReferenceName: "automated_checks",
      type: "FORK_JOIN",
      forkTasks: [[checkMoonPhase], [checkItemFeelings], [checkBlameLedger], [marinatePaperwork, checkFax]],
    },
    {
      name: "join_automated_checks",
      taskReferenceName: "join_automated_checks",
      type: "JOIN",
      joinOn: ["check_moon_phase", "check_item_feelings", "check_blame_ledger", "check_fax_from_1997"],
    },
    paperworkGauntlet,
    tallyChecks,
    consultOracle,
    applyDecision,
    closeCase,
  ],
  outputParameters: { returnCase: "${close_case.output.result}" },
};

// Runs as the failureWorkflow of chaos_returns (and is started directly by the backend for
// a return an operator terminated). When the paperwork machine breaks, the customer wins.
export const returnsRescue = {
  name: "chaos_returns_rescue",
  description:
    "Decides a return whose chaos_returns execution failed, timed out or was terminated: approved by default, using only the original return input. This is what makes every return reach a decision.",
  version: 1,
  schemaVersion: 2,
  ownerEmail: OWNER_EMAIL,
  restartable: true,
  timeoutPolicy: "ALERT_ONLY",
  timeoutSeconds: 60,
  inputParameters: ["workflowId", "reason", "failureStatus", "orderId", "order", "itemName"],
  tasks: [
    jq(
      "approve_by_default",
      {
        failedWorkflowId: "${workflow.input.workflowId}",
        failureStatus: "${workflow.input.failureStatus}",
        orderId: "${workflow.input.orderId}",
        order: "${workflow.input.order}",
        itemName: "${workflow.input.itemName}",
      },
      String.raw`
      (.order | if type == "object" then . else null end) as $order
      | (($order.totalCents // 0) | if type == "number" then . else 0 end) as $basis
      | ((.failedWorkflowId // "napkin") | tostring) as $id
      | ((.failureStatus // "UNKNOWN") | tostring) as $status
      | {caseNumber: ("RMA-" + ($id[0:6] | ascii_upcase)),
         status: "DECIDED",
         rescued: true,
         rescuedFrom: {workflowId: .failedWorkflowId, status: $status},
         decision: "APPROVED",
         reason: "Our returns department collapsed under its own paperwork (status: \($status)). Company policy 404 applies: when the machine breaks, the customer wins. Full refund approved by default.",
         decidedBy: "Company Policy 404 (nobody could find the Oracle)",
         resolution: {type: "REFUND", amountCents: $basis, deductions: [],
                      method: "A cheque, written in pencil", eta: "3 to 900 business days",
                      note: "No fees were deducted, because the fee calculator is also broken."},
         orderId: ((.orderId // "") | tostring),
         orderNumber: (($order.orderNumber // "UNKNOWN") | tostring),
         orderFound: ($order != null),
         itemName: ((.itemName // "") | tostring | if . == "" then "the whole regrettable order" else . end),
         statedReason: "",
         automatedChecks: [],
         customerChecks: [],
         tally: {automatedPassed: 0, automatedTotal: 0, customerPassed: 0, customerAnswered: 0, customerTotal: 4, abandoned: false}}`,
    ),
  ],
  outputParameters: { returnCase: "${approve_by_default.output.result}" },
};
