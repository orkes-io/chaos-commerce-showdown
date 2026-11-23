import { findProduct, NOTHING, SUBSTITUTE } from "../catalog.js";
import { clampInt, cleanText, hash, isPlainObject, money } from "./util.js";

export const MAX_LINES = 25;
export const MAX_QTY = 99;

// Turns whatever the shopper sent into a clean list of { sku, qty }.
// Never rejects: junk entries are dropped, duplicates merged, quantities
// clamped. Used by the API before starting the workflow and again by the
// pricing worker, so a workflow started by hand with odd input still prices.
export function normalizeItems(items) {
  const merged = new Map();
  for (const entry of Array.isArray(items) ? items : []) {
    if (!isPlainObject(entry)) continue;
    const sku = cleanText(entry.sku, 40).toUpperCase();
    if (!sku) continue;
    const qty = clampInt(entry.qty, 1, MAX_QTY, 1);
    merged.set(sku, Math.min(MAX_QTY, (merged.get(sku) || 0) + qty));
    if (merged.size >= MAX_LINES) break;
  }
  return [...merged].map(([sku, qty]) => ({ sku, qty }));
}

function applyCoupon(coupon, subtotalCents, fees) {
  switch (coupon) {
    case "":
      return null;
    case "SAVE10": {
      const amount = Math.round(subtotalCents * 0.1);
      fees.push({ label: "Coupon SAVE10 (saves us 10%)", amountCents: amount });
      return `SAVE10 applied: you saved us ${money(amount)}. Thank you for your generosity.`;
    }
    case "FREESHIP": {
      const shipping = fees.find((fee) => fee.kind === "shipping");
      const amount = shipping ? shipping.amountCents : 0;
      if (shipping) shipping.amountCents = 0;
      fees.push({ label: "Free Shipping Fee", amountCents: amount });
      return "FREESHIP applied: shipping is now free. A Free Shipping Fee has been added.";
    }
    case "CHAOS": {
      const amount = -Math.round(subtotalCents * 0.15);
      fees.push({ label: "Coupon CHAOS (-15%, we can't turn it off)", amountCents: amount });
      return "CHAOS applied: this one genuinely works and nobody here knows how to disable it.";
    }
    case "PLEASE": {
      const amount = subtotalCents > 0 ? -1 : 0;
      fees.push({ label: "Coupon PLEASE (since you asked nicely)", amountCents: amount });
      return "PLEASE applied: one cent off, for manners.";
    }
    default:
      fees.push({ label: "Coupon Attempt Fee", amountCents: 200 });
      return `Coupon "${coupon}" is not a thing. We charged a Coupon Attempt Fee for trying.`;
  }
}

export function priceCart({ orderId, items, coupon } = {}) {
  const wanted = normalizeItems(items);
  const lines = [];

  for (const { sku, qty } of wanted) {
    const product = findProduct(sku);
    const source = product || SUBSTITUTE;
    lines.push({
      sku: source.sku,
      name: source.name,
      emoji: source.emoji,
      qty,
      unitPriceCents: source.priceCents,
      lineTotalCents: source.priceCents * qty,
      returnPolicy: source.returnPolicy,
      note: product ? null : `We don't sell "${sku}", so we substituted a brick.`,
    });
  }

  const fees = [];
  const emptyCart = lines.length === 0;
  if (emptyCart) {
    lines.push({
      sku: NOTHING.sku,
      name: NOTHING.name,
      emoji: NOTHING.emoji,
      qty: 1,
      unitPriceCents: 0,
      lineTotalCents: 0,
      returnPolicy: NOTHING.returnPolicy,
      note: "Your cart was empty. We processed it anyway.",
    });
    fees.push({ label: "Empty Cart Handling Fee", amountCents: 499 });
  }

  const subtotalCents = lines.reduce((sum, line) => sum + line.lineTotalCents, 0);

  if (!emptyCart) {
    fees.push({ kind: "shipping", label: "Shipping & Mishandling", amountCents: 1234 });
    const surcharge = wanted.reduce((sum, { sku }) => sum + (findProduct(sku)?.shippingSurchargeCents || 0), 0);
    if (surcharge > 0) fees.push({ label: "Oversize Decorative Surcharge", amountCents: surcharge });
    fees.push({ label: "Convenience Fee", amountCents: 499 });
    fees.push({ label: "Inconvenience Fee", amountCents: 501 });
    fees.push({ label: "Fee Processing Fee", amountCents: 150 });
    fees.push({ label: "Fee for Processing the Fee Processing Fee", amountCents: 75 });
    const taxPercent = 3 + (hash(`${orderId}:tax`) % 29);
    fees.push({
      label: `Sales Tax (${taxPercent}%, rate chosen by dartboard)`,
      amountCents: Math.round((subtotalCents * taxPercent) / 100),
    });
  }

  const couponNote = applyCoupon(cleanText(coupon, 24).toUpperCase(), subtotalCents, fees);
  const feeTotal = fees.reduce((sum, fee) => sum + fee.amountCents, 0);
  const totalCents = Math.max(0, subtotalCents + feeTotal);

  return {
    ok: true,
    currency: "USD",
    pricedBy: "The Pricing Department (a man with a dartboard)",
    lines,
    fees: fees.map(({ label, amountCents }) => ({ label, amountCents })),
    subtotalCents,
    totalCents,
    couponNote,
    headline: emptyCart
      ? `Priced an empty cart at ${money(totalCents)}. Nothing is free here, including nothing.`
      : `Priced ${lines.length} line${lines.length === 1 ? "" : "s"} and ${fees.length} fees: ${money(totalCents)}.`,
  };
}
