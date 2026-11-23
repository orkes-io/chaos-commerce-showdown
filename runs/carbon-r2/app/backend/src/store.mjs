import fs from "node:fs";
import path from "node:path";
import { getConfig } from "./config.mjs";
import { INITIAL_PRODUCTS, SEEDED_ORDERS } from "./catalog.mjs";

let memoryState = null;

function createDefaultState() {
  return {
    customReviewsByProduct: {},
    orders: [...SEEDED_ORDERS],
    returns: [],
  };
}

function loadState() {
  if (memoryState) return memoryState;
  const { dataFilePath } = getConfig();
  try {
    if (fs.existsSync(dataFilePath)) {
      const parsed = JSON.parse(fs.readFileSync(dataFilePath, "utf8"));
      memoryState = {
        customReviewsByProduct: parsed.customReviewsByProduct || {},
        orders:
          Array.isArray(parsed.orders) && parsed.orders.length
            ? parsed.orders
            : [...SEEDED_ORDERS],
        returns: Array.isArray(parsed.returns) ? parsed.returns : [],
      };
      return memoryState;
    }
  } catch {
    // Fall back to fresh in-memory state
  }
  memoryState = createDefaultState();
  return memoryState;
}

function saveState() {
  if (!memoryState) return;
  const { dataFilePath } = getConfig();
  try {
    fs.mkdirSync(path.dirname(dataFilePath), { recursive: true });
    fs.writeFileSync(dataFilePath, JSON.stringify(memoryState, null, 2), "utf8");
  } catch {
    // Non-fatal in read-only environments; memoryState remains active
  }
}

function enrichProduct(product, customReviews = []) {
  const allReviews = [...customReviews, ...product.reviews];
  const avg =
    allReviews.reduce((acc, r) => acc + Number(r.rating || 0), 0) /
    (allReviews.length || 1);
  return {
    ...product,
    reviews: allReviews,
    reviewCount: allReviews.length,
    averageRating: Math.round(avg * 10) / 10,
  };
}

export function listProducts() {
  const state = loadState();
  return INITIAL_PRODUCTS.map((p) =>
    enrichProduct(p, state.customReviewsByProduct[p.id] || [])
  );
}

export function getProductById(productId) {
  const state = loadState();
  const found = INITIAL_PRODUCTS.find((p) => p.id === productId);
  if (!found) return null;
  return enrichProduct(found, state.customReviewsByProduct[productId] || []);
}

export function addProductReview(productId, review) {
  const state = loadState();
  const found = INITIAL_PRODUCTS.find((p) => p.id === productId);
  if (!found) return null;
  if (!state.customReviewsByProduct[productId]) {
    state.customReviewsByProduct[productId] = [];
  }
  state.customReviewsByProduct[productId].unshift(review);
  saveState();
  return enrichProduct(found, state.customReviewsByProduct[productId]);
}

export function listOrders() {
  const state = loadState();
  return state.orders;
}

export function getOrderById(orderId) {
  const state = loadState();
  return state.orders.find((o) => o.orderId === orderId) || null;
}

export function saveOrder(orderRecord) {
  const state = loadState();
  state.orders.unshift(orderRecord);
  saveState();
  return orderRecord;
}

export function listReturns() {
  const state = loadState();
  return state.returns;
}

export function saveReturn(returnRecord) {
  const state = loadState();
  state.returns.unshift(returnRecord);
  saveState();
  return returnRecord;
}
