import { EMPTY_CART_SKU, findProduct } from './catalog.mjs';

export const MAX_QTY = 99;
export const MAX_LINES = 50;

const FLAT_FEES = [
  { code: 'convenience', label: 'Convenience Fee', amountCents: 499 },
  { code: 'inconvenience', label: 'Inconvenience Fee (for balance)', amountCents: 499 },
  { code: 'shipping', label: 'Shipping & Mishandling', amountCents: 1337 },
];
const TAX_BASIS_POINTS = 825;
const FEE_FEE_PERCENT = 10;

function cleanQty(value) {
  const n = Math.floor(Number(value));
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(n, MAX_QTY);
}

// Turns whatever the shopper sent into a priced order. It never throws: unknown items are
// dropped with a note, quantities are clamped to 1..99, duplicate lines are merged and an
// empty cart is sold a Box of Nothing, because checkout always has something to complete.
export function buildQuote(items) {
  const notes = [];
  const merged = new Map();
  const list = Array.isArray(items) ? items.slice(0, 500) : [];
  let dropped = 0;

  for (const item of list) {
    const product = findProduct(item?.sku);
    if (!product) {
      dropped += 1;
      continue;
    }
    const qty = cleanQty(item.qty);
    merged.set(product.sku, Math.min((merged.get(product.sku) ?? 0) + qty, MAX_QTY));
    if (merged.size >= MAX_LINES) break;
  }

  if (dropped > 0) {
    notes.push(`${dropped} item${dropped === 1 ? '' : 's'} could not be found in our catalogue or our warehouse, and ${dropped === 1 ? 'was' : 'were'} left out.`);
  }
  if (merged.size === 0) {
    merged.set(EMPTY_CART_SKU, 1);
    notes.push('Your cart was empty, so we added our most honest product: a Box of Nothing.');
  }

  const lines = [...merged].map(([sku, qty]) => {
    const product = findProduct(sku);
    return {
      sku,
      name: product.name,
      emoji: product.emoji,
      qty,
      unitPriceCents: product.priceCents,
      lineTotalCents: product.priceCents * qty,
      returnable: product.returnable,
    };
  });

  const subtotalCents = lines.reduce((sum, line) => sum + line.lineTotalCents, 0);
  const fees = FLAT_FEES.map((fee) => ({ ...fee }));
  const flatTotal = fees.reduce((sum, fee) => sum + fee.amountCents, 0);
  fees.push({
    code: 'fee-fee',
    label: 'Fee Processing Fee (a fee on the fees)',
    amountCents: Math.round((flatTotal * FEE_FEE_PERCENT) / 100),
  });
  fees.push({
    code: 'tax',
    label: 'Tax (8.25%, we guessed)',
    amountCents: Math.round((subtotalCents * TAX_BASIS_POINTS) / 10000),
  });
  fees.push({ code: 'loyalty', label: 'Loyalty Discount', amountCents: -1 });

  const feesCents = fees.reduce((sum, fee) => sum + fee.amountCents, 0);
  return {
    currency: 'USD',
    lines,
    fees,
    subtotalCents,
    feesCents,
    totalCents: Math.max(subtotalCents + feesCents, 0),
    notes,
  };
}
