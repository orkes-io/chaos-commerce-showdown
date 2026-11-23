// Shared helpers: DOM building, API client, local storage, formatting.

// h("div", { class: "x", onclick: fn }, child, "text") -> element. Text is always inserted as text nodes,
// so nothing that comes from the API or the user is ever interpreted as HTML.
export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs ?? {})) {
    if (value === false || value === null || value === undefined) continue;
    if (key.startsWith("on") && typeof value === "function") el.addEventListener(key.slice(2), value);
    else if (key === "class") el.className = value;
    else if (key === "value") el.value = value;
    else if (value === true) el.setAttribute(key, "");
    else el.setAttribute(key, String(value));
  }
  for (const child of children.flat(Infinity)) {
    if (child === false || child === null || child === undefined) continue;
    el.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return el;
}

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export function money(amount, currency = "USD") {
  const n = Number(amount);
  if (!Number.isFinite(n)) return "$?.??";
  const text = Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (currency && currency !== "USD") return `${n < 0 ? "-" : ""}${text} ${currency}`;
  return `${n < 0 ? "-" : ""}$${text}`;
}

export function toast(message, ms = 3500) {
  const root = document.getElementById("toasts");
  const el = h("div", { class: "toast" }, message);
  root.append(el);
  setTimeout(() => el.remove(), ms);
}

// ---- API ------------------------------------------------------------------------------------------------

const apiBase = String(window.CHAOS_CONFIG?.apiBaseUrl ?? "").replace(/\/+$/, "");

export class ApiError extends Error {
  constructor(message, { status = 0, code = "NETWORK", retryable = true } = {}) {
    super(message);
    this.status = status;
    this.code = code;
    this.retryable = retryable;
  }
}

export async function api(path, { method = "GET", body } = {}) {
  let res;
  try {
    res = await fetch(`${apiBase}/api${path}`, {
      method,
      headers: body === undefined ? {} : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError("We could not reach the store's back office. It may be napping.");
  }
  const data = await res.json().catch(() => null);
  if (!res.ok && !(res.status === 409 && data && !data.error)) {
    throw new ApiError(data?.error?.message ?? `The back office answered with a ${res.status}.`, {
      status: res.status,
      code: data?.error?.code ?? "HTTP_" + res.status,
      retryable: data?.error?.retryable ?? res.status >= 500,
    });
  }
  return data;
}

// ---- local state (cart, order history, reviews) -----------------------------------------------------------

const PREFIX = "chaos-commerce:";

export const store = {
  get(key, fallback) {
    try {
      const raw = localStorage.getItem(PREFIX + key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(value));
    } catch {
      // Private mode or a full disk: the store still works, it just forgets things. On brand.
    }
  },
  remove(key) {
    try {
      localStorage.removeItem(PREFIX + key);
    } catch {}
  },
};

export const cart = {
  items() {
    const value = store.get("cart", {});
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
  },
  count() {
    return Object.values(this.items()).reduce((sum, qty) => sum + (Number(qty) || 0), 0);
  },
  setQty(id, qty) {
    const items = this.items();
    if (qty <= 0) delete items[id];
    else items[id] = Math.min(99, Math.floor(qty));
    store.set("cart", items);
    window.dispatchEvent(new Event("cart:changed"));
  },
  add(id, by = 1) {
    this.setQty(id, (Number(this.items()[id]) || 0) + by);
  },
  clear() {
    store.set("cart", {});
    window.dispatchEvent(new Event("cart:changed"));
  },
};

const ID_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function newId(prefix) {
  const bytes = new Uint8Array(10);
  crypto.getRandomValues(bytes);
  return `${prefix}-${Array.from(bytes, (b) => ID_ALPHABET[b % ID_ALPHABET.length]).join("")}`;
}

export function remember(listKey, entry, idKey) {
  const list = store.get(listKey, []).filter((item) => item?.[idKey] !== entry[idKey]);
  list.unshift(entry);
  store.set(listKey, list.slice(0, 30));
}
