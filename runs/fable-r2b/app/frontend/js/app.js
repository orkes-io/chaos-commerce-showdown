// Entry point: loads the catalogue, routes between views and runs the
// decorative nonsense around them.

import { api, cartCount, h, money, save, sleep, state, toast } from "./lib.js";
import { cartView, productView, shopView } from "./shop.js";
import { checkoutView, orderView } from "./checkout.js";
import { returnTrackerView, returnsFormView } from "./returns.js";

const app = document.getElementById("app");
let catalog = null;

const navigate = (hash) => {
  if (location.hash === hash) render();
  else location.hash = hash;
};

function regretsView() {
  const empty = state.orders.length === 0 && state.returns.length === 0;
  return h("section", {},
    h("h1", {}, "My Regrets"),
    h("p", { class: "fine-print" }, "This list is kept in this browser only. We would lose it otherwise."),
    empty ? h("p", { class: "panel" }, "No regrets yet. ", h("a", { href: "#/" }, "Let's fix that.")) : null,
    state.orders.length > 0 ? h("div", { class: "panel" },
      h("h2", {}, "Orders"),
      h("ul", { class: "plain-list" }, state.orders.map((order) =>
        h("li", {},
          h("a", { href: `#/order/${order.workflowId}` }, order.orderId), ` - ${money(order.totalCents)} - `,
          order.lines.map((line) => `${line.emoji} ${line.name}`).join(", ") || "nothing at all", " ",
          h("a", { class: "link-btn", href: `#/returns?order=${order.workflowId}` }, "Return something"))))) : null,
    state.returns.length > 0 ? h("div", { class: "panel" },
      h("h2", {}, "Returns"),
      h("ul", { class: "plain-list" }, state.returns.map((entry) =>
        h("li", {},
          h("a", { href: `#/return/${entry.workflowId}` }, entry.returnId), ` - ${entry.itemName} - `,
          entry.code ? entry.code.replaceAll("_", " ") : "awaiting a decision")))) : null,
  );
}

function notFoundView() {
  return h("section", { class: "panel" },
    h("h1", {}, "404: Aisle Not Found"),
    h("p", {}, "We looked everywhere. It is probably with the right socks."),
    h("a", { class: "btn", href: "#/" }, "Back to the shop"));
}

function resolve() {
  const [path, query = ""] = location.hash.replace(/^#/, "").split("?");
  const parts = path.split("/").filter(Boolean).map(decodeURIComponent);
  const params = new URLSearchParams(query);
  switch (parts[0] ?? "") {
    case "": return shopView(catalog);
    case "product": return productView(catalog, parts[1]);
    case "cart": return cartView(catalog);
    case "checkout": return checkoutView(catalog, navigate);
    case "order": return orderView(catalog, parts[1] ?? "");
    case "returns": return returnsFormView(catalog, navigate, params);
    case "return": return returnTrackerView(parts[1] ?? "");
    case "regrets": return regretsView();
    default: return notFoundView();
  }
}

let firstRender = true;

function render() {
  if (!catalog) return;
  app.replaceChildren(resolve());
  window.scrollTo(0, 0);
  // After a navigation, move focus to the new view so keyboard and
  // screen-reader users land on it.
  if (!firstRender) app.focus({ preventScroll: true });
  firstRender = false;
}

async function boot() {
  app.replaceChildren(h("p", { class: "panel", role: "status" }, "⏳ Loading... (we're as surprised as you are)"));
  for (let attempt = 1; ; attempt++) {
    try {
      catalog = await api("/catalog");
      break;
    } catch (error) {
      app.replaceChildren(h("div", { class: "panel" },
        h("h1", {}, "The store is closed (unintentionally)"),
        h("p", {}, `${error.message} This is the most reliable we have ever been.`),
        h("p", { role: "status" }, `Trying again shortly (attempt ${attempt})...`)));
      await sleep(Math.min(15000, 2000 * attempt));
    }
  }
  render();
  api("/health").then(
    () => {},
    () => { document.getElementById("backend-status").textContent = "Notice: the workflow engine behind checkout and returns is currently unreachable. Orders will be retried."; },
  );
}

// ---- decorative nonsense ---------------------------------------------------

function updateCartCount() {
  document.getElementById("cart-count").textContent = cartCount();
}

function startVisitorCounter() {
  const counter = document.getElementById("visitor-count");
  let visitors = 42;
  setInterval(() => {
    // Visitors mostly leave.
    visitors = Math.max(1, visitors + (Math.random() < 0.7 ? -1 : 1));
    counter.textContent = String(visitors).padStart(7, "0");
  }, 4000);
}

function startSaleCountdown() {
  const display = document.getElementById("sale-countdown");
  let seconds = 10;
  setInterval(() => {
    seconds = seconds <= 0 ? 10 + Math.floor(Math.random() * 50) : seconds - 1;
    display.textContent = `00:00:${String(seconds).padStart(2, "0")}`;
  }, 1000);
}

function setUpLanguage() {
  const select = document.getElementById("language");
  select.addEventListener("change", () => {
    document.body.dataset.language = select.value;
    toast(select.value === "loud" ? "LANGUAGE SET TO ENGLISH (LOUDER)." : select.value === "quiet" ? "language set to english (ashamed)." : "Language set to English.");
  });
}

function setUpCookies() {
  const banner = document.getElementById("cookie-banner");
  banner.hidden = Boolean(state.cookies);
  banner.addEventListener("click", (event) => {
    const choice = event.target.dataset?.cookie;
    if (!choice) return;
    state.cookies = true;
    save();
    banner.hidden = true;
    toast(choice === "harder" ? "Cookies accepted, harder. We felt that." : "Cookies accepted. They are oatmeal raisin. Sorry.");
  });
}

function setUpChat() {
  const replies = [
    "Thank you for contacting Chaos Commerce. All of our agents are.",
    "Have you tried wanting the item less?",
    "I understand your frustration. I am also frustrated. Mostly by you.",
    "Let me transfer you to a specialist. [The specialist is me, with a hat on.]",
    "Your call is important to us. This is not a call, so it is not.",
    "I have escalated your issue to Dale. Dale has gone home.",
    "For returns, please visit the Returns page and bring snacks.",
  ];
  const toggle = document.getElementById("chat-toggle");
  const panel = document.getElementById("chat-panel");
  const log = document.getElementById("chat-log");
  const input = document.getElementById("chat-input");
  let turn = 0;
  const say = (who, message) => {
    log.append(h("p", { class: `chat-${who}` }, h("strong", {}, who === "bot" ? "Support: " : "You: "), message));
    log.scrollTop = log.scrollHeight;
  };
  toggle.addEventListener("click", () => {
    panel.hidden = !panel.hidden;
    toggle.setAttribute("aria-expanded", String(!panel.hidden));
    if (!panel.hidden) {
      if (log.childElementCount === 0) say("bot", "Hello! You are number 4,817 in the queue. How can we fail to help?");
      input.focus();
    }
  });
  document.getElementById("chat-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const message = input.value.trim();
    if (!message) return;
    say("you", message);
    input.value = "";
    setTimeout(() => say("bot", replies[turn++ % replies.length]), 600);
  });
}

window.addEventListener("hashchange", render);
document.addEventListener("chaos:state", updateCartCount);
updateCartCount();
startVisitorCounter();
startSaleCountdown();
setUpLanguage();
setUpCookies();
setUpChat();
boot();
