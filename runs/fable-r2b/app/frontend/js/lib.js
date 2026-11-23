// Shared helpers: DOM building, money, the API client and saved state.

// Builds an element. Children are appended as text nodes unless they are
// already nodes, so strings from the API or the user are never parsed as HTML.
export function h(tag, attrs = {}, ...children) {
  const element = document.createElement(tag);
  for (const [name, value] of Object.entries(attrs ?? {})) {
    if (value === false || value == null) continue;
    if (name.startsWith("on")) element.addEventListener(name.slice(2).toLowerCase(), value);
    else if (name === "class") element.className = value;
    else if (name === "dataset") Object.assign(element.dataset, value);
    else if (name in element && name !== "list" && name !== "form") element[name] = value;
    else element.setAttribute(name, value === true ? "" : value);
  }
  for (const child of children.flat(Infinity)) {
    if (child === false || child == null) continue;
    element.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return element;
}

const dollars = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
export const money = (cents) => dollars.format((Number(cents) || 0) / 100);

export const stars = (count) => "★".repeat(count) + "☆".repeat(Math.max(0, 5 - count));

export function toast(message) {
  const item = h("div", { class: "toast" }, message);
  document.getElementById("toasts").append(item);
  setTimeout(() => item.remove(), 5000);
}

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ---- API ------------------------------------------------------------------

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
  let response;
  try {
    response = await fetch(`${apiBase}/api${path}`, {
      method,
      headers: body === undefined ? {} : { "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError("The store's back office cannot be reached.");
  }
  let payload = null;
  try {
    payload = await response.json();
  } catch {
    // An empty or non-JSON body is handled below through the status code.
  }
  if (!response.ok) {
    throw new ApiError(payload?.message ?? `The back office answered with ${response.status}.`, {
      status: response.status,
      code: payload?.error ?? "ERROR",
      retryable: payload?.retryable ?? response.status >= 500,
    });
  }
  return payload;
}

// ---- saved state (this browser only) --------------------------------------

const STORAGE_KEY = "chaos-commerce:v1";
const blank = () => ({ cart: {}, orders: [], returns: [], reviews: {}, checkoutToken: null, cookies: false });

function load() {
  try {
    return { ...blank(), ...JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}") };
  } catch {
    return blank();
  }
}

export const state = load();

export function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Private mode or a full disk: the store still works for this visit.
  }
  document.dispatchEvent(new CustomEvent("chaos:state"));
}

export const cartCount = () => Object.values(state.cart).reduce((sum, qty) => sum + qty, 0);

export function setQuantity(productId, qty) {
  if (qty <= 0) delete state.cart[productId];
  else state.cart[productId] = Math.min(99, qty);
  save();
}

export function newToken() {
  return crypto.randomUUID?.() ?? `t-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

export function remember(listName, entry) {
  state[listName] = [entry, ...state[listName].filter((item) => item.workflowId !== entry.workflowId)].slice(0, 30);
  save();
}
