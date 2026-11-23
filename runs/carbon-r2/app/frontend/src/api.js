const configuredBase = (import.meta.env.VITE_API_BASE_URL || "")
  .trim()
  .replace(/\/+$/, "");

export function apiUrl(path) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${configuredBase}${normalizedPath}`;
}

async function requestJson(path, options = {}) {
  const resp = await fetch(apiUrl(path), {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    const err = new Error(data.error || `HTTP ${resp.status}`);
    err.status = resp.status;
    err.payload = data;
    throw err;
  }
  return data;
}

export const api = {
  getHealth: () => requestJson("/api/health"),
  getCatalog: () => requestJson("/api/catalog"),
  getOrders: () => requestJson("/api/orders"),
  getReturns: () => requestJson("/api/returns"),
  getRecentWorkflows: () => requestJson("/api/workflows/recent"),
  submitReview: (productId, payload) =>
    requestJson(`/api/products/${encodeURIComponent(productId)}/reviews`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  checkout: (payload) =>
    requestJson("/api/checkout", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  submitReturn: (payload) =>
    requestJson("/api/returns", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  askChad: (message) =>
    requestJson("/api/support-chat", {
      method: "POST",
      body: JSON.stringify({ message }),
    }),
};
