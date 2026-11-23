import { RETURN_REASONS } from "../catalog.js";
import { clampInt, cleanText, code, hash, isPlainObject, money, pick } from "./util.js";

export const CHECKOUT_WORKFLOW = "chaos_checkout";
export const DECISIONS = ["APPROVED", "STORE_CREDIT", "DENIED"];

const ORDER_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function looksLikeOrderId(value) {
  return typeof value === "string" && ORDER_ID_PATTERN.test(value.trim());
}

// ---------------------------------------------------------------------------
// Order lookup. The checkout execution in Conductor is the order record, so
// "find the order" means "fetch that workflow and read its receipt".
// `fetchWorkflow(id)` resolves to the execution or null when it doesn't exist.
// ---------------------------------------------------------------------------
export async function lookupOrder({ orderId, sku } = {}, fetchWorkflow) {
  const wantedSku = cleanText(sku, 40).toUpperCase();
  const shown = cleanText(orderId, 40) || "(blank)";

  if (!looksLikeOrderId(orderId)) {
    return notFound(`Records has never heard of order "${shown}". Records has also never heard of you.`);
  }

  const workflow = await fetchWorkflow(orderId.trim());
  if (!workflow || workflow.workflowName !== CHECKOUT_WORKFLOW) {
    return notFound(`Records searched every filing cabinet (both of them). No order "${shown}".`);
  }

  if (workflow.status !== "COMPLETED") {
    return {
      ok: true,
      found: true,
      complete: false,
      orderStatus: workflow.status,
      line: null,
      headline: "Records found the order, but checkout hasn't finished with it yet.",
    };
  }

  const receipt = isPlainObject(workflow.output?.receipt) ? workflow.output.receipt : {};
  const lines = Array.isArray(receipt.lines) ? receipt.lines.filter(isPlainObject) : [];
  const match = lines.find((line) => String(line.sku).toUpperCase() === wantedSku);
  const line = match
    ? {
        sku: String(match.sku),
        name: cleanText(match.name, 80) || String(match.sku),
        emoji: cleanText(match.emoji, 8),
        qty: clampInt(match.qty, 1, 9999, 1),
        lineTotalCents: clampInt(match.lineTotalCents, 0, Number.MAX_SAFE_INTEGER, 0),
        returnPolicy: cleanText(match.returnPolicy, 20) || "refund",
      }
    : null;

  return {
    ok: true,
    found: true,
    complete: true,
    orderStatus: "CONFIRMED",
    line,
    headline: line
      ? `Records found your order and the ${line.name} on it. They are as surprised as you are.`
      : `Records found your order, but there is no "${wantedSku || "(blank)"}" on it.`,
  };
}

function notFound(headline) {
  return { ok: true, found: false, complete: false, orderStatus: null, line: null, headline };
}

// ---------------------------------------------------------------------------
// Pointless checks. Recorded, displayed, and deliberately never read by the
// decision step.
// ---------------------------------------------------------------------------
const CHECKS = [
  {
    check: "Moon Phase Compatibility",
    department: "Department of Astrology & Logistics",
    verdicts: ["PASSED", "INCONCLUSIVE"],
    notes: ["Waxing gibbous. Favourable for socks, neutral for everything else.", "It was cloudy, so we guessed."],
  },
  {
    check: "Box Feelings Assessment",
    department: "Packaging Wellness",
    verdicts: ["PASSED", "CONCERNING"],
    notes: ["The box reports feeling 'used'. Noted.", "The box declined to comment without a larger box present."],
  },
  {
    check: "Receipt Font Verification",
    department: "Typography Compliance",
    verdicts: ["PASSED", "FAILED UPWARDS"],
    notes: ["Receipt is in Comic Sans, as required by head office.", "Receipt is in Wingdings. Promoted to Senior Receipt."],
  },
  {
    check: "Customer Sincerity Scan",
    department: "The Vibes Desk",
    verdicts: ["43% SINCERE", "71% SINCERE", "UNREADABLE"],
    notes: ["No threshold has ever been defined for this check.", "Scanner was pointed at a houseplant. Result kept anyway."],
  },
  {
    check: "Form 27B/6 Cross-Reference",
    department: "Central Paperwork",
    verdicts: ["NOT FOUND", "FOUND (WRONG FORM)"],
    notes: ["Filed a Form 27B/7 to request a Form 27B/6.", "It was a takeaway menu. Stapled to your file regardless."],
  },
  {
    check: "Have You Tried Wanting It More?",
    department: "Customer Encouragement",
    verdicts: ["ASKED", "ASKED TWICE"],
    notes: ["Customer did not respond, as nobody actually asked them.", "We asked the item instead. It also wants to leave."],
  },
  {
    check: "Verification of the Previous Verification",
    department: "Department of Redundancy Department",
    verdicts: ["VERIFIED", "RE-VERIFIED"],
    notes: ["The previous check definitely happened.", "Verified that this verification will itself need verifying."],
  },
  {
    check: "Stapler Inventory",
    department: "Office Supplies",
    verdicts: ["3 STAPLERS", "2 STAPLERS"],
    notes: ["Unrelated to your return, but good to know.", "One is missing. Kevin is being questioned."],
  },
  {
    check: "Ask Brenda",
    department: "Brenda",
    verdicts: ["BRENDA UNAVAILABLE"],
    notes: ["Brenda is on leave until 2031. Marked as 'Brenda would've been fine with it'."],
  },
  {
    check: "Coin Toss (Best of Zero)",
    department: "Risk & Probability",
    verdicts: ["HEADS", "TAILS", "EDGE"],
    notes: ["The coin has been filed under 'evidence'.", "The coin rolled under the vending machine. Result stands."],
  },
];

export const TOTAL_POINTLESS_CHECKS = 5;

export function pointlessCheck({ returnId, step } = {}) {
  const stepNumber = clampInt(step, 1, 99, 1);
  // Walk the list from a per-return starting point so one return never
  // repeats a check and different returns get different bureaucracy.
  const entry = CHECKS[(hash(`${returnId}:checks`) + stepNumber - 1) % CHECKS.length];
  const seed = `${returnId}:check:${stepNumber}`;
  const verdict = pick(`${seed}:verdict`, entry.verdicts);
  const note = pick(`${seed}:note`, entry.notes);
  return {
    ok: true,
    step: stepNumber,
    check: entry.check,
    department: entry.department,
    verdict,
    note,
    affectsDecision: false,
    headline: `Check ${stepNumber}: ${entry.check} (${entry.department}): ${verdict}. ${note}`,
  };
}

// ---------------------------------------------------------------------------
// The actual returns policy. This is the one part of the returns process that
// is not a joke: same inputs, same decision, and always one of DECISIONS.
// ---------------------------------------------------------------------------
export function decideReturn({ lookup, reason } = {}) {
  const order = isPlainObject(lookup) ? lookup : {};
  const line = isPlainObject(order.line) ? order.line : null;
  const reasonEntry = RETURN_REASONS.find((entry) => entry.id === reason) || RETURN_REASONS.at(-1);

  const decided = (decision, reasonCode, refundCents, explanation) => ({
    ok: true,
    decision,
    reasonCode,
    refundCents,
    explanation,
    decidedBy: "The Returns Desk (sub-basement 4)",
    headline: `Decision: ${decision.replace("_", " ")}. ${explanation}`,
  });

  if (order.found !== true) {
    return decided("DENIED", "NO_SUCH_ORDER", 0, "We can't find that order, so there is nothing to return. If you bought it from a different terrible shop, please bother them.");
  }
  if (order.complete !== true) {
    return decided("DENIED", "ORDER_NOT_FINISHED", 0, "That order is still being checked out. You can't return something we haven't finished selling you.");
  }
  if (!line) {
    return decided("DENIED", "ITEM_NOT_ON_ORDER", 0, "That item isn't on that order. Returning things you didn't buy is our job.");
  }
  if (line.returnPolicy === "final_sale") {
    return decided("DENIED", "FINAL_SALE", 0, `${line.name} is a final-sale item. It said so in the small print, which we print very small.`);
  }

  const amount = clampInt(line.lineTotalCents, 0, Number.MAX_SAFE_INTEGER, 0);
  if (amount <= 0) {
    return decided("DENIED", "NOTHING_TO_REFUND", 0, `${line.name} cost nothing, so there is nothing to give back.`);
  }

  const what = `${line.qty} × ${line.name}`;
  if (line.returnPolicy === "store_credit") {
    return decided("STORE_CREDIT", "CREDIT_ONLY_ITEM", amount, `${what} is a store-credit-only item, so you get ${money(amount)} in store credit. Fees are not refundable, and neither is the fee for refunding them.`);
  }
  if (reasonEntry.fault === "store") {
    return decided("APPROVED", "OUR_FAULT", amount, `"${reasonEntry.label}" counts as our fault under policy section 3 ("oops"). Refunding ${money(amount)} for ${what}. Fees are not refundable, and neither is the fee for refunding them.`);
  }
  return decided("STORE_CREDIT", "CHANGE_OF_HEART", amount, `"${reasonEntry.label}" is a change of heart, not a defect, so ${what} comes back as ${money(amount)} in store credit.`);
}

// ---------------------------------------------------------------------------
// Payout. The reference is derived from the order line, not the return case,
// so two cases opened for the same line can never produce two payouts.
// ---------------------------------------------------------------------------
export function issueRefund({ returnId, payoutKey, kind, amountCents } = {}) {
  const storeCredit = kind === "STORE_CREDIT";
  const amount = clampInt(amountCents, 0, Number.MAX_SAFE_INTEGER, 0);
  const reference = `${storeCredit ? "SC" : "RF"}-${code(`payout:${payoutKey || returnId}`, 10)}`;
  const method = storeCredit
    ? "Store credit, valid in-store only. We do not have a store."
    : "Back to your original payment method within 5-7 business eras.";
  return {
    ok: true,
    kind: storeCredit ? "STORE_CREDIT" : "REFUND",
    reference,
    amountCents: amount,
    method,
    headline: `${storeCredit ? "Store credit" : "Refund"} ${reference} issued for ${money(amount)}. ${method}`,
  };
}
