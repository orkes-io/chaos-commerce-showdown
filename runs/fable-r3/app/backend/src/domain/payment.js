import { labelFor, PAYMENT_METHODS } from "../catalog.js";
import { chance, clampInt, code, money, pick } from "./util.js";

// Tried in order. Each one is less of a payment processor than the last, and
// the final one cannot decline, which is what bounds the workflow's loop.
export const PROCESSORS = [
  {
    name: "Hamster Wheel Pay™",
    prefix: "HWP",
    declinePercent: 75,
    declines: [
      "The hamster is asleep.",
      "The hamster has unionised and is on a tea break.",
      "The wheel squeaked in a way we took as 'no'.",
      "The hamster ran the other direction and refunded a stranger.",
    ],
    approval: "The hamster is exhausted but the wheel went round.",
  },
  {
    name: "Carrier Pigeon ACH",
    prefix: "CPA",
    declinePercent: 60,
    declines: [
      "The pigeon was intercepted by a hawk.",
      "The pigeon delivered your payment to a statue.",
      "The pigeon is 'working from home' today.",
      "Pigeon returned to sender. We are the sender.",
    ],
    approval: "The pigeon arrived, slightly smug.",
  },
  {
    name: "Dave (He's Good For It)",
    prefix: "DAV",
    declinePercent: 40,
    declines: [
      "Dave isn't answering his phone.",
      "Dave says he 'already Venmo'd it'. He did not.",
      "Dave is at his cousin's wedding until Tuesday.",
    ],
    approval: "Dave covered it. You owe Dave.",
  },
  {
    name: "Napkin IOU Ledger",
    prefix: "IOU",
    declinePercent: 0,
    declines: [],
    approval: "We wrote it on a napkin. Legally binding in no jurisdictions.",
  },
];

export const MAX_PAYMENT_ATTEMPTS = PROCESSORS.length;

export function chargePayment({ orderId, attempt, amountCents, paymentMethod } = {}) {
  const attemptNumber = clampInt(attempt, 1, MAX_PAYMENT_ATTEMPTS, MAX_PAYMENT_ATTEMPTS);
  const processor = PROCESSORS[attemptNumber - 1];
  const amount = clampInt(amountCents, 0, Number.MAX_SAFE_INTEGER, 0);
  const method = labelFor(PAYMENT_METHODS, paymentMethod, "Unspecified means");
  const seed = `${orderId}:pay:${attemptNumber}`;
  const declined = chance(seed, processor.declinePercent);

  if (declined) {
    const reason = pick(`${seed}:why`, processor.declines);
    return {
      ok: true,
      approved: false,
      attempt: attemptNumber,
      processor: processor.name,
      message: reason,
      authCode: null,
      headline: `Attempt ${attemptNumber} via ${processor.name}: DECLINED. ${reason}`,
    };
  }

  const message = `${money(amount)} collected via "${method}". ${processor.approval}`;
  return {
    ok: true,
    approved: true,
    attempt: attemptNumber,
    processor: processor.name,
    message,
    authCode: `${processor.prefix}-${code(seed)}`,
    headline: `Attempt ${attemptNumber} via ${processor.name}: APPROVED. ${processor.approval}`,
  };
}
