import { apiUrl } from "./config.js";

async function requestJson(path, options = {}) {
  const res = await fetch(apiUrl(path), {
    ...options,
    headers: {
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.headers || {}),
    },
    body:
      options.body && typeof options.body !== "string"
        ? JSON.stringify(options.body)
        : options.body,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || data.detail || `Request failed (${res.status})`);
  }
  return data;
}

export const api = {
  getHealth: () => requestJson("/api/health"),
  getConfig: () => requestJson("/api/config"),
  getProducts: () => requestJson("/api/products"),
  submitReview: (productId, payload) =>
    requestJson(`/api/products/${encodeURIComponent(productId)}/reviews`, {
      method: "POST",
      body: payload,
    }),
  previewPromo: (promoCode, subtotal) =>
    requestJson("/api/promo/preview", {
      method: "POST",
      body: { promoCode, subtotal },
    }),
  startCheckout: (payload) =>
    requestJson("/api/checkout", {
      method: "POST",
      body: payload,
    }),
  startReturn: (payload) =>
    requestJson("/api/returns", {
      method: "POST",
      body: payload,
    }),
  getWorkflowExecution: (workflowId) =>
    requestJson(`/api/workflows/${encodeURIComponent(workflowId)}`),
  getOrders: () => requestJson("/api/orders"),
  getReturns: () => requestJson("/api/returns"),
  askDisservice: (message) =>
    requestJson("/api/disservice", {
      method: "POST",
      body: { message },
    }),
};
