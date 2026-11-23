function resolveApiBase() {
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    const queryOverride = params.get('api');
    if (queryOverride) {
      return queryOverride.replace(/\/+$/, '');
    }
    const runtimeOverride = window.__CHAOS_CONFIG__?.apiBaseUrl;
    if (runtimeOverride && String(runtimeOverride).trim()) {
      return String(runtimeOverride).trim().replace(/\/+$/, '');
    }
  }
  const buildTime = import.meta.env.VITE_API_BASE_URL;
  if (buildTime && String(buildTime).trim()) {
    return String(buildTime).trim().replace(/\/+$/, '');
  }
  return '';
}

export const API_BASE = resolveApiBase();

async function request(path, options = {}) {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });

  const text = await res.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }

  if (!res.ok) {
    throw new Error(data.error || data.detail || `Request failed (${res.status})`);
  }
  return data;
}

export function fetchHealth() {
  return request('/api/health');
}

export function fetchProducts() {
  return request('/api/products');
}

export function submitReview(productId, payload) {
  return request(`/api/products/${encodeURIComponent(productId)}/reviews`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function submitCheckout(payload) {
  return request('/api/checkout', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function fetchOrders() {
  return request('/api/orders');
}

export function submitReturn(payload) {
  return request('/api/returns', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function fetchReturns() {
  return request('/api/returns');
}

export function fetchWorkflow(workflowId) {
  return request(`/api/workflows/${encodeURIComponent(workflowId)}`);
}

export function sendSupportChat(message) {
  return request('/api/support/chat', {
    method: 'POST',
    body: JSON.stringify({ message }),
  });
}
