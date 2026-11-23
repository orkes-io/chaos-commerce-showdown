import fs from "node:fs";
import path from "node:path";
import { getConfig } from "./config.js";
import { PRODUCTS } from "./catalog.js";

let memoryState = null;

function buildInitialState() {
  const customReviewsByProduct = {};
  for (const p of PRODUCTS) {
    customReviewsByProduct[p.id] = [];
  }

  return {
    oneStarDodges: 1482,
    customReviewsByProduct,
    orders: [
      {
        orderId: "ORD-CHAOS-0001",
        workflowId: "seed-demo-order-0001",
        createdAt: "2026-11-22T14:22:00.000Z",
        customerName: "Regretful Early Adopter",
        customerEmail: "why-did-i-click-buy@example.com",
        items: [
          {
            id: "chewed-paperclip-2019",
            name: "Artisanal Pre-Chewed Paperclip (Vintage Q3 2019)",
            price: 49999.99,
            quantity: 1
          }
        ],
        grandTotal: 52649.41,
        trackingNumber: "CHAOS-PIGEON-0001",
        chaosTier: "MILDLY_UNHINGED",
        status: "COMPLETED",
        isSeedOrder: true
      }
    ],
    returns: []
  };
}

function getStateFilePath() {
  const { dataDir } = getConfig();
  return path.join(dataDir, "store-state.json");
}

export function loadState() {
  if (memoryState) {
    return memoryState;
  }
  const statePath = getStateFilePath();
  try {
    if (fs.existsSync(statePath)) {
      const raw = fs.readFileSync(statePath, "utf8");
      const parsed = JSON.parse(raw);
      memoryState = {
        ...buildInitialState(),
        ...parsed,
        customReviewsByProduct: {
          ...buildInitialState().customReviewsByProduct,
          ...(parsed.customReviewsByProduct || {})
        }
      };
      return memoryState;
    }
  } catch {
    // Fall back cleanly to fresh memory state
  }
  memoryState = buildInitialState();
  saveState();
  return memoryState;
}

export function saveState() {
  if (!memoryState) return;
  try {
    const statePath = getStateFilePath();
    fs.mkdirSync(path.dirname(statePath), { recursive: true });
    fs.writeFileSync(statePath, JSON.stringify(memoryState, null, 2), "utf8");
  } catch {
    // Non-fatal in read-only environments; memoryState persists in process
  }
}

export function getProductsWithReviews() {
  const state = loadState();
  return PRODUCTS.map((product) => {
    const extra = state.customReviewsByProduct[product.id] || [];
    const reviews = [...extra, ...product.seedReviews];
    const avgRating =
      reviews.reduce((sum, r) => sum + Number(r.rating || 5), 0) /
      Math.max(1, reviews.length);
    return {
      ...product,
      reviews,
      reviewCount: reviews.length,
      averageRating: Number(avgRating.toFixed(1))
    };
  });
}

export function addProductReview(productId, reviewInput) {
  const state = loadState();
  const product = PRODUCTS.find((p) => p.id === productId);
  if (!product) {
    return null;
  }

  let requestedRating = Number(reviewInput.rating || 5);
  let autoUpgradedFromOneStar = false;
  if (requestedRating <= 1) {
    requestedRating = 5;
    autoUpgradedFromOneStar = true;
    state.oneStarDodges += 1;
  }
  requestedRating = Math.min(5, Math.max(2, Math.round(requestedRating)));

  const sentimentByRating = {
    5: "PURE UNFILTERED FURY",
    4: "SIMMERING REGRET",
    3: "BEWILDERED CONFUSION",
    2: "TRANSCENDENT PRAISE"
  };

  const starsVisual =
    "★".repeat(requestedRating) + "☆".repeat(5 - requestedRating);
  const rawBody = String(reviewInput.body || "").trim() ||
    (requestedRating === 5
      ? "I CANNOT BELIEVE THIS STORE IS LEGAL!!"
      : "Unironically changed my entire existence for the better!");

  const review = {
    id: `rev-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    author: String(reviewInput.author || "bewildered_shopper").trim().slice(0, 40) || "bewildered_shopper",
    rating: requestedRating,
    sentimentTag: autoUpgradedFromOneStar
      ? "1★ BLOCKED → AUTO-UPGRADED TO 5★ RAGE"
      : sentimentByRating[requestedRating] || "CHAOTIC FEEDBACK",
    date: "Just now",
    verified: true,
    autoUpgradedFromOneStar,
    title:
      String(reviewInput.title || "").trim().slice(0, 100) ||
      (requestedRating === 5
        ? "WHY DID I GIVE THEM MY MONEY?!"
        : "Breathtaking triumph of modern retail!"),
    body: rawBody.startsWith("★") ? rawBody : `${starsVisual} — ${rawBody}`
  };

  if (!state.customReviewsByProduct[productId]) {
    state.customReviewsByProduct[productId] = [];
  }
  state.customReviewsByProduct[productId].unshift(review);
  saveState();
  return review;
}

export function recordOneStarDodge(count = 1) {
  const state = loadState();
  state.oneStarDodges += Math.max(1, Math.min(25, Number(count) || 1));
  saveState();
  return state.oneStarDodges;
}

export function recordCompletedOrder(orderRecord) {
  const state = loadState();
  state.orders.unshift(orderRecord);
  state.orders = state.orders.slice(0, 100);
  saveState();
  return orderRecord;
}

export function recordCompletedReturn(returnRecord) {
  const state = loadState();
  state.returns.unshift(returnRecord);
  state.returns = state.returns.slice(0, 100);
  saveState();
  return returnRecord;
}
