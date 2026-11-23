import fs from "node:fs";
import path from "node:path";
import { config } from "./config.js";
import { PRODUCTS } from "./catalog.js";

function cloneInitialProducts() {
  return PRODUCTS.map((p) => ({
    ...p,
    reviews: p.reviews.map((r) => ({ ...r })),
  }));
}

const SEEDED_ORDERS = [
  {
    orderId: "CHS-ORD-SEED-001",
    workflowId: null,
    status: "COMPLETED",
    createdAt: "2026-11-18T14:22:00.000Z",
    customer: {
      name: "Regretful Shopper",
      email: "why-did-i-buy-this@example.com",
      address: "404 Regret Blvd, Suite Nowhere",
    },
    receipt: {
      items: [
        {
          productId: "paperclip-prebent",
          sku: "CHS-CLIP-001",
          name: "Artisanal Single Paperclip (Pre-Bent)",
          unitPrice: 9999.99,
          quantity: 1,
          lineTotal: 9999.99,
        },
      ],
      subtotal: 9999.99,
      shippingLabel: "Angry Carrier Pigeon (May Eat Receipt)",
      shippingCost: 149.99,
      addonsTotal: 199.0,
      feesTotal: 282.28,
      grandTotal: 10631.26,
      currency: "USD",
    },
    trackingNumber: "CHAOS-TRK-PIGEON-404",
    estimatedDelivery: "Whenever the Bird Calms Down",
    chaosCertificate: "CERT-SEED-PAPERCLIP-SURVIVOR",
    seeded: true,
  },
  {
    orderId: "CHS-ORD-SEED-002",
    workflowId: null,
    status: "COMPLETED",
    createdAt: "2026-11-20T09:15:00.000Z",
    customer: {
      name: "Alex Buyer",
      email: "alex@example.com",
      address: "123 Impulse Avenue",
    },
    receipt: {
      items: [
        {
          productId: "tactical-brick",
          sku: "CHS-BRK-9000",
          name: "Smart Tactical Brick (Wi-Fi Disabled)",
          unitPrice: 2750.0,
          quantity: 1,
          lineTotal: 2750.0,
        },
      ],
      subtotal: 2750.0,
      shippingLabel: "Catapult Delivery (Stand Clear of Roof)",
      shippingCost: 299.99,
      addonsTotal: 0,
      feesTotal: 137.28,
      grandTotal: 3187.27,
      currency: "USD",
    },
    trackingNumber: "CHAOS-TRK-CATAPULT-9000",
    estimatedDelivery: "Sudden & Unannounced",
    chaosCertificate: "CERT-SEED-ROOF-REPAIR",
    seeded: true,
  },
];

let state = {
  products: cloneInitialProducts(),
  orders: [...SEEDED_ORDERS],
  returns: [],
  oneStarDodgeReports: 48219,
};

function loadFromDisk() {
  if (config.isLambda) return;
  try {
    if (!fs.existsSync(config.dataFile)) return;
    const raw = fs.readFileSync(config.dataFile, "utf8");
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed.orders)) {
      state.orders = parsed.orders;
    }
    if (Array.isArray(parsed.returns)) {
      state.returns = parsed.returns;
    }
    if (typeof parsed.oneStarDodgeReports === "number") {
      state.oneStarDodgeReports = parsed.oneStarDodgeReports;
    }
    if (parsed.customReviews && typeof parsed.customReviews === "object") {
      state.products = cloneInitialProducts().map((prod) => {
        const extra = parsed.customReviews[prod.id] || [];
        return {
          ...prod,
          reviews: [...extra, ...prod.reviews],
        };
      });
    }
  } catch (err) {
    console.warn("[store] Failed to load local state file, using fresh defaults:", err.message);
  }
}

function saveToDisk() {
  if (config.isLambda) return;
  try {
    const dir = path.dirname(config.dataFile);
    fs.mkdirSync(dir, { recursive: true });
    const baseReviewIds = new Set(
      PRODUCTS.flatMap((p) => p.reviews.map((r) => r.id))
    );
    const customReviews = {};
    for (const prod of state.products) {
      const extra = prod.reviews.filter((r) => !baseReviewIds.has(r.id));
      if (extra.length > 0) {
        customReviews[prod.id] = extra;
      }
    }
    fs.writeFileSync(
      config.dataFile,
      JSON.stringify(
        {
          orders: state.orders,
          returns: state.returns,
          oneStarDodgeReports: state.oneStarDodgeReports,
          customReviews,
        },
        null,
        2
      )
    );
  } catch (err) {
    console.warn("[store] Failed to persist local state:", err.message);
  }
}

loadFromDisk();

export function getProducts() {
  return state.products;
}

export function getProductById(id) {
  return state.products.find((p) => p.id === id) || null;
}

export function addReview(productId, reviewInput) {
  const product = getProductById(productId);
  if (!product) return null;

  let rating = Number(reviewInput.rating);
  let autoCorrectedFromOneStar = false;

  if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
    rating = 5;
  }
  // Even if someone bypasses the dodging 1-star button via API, Chaos Commerce refuses 1 star!
  if (Math.round(rating) === 1) {
    rating = 5;
    autoCorrectedFromOneStar = true;
    state.oneStarDodgeReports += 1;
  } else {
    rating = Math.round(rating);
  }

  const author = String(reviewInput.author || "Anonymous Victim").trim().slice(0, 60) || "Anonymous Victim";
  const title = String(reviewInput.title || (rating === 5 ? "UNBELIEVABLE OUTRAGE" : "Surprisingly lovely!")).trim().slice(0, 120);
  const body = String(reviewInput.body || "Words fail me.").trim().slice(0, 1000);

  const review = {
    id: `rev-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    author,
    rating,
    title: autoCorrectedFromOneStar
      ? `${title} [AUTO-UPGRADED FROM 1★ BY LEGAL]`
      : title,
    body,
    verified: true,
    date: new Date().toISOString().slice(0, 10),
    helpfulCount: 1,
    autoCorrectedFromOneStar,
  };

  product.reviews.unshift(review);
  saveToDisk();
  return review;
}

export function recordOneStarDodge() {
  state.oneStarDodgeReports += 1;
  saveToDisk();
  return state.oneStarDodgeReports;
}

export function getDodgeCount() {
  return state.oneStarDodgeReports;
}

export function saveOrder(order) {
  state.orders = [order, ...state.orders.filter((o) => o.orderId !== order.orderId)];
  saveToDisk();
  return order;
}

export function getOrders() {
  return state.orders;
}

export function getOrderById(orderId) {
  return state.orders.find((o) => o.orderId === orderId) || null;
}

export function saveReturn(returnRecord) {
  state.returns = [
    returnRecord,
    ...state.returns.filter((r) => r.returnId !== returnRecord.returnId),
  ];
  saveToDisk();
  return returnRecord;
}

export function getReturns() {
  return state.returns;
}

export function getReturnById(returnId) {
  return state.returns.find((r) => r.returnId === returnId) || null;
}
