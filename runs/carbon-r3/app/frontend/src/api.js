const STORAGE_KEY = "chaos_commerce_api_base_url";

export function getApiBaseUrl() {
  if (typeof window !== "undefined") {
    const urlParam = new URLSearchParams(window.location.search).get("apiBase");
    if (urlParam) {
      window.localStorage.setItem(STORAGE_KEY, urlParam.replace(/\/+$/, ""));
      return urlParam.replace(/\/+$/, "");
    }
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return stored.replace(/\/+$/, "");
    }
    if (window.__CHAOS_CONFIG__?.apiBaseUrl) {
      return String(window.__CHAOS_CONFIG__.apiBaseUrl).replace(/\/+$/, "");
    }
  }
  const envUrl = import.meta.env.VITE_API_BASE_URL || "";
  return String(envUrl).replace(/\/+$/, "");
}

export function setApiBaseUrlOverride(newUrl) {
  if (typeof window === "undefined") return;
  const cleaned = String(newUrl || "").trim().replace(/\/+$/, "");
  if (cleaned) {
    window.localStorage.setItem(STORAGE_KEY, cleaned);
  } else {
    window.localStorage.removeItem(STORAGE_KEY);
  }
}

async function apiFetch(path, options = {}) {
  const base = getApiBaseUrl();
  const url = `${base}${path}`;
  const res = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    ...options
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `HTTP ${res.status} from Chaos API`);
  }
  return data;
}

export const api = {
  getHealth: () => apiFetch("/api/health"),
  getCatalog: () => apiFetch("/api/catalog"),
  quoteCart: (payload) =>
    apiFetch("/api/cart/quote", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  submitReview: (productId, payload) =>
    apiFetch(`/api/products/${encodeURIComponent(productId)}/reviews`, {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  recordOneStarDodge: (count = 1) =>
    apiFetch("/api/reviews/one-star-dodge", {
      method: "POST",
      body: JSON.stringify({ count })
    }),
  checkout: (payload) =>
    apiFetch("/api/checkout", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  getOrders: () => apiFetch("/api/orders"),
  submitReturn: (payload) =>
    apiFetch("/api/returns", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  getReturns: () => apiFetch("/api/returns"),
  getWorkflowExecutions: () => apiFetch("/api/workflows/executions"),
  getWorkflowExecutionDetail: (workflowId) =>
    apiFetch(`/api/workflows/executions/${encodeURIComponent(workflowId)}`),
  sendSupportMessage: (message) =>
    apiFetch("/api/support-chat", {
      method: "POST",
      body: JSON.stringify({ message })
    })
};
