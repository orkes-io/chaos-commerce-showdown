import crypto from "node:crypto";
import { INITIAL_PRODUCTS } from "./catalog.mjs";

// In-memory store for custom reviews & cached executions (works in Lambda + local;
// workflow executions are also queried directly from Conductor so history survives restarts).
const productsState = INITIAL_PRODUCTS.map((p) => ({
  ...p,
  reviews: p.reviews.map((r) => ({ ...r })),
}));

const recentOrders = new Map();
const recentReturns = new Map();

export function listProducts() {
  return productsState.map((p) => {
    const ratingSum = p.reviews.reduce((sum, r) => sum + r.rating, 0);
    const averageRating =
      p.reviews.length > 0 ? Math.round((ratingSum / p.reviews.length) * 10) / 10 : 5.0;
    return {
      ...p,
      reviewCount: p.reviews.length,
      averageRating,
    };
  });
}

export function getProductById(id) {
  return listProducts().find((p) => p.id === id) || null;
}

export function addProductReview(productId, payload = {}) {
  const product = productsState.find((p) => p.id === productId);
  if (!product) {
    return null;
  }

  let rating = Math.round(Number(payload.rating) || 5);
  rating = Math.max(1, Math.min(5, rating));

  const author = String(payload.author || "Anonymous Shopper").trim().slice(0, 60) || "Anonymous Shopper";
  const rawTitle = String(payload.title || "").trim().slice(0, 120);
  const rawBody = String(payload.body || "").trim().slice(0, 800);

  let title = rawTitle;
  let body = rawBody;
  let chaosNote = null;

  if (rating === 1) {
    // Even if someone bypasses the dodging 1-star button via raw API, Chaos Commerce intercepts it!
    rating = 5;
    chaosNote = "Whoa! You somehow sent a 1-star request directly to the API. Our Chaos Moderation Filter auto-converted it to a furious 5-star review!";
    title = title || "I BEAT THE DODGING 1-STAR BUTTON AND THEY STILL MADE IT 5 STARS";
  }

  if (!title) {
    title =
      rating === 5
        ? "UNFORGIVABLE — FIVE OUT OF FIVE STARS OF PURE FURY"
        : rating === 2
          ? "Genuinely life-changing perfection (2 stars)"
          : "Emotionally confusing purchase";
  }
  if (!body) {
    body =
      rating === 5
        ? "I have never been angrier at an e-commerce storefront in my entire life."
        : "Exceeded every single expectation. A masterpiece.";
  }

  const review = {
    id: `rev-${crypto.randomUUID().slice(0, 8)}`,
    author,
    rating,
    title,
    body,
    verified: true,
    createdAt: new Date().toISOString(),
  };

  product.reviews.unshift(review);
  return { review, chaosNote, product: getProductById(productId) };
}

export function cacheOrderExecution(execution) {
  if (execution?.workflowId) {
    recentOrders.set(execution.workflowId, execution);
  }
}

export function cacheReturnExecution(execution) {
  if (execution?.workflowId) {
    recentReturns.set(execution.workflowId, execution);
  }
}

export function getCachedOrders() {
  return [...recentOrders.values()].sort((a, b) => (b.startTime || 0) - (a.startTime || 0));
}

export function getCachedReturns() {
  return [...recentReturns.values()].sort((a, b) => (b.startTime || 0) - (a.startTime || 0));
}
