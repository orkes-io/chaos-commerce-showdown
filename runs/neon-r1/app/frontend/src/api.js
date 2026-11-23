const STORAGE_KEY = "chaos_commerce_api_base";

export function getApiBaseUrl() {
  const fromQuery = new URLSearchParams(window.location.search).get("api");
  if (fromQuery) {
    const clean = fromQuery.trim().replace(/\/+$/, "");
    localStorage.setItem(STORAGE_KEY, clean);
    return clean;
  }
  const fromStorage = localStorage.getItem(STORAGE_KEY);
  if (fromStorage) return fromStorage.replace(/\/+$/, "");

  const fromGlobal = window.__CHAOS_CONFIG__?.apiBaseUrl;
  if (fromGlobal) return String(fromGlobal).replace(/\/+$/, "");

  const fromEnv = import.meta.env.VITE_API_BASE_URL;
  if (fromEnv) return String(fromEnv).replace(/\/+$/, "");

  // Default: same-origin (used when served locally at http://localhost:3000)
  return "";
}

export function setApiBaseUrl(url) {
  const clean = String(url || "").trim().replace(/\/+$/, "");
  if (!clean) {
    localStorage.removeItem(STORAGE_KEY);
  } else {
    localStorage.setItem(STORAGE_KEY, clean);
  }
}

async function apiFetch(path, options = {}) {
  const base = getApiBaseUrl();
  const url = `${base}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.details || data.error || `Request failed (${res.status})`);
  }
  return data;
}

export const api = {
  health: () => apiFetch("/api/health"),
  catalog: () => apiFetch("/api/catalog"),
  quote: (payload) =>
    apiFetch("/api/quote", { method: "POST", body: JSON.stringify(payload) }),
  addReview: (productId, payload) =>
    apiFetch(`/api/products/${encodeURIComponent(productId)}/reviews`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  recordDodge: () =>
    apiFetch("/api/metrics/one-star-dodge", { method: "POST" }).catch(() => null),
  checkout: (payload) =>
    apiFetch("/api/checkout", { method: "POST", body: JSON.stringify(payload) }),
  getOrders: () => apiFetch("/api/orders"),
  submitReturn: (payload) =>
    apiFetch("/api/returns", { method: "POST", body: JSON.stringify(payload) }),
  getReturns: () => apiFetch("/api/returns"),
  getWorkflow: (workflowId) =>
    apiFetch(`/api/workflows/${encodeURIComponent(workflowId)}`),
};

export function formatUsd(amount) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(amount) || 0);
}
