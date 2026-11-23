import type {
  ChaosProduct,
  ChaosReview,
  HealthResponse,
  WorkflowExecutionTrace
} from "./types";

const STORAGE_KEY = "chaos_commerce_api_base_url";

export function getApiBaseUrl(): string {
  try {
    const override = localStorage.getItem(STORAGE_KEY);
    if (override !== null && override.trim() !== "") {
      return override.trim().replace(/\/+$/, "");
    }
  } catch {
    // ignore storage errors
  }
  const envUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined) || "";
  return envUrl.trim().replace(/\/+$/, "");
}

export function setApiBaseUrlOverride(url: string): void {
  try {
    const cleaned = url.trim().replace(/\/+$/, "");
    if (!cleaned) {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, cleaned);
    }
  } catch {
    // ignore
  }
}

async function apiJson<T>(path: string, init?: RequestInit): Promise<T> {
  const base = getApiBaseUrl();
  const url = `${base}${path.startsWith("/") ? path : `/${path}`}`;
  const resp = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {})
    }
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    throw new Error(data?.error || `HTTP ${resp.status} calling ${url}`);
  }
  return data as T;
}

export function fetchHealth(): Promise<HealthResponse> {
  return apiJson<HealthResponse>("/api/health");
}

export function fetchProducts(): Promise<{ products: ChaosProduct[] }> {
  return apiJson<{ products: ChaosProduct[] }>("/api/products");
}

export function submitProductReview(
  productId: string,
  payload: {
    author: string;
    stars: 1 | 2 | 3 | 4 | 5;
    title: string;
    body: string;
    dodgeAttemptsBeforeSurrender: number;
  }
): Promise<{ review: ChaosReview }> {
  return apiJson<{ review: ChaosReview }>(
    `/api/products/${encodeURIComponent(productId)}/reviews`,
    {
      method: "POST",
      body: JSON.stringify(payload)
    }
  );
}

export function submitCheckout(payload: {
  customerName: string;
  customerEmail: string;
  shippingAddress: string;
  shippingTier: string;
  paymentMethod: string;
  couponCode: string;
  chaosInsurance: boolean;
  items: Array<{ productId: string; quantity: number }>;
}): Promise<{
  orderId: string;
  workflowId: string;
  status: string;
  conductorExecutionUrl: string;
  order: Record<string, any>;
  trace: WorkflowExecutionTrace;
}> {
  return apiJson("/api/checkout", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function fetchOrders(): Promise<{ orders: Array<Record<string, any>> }> {
  return apiJson("/api/orders");
}

export function submitReturn(payload: {
  orderId: string;
  itemName: string;
  itemPrice: number;
  reason: string;
  moonPhase: string;
  eyeContactSeconds: number;
  originalAirPercent: number;
  tapeStripCount: number;
  tearsShed: number;
  sworeHubrisOath: boolean;
  didNotFeedAfterMidnight: boolean;
  apologyText: string;
}): Promise<{
  returnId: string;
  orderId: string;
  workflowId: string;
  status: string;
  conductorExecutionUrl: string;
  decision: Record<string, any>;
  trace: WorkflowExecutionTrace;
}> {
  return apiJson("/api/returns", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function fetchReturns(): Promise<{ returns: Array<Record<string, any>> }> {
  return apiJson("/api/returns");
}

export function fetchWorkflowTrace(
  workflowId: string
): Promise<{ trace: WorkflowExecutionTrace }> {
  return apiJson(`/api/workflows/${encodeURIComponent(workflowId)}`);
}
