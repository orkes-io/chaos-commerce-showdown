import { h, api, ApiError, cart, store, money, toast, sleep, newId, remember } from "./lib.js";
import { productArt } from "./art.js";
import { startTagline, startVisitorCounter, showCookieBanner, starPicker } from "./gags.js";

const app = document.getElementById("app");
let catalog = null; // { products, shippingOptions, returnReasons }
let renderToken = 0; // bumps on every navigation so stale polls stop themselves

async function loadCatalog() {
  catalog ??= await api("/products");
  return catalog;
}

const productById = (id) => catalog?.products.find((product) => product.id === id) ?? null;
const stars = (n) => "★".repeat(n) + "☆".repeat(Math.max(0, 5 - n));

const present = (nodes) => nodes.flat(Infinity).filter((node) => node !== false && node !== null && node !== undefined);

function show(...nodes) {
  app.replaceChildren(...present(nodes));
}

function errorPanel(error, retry) {
  return h(
    "div",
    { class: "panel notice--error", role: "alert" },
    h("h2", {}, "Something went wrong (on purpose? unclear)"),
    h("p", {}, error?.message ?? "Unknown error."),
    retry && h("button", { class: "btn", type: "button", onclick: retry }, "Try again"),
  );
}

function stepList(steps) {
  return h(
    "ul",
    { class: "steps" },
    steps.map((step) =>
      h(
        "li",
        { class: step.status === "COMPLETED" ? "done" : step.status === "IN_PROGRESS" || step.status === "SCHEDULED" ? "" : "bad" },
        step.label,
        step.detail && h("span", { class: "detail" }, step.detail),
      ),
    ),
  );
}

function behindTheScenes(view) {
  const info = view.conductor ?? {};
  return h(
    "details",
    {},
    h("summary", {}, "Behind the scenes (the part that actually works)"),
    h("p", { class: "small" }, "This ran as a real Conductor workflow. Every step below is a task in that execution."),
    h(
      "dl",
      { class: "kv small" },
      h("dt", {}, "Workflow"),
      h("dd", {}, h("code", {}, `${info.workflowName} v${info.workflowVersion ?? 1}`)),
      h("dt", {}, "Execution"),
      h("dd", {}, info.executionUrl ? h("a", { href: info.executionUrl, target: "_blank", rel: "noopener" }, info.workflowId) : h("code", {}, info.workflowId)),
      h("dt", {}, "Status"),
      h("dd", {}, h("code", { "data-testid": "workflow-status" }, info.status)),
    ),
    stepList(view.steps ?? []),
  );
}

// ---- home -------------------------------------------------------------------------------------------------

function productCard(product) {
  const button = h(
    "button",
    {
      class: "btn",
      type: "button",
      "data-testid": `add-${product.id}`,
      onclick: () => {
        cart.add(product.id);
        button.textContent = "Added. No take-backs.";
        toast(`${product.name} added to cart. We are as surprised as you are.`);
        setTimeout(() => (button.textContent = "Add to cart"), 1800);
      },
    },
    "Add to cart",
  );
  return h(
    "article",
    { class: "card", "data-product": product.id },
    product.badge && h("span", { class: "badge" }, product.badge),
    h("div", { class: "card__art" }, productArt(product.id, product.name)),
    h("a", { class: "card__name", href: `#/product/${product.id}` }, product.name),
    h("div", { class: "price" }, product.wasLabel && h("span", { class: "was" }, `was ${product.wasLabel}`), product.priceLabel),
    h("div", { class: "muted" }, product.blurb),
    h("div", { class: "small" }, `★ ${product.rating}`),
    h("div", { class: "stock" }, product.stock),
    button,
  );
}

async function homeView() {
  const { products } = await loadCatalog();
  const grid = h("div", { class: "grid", "data-testid": "product-grid" }, products.map(productCard));
  const searchNote = h("p", { class: "hint", "aria-live": "polite" });
  const search = h("input", { type: "search", "aria-label": "Search products", placeholder: "Search (results may vary from query)" });
  const countdown = h("span", { class: "countdown", "aria-hidden": "true" }, "00:00:10");
  let seconds = 10;
  const token = renderToken;
  const timer = setInterval(() => {
    if (token !== renderToken) return clearInterval(timer);
    seconds = seconds <= 0 ? 10 + Math.floor(Math.random() * 50) : seconds - 1;
    countdown.textContent = `00:00:${String(seconds).padStart(2, "0")}`;
  }, 1000);

  show(
    h(
      "section",
      { class: "panel panel--tilt hero" },
      h("h1", {}, "EVERYTHING MUST GO"),
      h("p", {}, "(We don't know where. Please take it.)"),
      h("p", {}, "Sale ends in ", countdown, " ", h("span", { class: "small" }, "(it restarts; it always restarts)")),
      h(
        "form",
        {
          class: "search",
          role: "search",
          onsubmit: (event) => {
            event.preventDefault();
            const query = search.value.trim();
            searchNote.textContent = query
              ? `No results for "${query}". Showing everything we have instead, in case you change your mind.`
              : "You searched for nothing. We do sell that (see: Subscription to Nothing).";
          },
        },
        search,
        h("button", { class: "btn btn--cyan", type: "submit" }, "Search-ish"),
      ),
      searchNote,
    ),
    grid,
  );
}

// ---- product + reviews ------------------------------------------------------------------------------------

function reviewCard(review) {
  return h(
    "article",
    { class: "review", "data-stars": review.stars },
    h("div", {}, h("span", { class: "review__stars", "aria-label": `${review.stars} out of 5 stars` }, stars(review.stars)), h("span", { class: "review__title" }, review.title)),
    h("p", {}, review.body),
    h("div", { class: "review__meta" }, `by ${review.author}${review.mine ? " (you, pending moderation by Kevin, forever)" : " · Verified Purchase (unverified)"}`),
  );
}

async function productView(id) {
  await loadCatalog();
  const product = productById(id);
  if (!product) {
    return show(h("div", { class: "panel" }, h("h1", {}, "Product not found"), h("p", {}, "We don't sell that. Give it a week."), h("a", { class: "btn", href: "#/" }, "Back to the shop")));
  }
  const myReviews = store.get("reviews", {});
  const reviewList = h("div", { "data-testid": "reviews" }, [...(myReviews[product.id] ?? []), ...product.reviews].map(reviewCard));

  let chosen = 0;
  const chosenNote = h("p", { class: "hint", "aria-live": "polite" }, "No rating selected. One star is available to anyone who can catch it.");
  const picker = starPicker((rating) => {
    chosen = rating;
    chosenNote.textContent = `You selected ${rating} stars. A wise and legally safe choice.`;
  });
  const title = h("input", { type: "text", id: "review-title", maxlength: "80", placeholder: "e.g. FURIOUS, five stars" });
  const body = h("textarea", { id: "review-body", rows: "3", maxlength: "500", placeholder: "Tell us how you feel. We will not read it." });
  const form = h(
    "form",
    {
      class: "panel panel--pink",
      onsubmit: (event) => {
        event.preventDefault();
        if (!chosen) return toast("Please pick a rating. One star is available if you can catch it.");
        const review = { stars: chosen, title: title.value.trim() || "(no title, too emotional)", body: body.value.trim() || "(the customer simply screamed)", author: "You", mine: true };
        const all = store.get("reviews", {});
        all[product.id] = [review, ...(all[product.id] ?? [])].slice(0, 5);
        store.set("reviews", all);
        reviewList.prepend(reviewCard(review));
        form.reset();
        picker.reset();
        chosen = 0;
        chosenNote.textContent = "Rating cleared. One star remains at large.";
        toast("Review submitted. It has been forwarded to Kevin, who is at lunch.");
      },
    },
    h("h2", {}, "Write a review"),
    h("p", { class: "hint" }, "Rate this product. All ratings are welcome. Some are harder to give than others."),
    picker.element,
    chosenNote,
    h("label", { for: "review-title" }, "Title"),
    title,
    h("label", { for: "review-body" }, "Review"),
    body,
    h("div", { class: "actions" }, h("button", { class: "btn", type: "submit" }, "Submit review")),
  );

  show(
    h(
      "section",
      { class: "panel product" },
      h("div", { class: "product__art" }, productArt(product.id, product.name)),
      h(
        "div",
        {},
        h("h1", {}, product.name),
        h("div", { class: "price" }, product.wasLabel && h("span", { class: "was" }, `was ${product.wasLabel}`), product.priceLabel),
        h("p", {}, product.description),
        h("p", { class: "stock" }, product.stock),
        h("p", { class: "small" }, `★ ${product.rating}`),
        h(
          "div",
          { class: "actions" },
          h("button", { class: "btn btn--big", type: "button", onclick: () => { cart.add(product.id); toast("Added to cart. This cannot be undone (it can)."); } }, "ADD TO CART"),
          h("a", { class: "btn btn--plain", href: "#/cart" }, "Go to cart"),
        ),
      ),
    ),
    h("section", { class: "panel" }, h("h2", {}, "Customer reviews"), h("p", { class: "hint" }, "Sorted by: volume."), reviewList),
    form,
  );
}

// ---- cart + checkout --------------------------------------------------------------------------------------

async function placeOrder(payload, statusEl, button) {
  button.disabled = true;
  const overlayText = h("p", {}, "Untangling your cart…");
  const overlay = h("div", { class: "overlay", role: "alertdialog", "aria-label": "Placing order" }, h("div", { class: "overlay__box" }, h("div", { class: "spinner", "aria-hidden": "true" }), h("h2", {}, "Placing your order"), overlayText, h("p", { class: "small" }, `Order number ${payload.orderId}. Do not refresh. Or do. It is idempotent.`)));
  document.getElementById("overlay-root").append(overlay);
  const lines = ["Inventing fees…", "Trying a payment processor…", "Trying a different payment processor…", "Waking the pigeon…", "Still going. This is normal."];
  let tick = 0;
  const ticker = setInterval(() => (overlayText.textContent = lines[Math.min(tick++, lines.length - 1)]), 900);
  try {
    // The order number is generated once and reused on every retry, so a flaky connection can never
    // double-order: the backend returns the existing order for a number it has already seen.
    for (let attempt = 1; ; attempt++) {
      try {
        const view = await api("/checkout", { method: "POST", body: payload });
        remember("orders", { orderId: view.orderId, placedAt: new Date().toISOString(), total: view.confirmation?.total ?? null }, "orderId");
        store.remove("pendingOrder");
        cart.clear();
        location.hash = `#/order/${view.orderId}`;
        return;
      } catch (error) {
        if (!(error instanceof ApiError) || !error.retryable || attempt >= 8) throw error;
        overlayText.textContent = `The back office is napping. Trying again (attempt ${attempt + 1})…`;
        await sleep(Math.min(8000, 1200 * attempt));
      }
    }
  } catch (error) {
    statusEl.replaceChildren(
      h("div", { class: "notice notice--error", role: "alert" }, h("strong", {}, "Your order is not lost. "), `${error.message} Press the button again: order number ${payload.orderId} is saved and will not be charged twice.`),
    );
  } finally {
    clearInterval(ticker);
    overlay.remove();
    button.disabled = false;
  }
}

async function cartView() {
  await loadCatalog();
  const saved = store.get("customer", {});
  const form = { name: saved.name ?? "", email: saved.email ?? "", coupon: "", shipping: "standard" };
  const render = () => {
    const items = Object.entries(cart.items())
      .map(([id, qty]) => ({ product: productById(id), qty: Number(qty) || 1 }))
      .filter((line) => line.product);
    const subtotal = items.reduce((sum, line) => sum + line.product.unitPrice * line.qty, 0);
    const pending = store.get("pendingOrder", null);

    const name = h("input", { type: "text", id: "customer-name", autocomplete: "name", maxlength: "80", value: form.name, placeholder: "Valued Customer", oninput: () => (form.name = name.value) });
    const email = h("input", { type: "email", id: "customer-email", autocomplete: "email", maxlength: "120", value: form.email, placeholder: "you@example.com (optional; we will guess)", oninput: () => (form.email = email.value) });
    const coupon = h("input", { type: "text", id: "coupon", maxlength: "40", value: form.coupon, placeholder: "e.g. SAVE10", oninput: () => (form.coupon = coupon.value) });
    const shipping = h("select", { id: "shipping", onchange: () => (form.shipping = shipping.value) }, catalog.shippingOptions.map((option) => h("option", { value: option.id, selected: option.id === form.shipping }, option.label)));
    const status = h("div", {});
    const button = h("button", { class: "btn btn--big", type: "submit", "data-testid": "place-order" }, "PLACE ORDER");

    const table = items.length
      ? h(
          "table",
          {},
          h("thead", {}, h("tr", {}, h("th", {}, "Item"), h("th", {}, "Quantity"), h("th", { class: "num" }, "Price"))),
          h(
            "tbody",
            {},
            items.map(({ product, qty }) =>
              h(
                "tr",
                { "data-line": product.id },
                h("td", {}, h("a", { href: `#/product/${product.id}` }, product.name)),
                h(
                  "td",
                  {},
                  h(
                    "span",
                    { class: "qty" },
                    h("button", { class: "btn btn--small btn--plain", type: "button", "aria-label": `Decrease quantity of ${product.name}`, onclick: () => { cart.setQty(product.id, qty - 1); toast("Fine. We will tell the warehouse you have changed your mind. They will be devastated."); render(); } }, "−"),
                    h("strong", {}, qty),
                    h("button", { class: "btn btn--small btn--plain", type: "button", "aria-label": `Increase quantity of ${product.name}`, onclick: () => { cart.setQty(product.id, qty + 1); render(); } }, "+"),
                    h("button", { class: "btn btn--small btn--plain", type: "button", onclick: () => { cart.setQty(product.id, 0); toast("Removed. It will remember this."); render(); } }, "Remove"),
                  ),
                ),
                h("td", { class: "num" }, money(product.unitPrice * qty)),
              ),
            ),
            h("tr", {}, h("td", { colspan: "2" }, "Subtotal"), h("td", { class: "num", "data-testid": "subtotal" }, money(subtotal))),
            h("tr", {}, h("td", { colspan: "2" }, "Fees"), h("td", { class: "num" }, "To be revealed at the least convenient moment")),
          ),
        )
      : h("div", { class: "notice" }, h("strong", {}, "Your cart is empty. "), "You can still check out. We will think of something to sell you.");

    show(
      h("h1", {}, "Your cart"),
      h("section", { class: "panel" }, table),
      h(
        "form",
        {
          class: "panel panel--loud",
          onsubmit: (event) => {
            event.preventDefault();
            store.set("customer", { name: name.value.trim(), email: email.value.trim() });
            // Reuse a pending order number only if the cart is unchanged since the failed attempt.
            const cartItems = items.map((line) => ({ id: line.product.id, qty: line.qty }));
            const fingerprint = JSON.stringify(cartItems);
            const orderId = pending?.fingerprint === fingerprint ? pending.orderId : newId("CC");
            store.set("pendingOrder", { orderId, fingerprint });
            placeOrder({ orderId, customer: { name: name.value.trim(), email: email.value.trim() }, items: cartItems, coupon: coupon.value.trim(), shipping: shipping.value }, status, button);
          },
        },
        h("h2", {}, "Checkout"),
        h("label", { for: "customer-name" }, "Name"),
        name,
        h("label", { for: "customer-email" }, "Email"),
        email,
        h("label", { for: "coupon" }, "Coupon code"),
        coupon,
        h("p", { class: "hint" }, "Coupons are honoured. Honouring a coupon increases the price by 10%."),
        h("label", { for: "shipping" }, "Shipping"),
        shipping,
        h("p", { class: "hint" }, "No card details needed. Our payment processors decline everyone equally, then we accept an IOU."),
        h("div", { class: "actions" }, button, h("a", { href: "#/" }, "Keep shopping (please)")),
        status,
      ),
    );
  };
  render();
}

// ---- order confirmation -----------------------------------------------------------------------------------

function receipt(view) {
  const c = view.confirmation;
  return [
    h(
      "section",
      { class: "panel", "data-testid": "order-confirmed" },
      h("div", { class: "stamp stamp--CONFIRMED" }, "Confirmed"),
      h("h1", {}, `Order ${c.orderId}`),
      h("p", {}, c.message),
      h(
        "table",
        {},
        h("thead", {}, h("tr", {}, h("th", {}, "Item"), h("th", { class: "num" }, "Qty"), h("th", { class: "num" }, "Amount"))),
        h(
          "tbody",
          {},
          (c.items ?? []).map((item) => h("tr", {}, h("td", {}, item.name), h("td", { class: "num" }, item.qty), h("td", { class: "num" }, money(item.lineTotal)))),
          h("tr", {}, h("td", { colspan: "2" }, "Subtotal"), h("td", { class: "num" }, money(c.subtotal))),
          (c.fees ?? []).map((fee) => h("tr", { "data-fee": fee.code }, h("td", { colspan: "2" }, fee.label), h("td", { class: "num" }, money(fee.amount)))),
          h("tr", { class: "total" }, h("td", { colspan: "2" }, "TOTAL"), h("td", { class: "num", "data-testid": "order-total" }, money(c.total))),
        ),
      ),
    ),
    h(
      "section",
      { class: "panel panel--pink" },
      h("h2", {}, "Payment"),
      h("ul", { class: "steps" }, (c.paymentAttempts ?? []).map((attempt) => h("li", { class: attempt.approved ? "done" : "bad" }, `Attempt ${attempt.attempt} via ${attempt.processor}`, h("span", { class: "detail" }, attempt.message)))),
      h("p", {}, h("strong", {}, c.payment?.method === "IOU" ? "Settled by IOU. " : "Paid. "), c.payment?.note ?? "", " ", h("em", {}, `(${money(c.payment?.amount)} via ${c.payment?.processor})`)),
      h("p", { class: "small" }, "This is a parody: nothing was actually charged."),
    ),
    h(
      "section",
      { class: "panel" },
      h("h2", {}, "Fulfilment"),
      h("ul", { class: "steps" }, (c.inventory ?? []).map((line) => h("li", { class: "warn" }, `${line.qty} × ${line.name}`, h("span", { class: "detail" }, line.status)))),
      h("dl", { class: "kv" }, h("dt", {}, "Carrier"), h("dd", {}, c.delivery?.carrier), h("dt", {}, "Estimated arrival"), h("dd", {}, c.delivery?.eta), h("dt", {}, "Tracking"), h("dd", {}, h("code", {}, c.delivery?.trackingNumber))),
      h("div", { class: "actions" }, h("a", { class: "btn", href: `#/returns?order=${encodeURIComponent(c.orderId)}` }, "Return something (good luck)"), h("a", { class: "btn btn--plain", href: "#/" }, "Buy more")),
      behindTheScenes(view),
    ),
  ];
}

async function orderView(orderId) {
  const token = renderToken;
  show(h("div", { class: "panel" }, h("h1", {}, `Order ${orderId}`), h("p", { class: "loading" }, "Looking for your order in the pile…")));
  for (let attempt = 0; token === renderToken; attempt++) {
    let view;
    try {
      view = await api(`/orders/${encodeURIComponent(orderId)}`);
    } catch (error) {
      if (token !== renderToken) return;
      if (error.status === 404) {
        return show(h("div", { class: "panel" }, h("h1", {}, "Order not found"), h("p", {}, error.message), h("a", { class: "btn", href: "#/orders" }, "My orders")));
      }
      show(errorPanel(error), h("p", { class: "muted" }, "Still trying. Your order is safe in the workflow engine."));
      await sleep(2500);
      continue;
    }
    if (token !== renderToken) return;
    if (view.complete) return show(...receipt(view));
    show(
      h(
        "section",
        { class: "panel" },
        h("h1", {}, `Order ${orderId}`),
        h("p", {}, h("span", { class: "spinner spinner--small", "aria-hidden": "true" }), view.state === "RECOVERING" ? " Your order fell off a shelf. We are putting it back. It will complete." : " Processing. It always completes; we just like the suspense."),
        stepList(view.steps ?? []),
      ),
    );
    await sleep(1000);
  }
}

async function ordersView() {
  const orders = store.get("orders", []);
  const returns = store.get("returns", []);
  const lookup = h("input", { type: "text", id: "order-lookup", placeholder: "CC-XXXXXXXXXX", maxlength: "64" });
  show(
    h("h1", {}, "My orders"),
    h(
      "section",
      { class: "panel" },
      orders.length
        ? h("table", {}, h("thead", {}, h("tr", {}, h("th", {}, "Order"), h("th", {}, "Placed"), h("th", { class: "num" }, "Total"), h("th", {}, ""))), h("tbody", {}, orders.map((order) => h("tr", {}, h("td", {}, h("a", { href: `#/order/${order.orderId}` }, order.orderId)), h("td", {}, new Date(order.placedAt).toLocaleString()), h("td", { class: "num" }, order.total === null ? "pending" : money(order.total)), h("td", {}, h("a", { href: `#/returns?order=${encodeURIComponent(order.orderId)}` }, "Return"))))))
        : h("p", {}, "No orders on this device yet. Our accountants are thrilled. Our shareholders are not."),
      h("form", { onsubmit: (event) => { event.preventDefault(); if (lookup.value.trim()) location.hash = `#/order/${encodeURIComponent(lookup.value.trim())}`; } }, h("label", { for: "order-lookup" }, "Look up an order number"), lookup, h("div", { class: "actions" }, h("button", { class: "btn btn--cyan", type: "submit" }, "Find it"))),
    ),
    returns.length > 0 && h("section", { class: "panel panel--pink" }, h("h2", {}, "My returns"), h("ul", {}, returns.map((entry) => h("li", {}, h("a", { href: `#/return/${entry.returnId}` }, entry.returnId), ` for ${entry.itemName ?? "something"} (order ${entry.orderId})`)))),
  );
}

// ---- returns: the wizard of pointless checks --------------------------------------------------------------

async function returnsView(params) {
  await loadCatalog();
  const answers = {};
  const details = { orderId: params.get("order") ?? store.get("orders", [])[0]?.orderId ?? "", itemId: "", reason: catalog.returnReasons[0] };
  let orderItems = null;
  let step = 0;

  const TOTAL = 6;
  const heading = (title) => [h("p", { class: "muted" }, `Step ${step + 1} of ${TOTAL} (of 9)`), h("h2", {}, title)];
  const next = (label = "Continue") => h("button", { class: "btn", type: "button", "data-testid": "wizard-next", onclick: () => { step += 1; render(); } }, label);

  async function loadOrderItems(orderId, select, note) {
    orderItems = null;
    select.replaceChildren(...catalog.products.map((product) => h("option", { value: product.id }, product.name)));
    note.textContent = "";
    if (!orderId) return;
    try {
      const view = await api(`/orders/${encodeURIComponent(orderId)}`);
      orderItems = view.confirmation?.items ?? [];
      if (orderItems.length) {
        select.replaceChildren(...orderItems.map((item) => h("option", { value: item.id }, `${item.name} (×${item.qty})`)));
        note.textContent = "Order found. We are as surprised as you are.";
      }
    } catch {
      note.textContent = "We could not find that order. You may continue anyway; our records are more of a suggestion.";
    }
    details.itemId = select.value;
  }

  const screens = [
    () => {
      const note = h("p", { class: "hint", "aria-live": "polite" });
      const item = h("select", { id: "return-item", onchange: () => (details.itemId = item.value) });
      const order = h("input", { type: "text", id: "return-order", value: details.orderId, maxlength: "64", placeholder: "CC-XXXXXXXXXX", onchange: () => { details.orderId = order.value.trim(); loadOrderItems(details.orderId, item, note); } });
      const reason = h("select", { id: "return-reason", onchange: () => (details.reason = reason.value) }, catalog.returnReasons.map((text) => h("option", { value: text, selected: text === details.reason }, text)));
      loadOrderItems(details.orderId, item, note);
      return [
        ...heading("What would you like to return?"),
        h("label", { for: "return-order" }, "Order number"), order, note,
        h("label", { for: "return-item" }, "Item"), item,
        h("label", { for: "return-reason" }, "Reason"), reason,
        h("div", { class: "actions" }, h("button", { class: "btn", type: "button", "data-testid": "wizard-next", onclick: () => { details.orderId = order.value.trim(); details.itemId = item.value; details.reason = reason.value; step += 1; render(); } }, "Begin the process")),
      ];
    },
    () => {
      const second = h("label", { class: "check", hidden: true }, h("input", { type: "checkbox", onchange: (event) => (answers.notTwoRobots = event.target.checked) }), "I am also not two robots in a trench coat");
      return [
        ...heading("Robot verification"),
        h("label", { class: "check" }, h("input", { type: "checkbox", onchange: (event) => { answers.notARobot = event.target.checked; second.hidden = false; } }), "I am not a robot"),
        second,
        h("p", { class: "hint" }, "Robots are welcome to return items too. This check changes nothing."),
        h("div", { class: "actions" }, next()),
      ];
    },
    () => {
      const input = h("input", { type: "text", id: "return-word", maxlength: "40", oninput: () => { answers.typedWord = input.value; verdict.textContent = input.value ? "Close enough." : ""; } });
      const verdict = h("p", { class: "hint", "aria-live": "polite" });
      return [...heading("Comprehension check"), h("label", { for: "return-word" }, "Type the word RETURN to prove you know what a return is"), input, verdict, h("div", { class: "actions" }, next())];
    },
    () => {
      const label = h("strong", {}, "Moderate regret");
      const words = ["No regret (liar)", "Mild regret", "Moderate regret", "Considerable regret", "Operatic regret"];
      const slider = h("input", { type: "range", id: "return-regret", min: "0", max: "100", value: "50", oninput: () => { answers.regret = slider.value; label.textContent = words[Math.min(4, Math.floor(slider.value / 21))]; } });
      return [...heading("Regret assessment"), h("label", { for: "return-regret" }, "How much do you regret this purchase?"), slider, h("p", {}, label), h("p", { class: "hint" }, "Recorded for quality purposes. We have no quality purposes."), h("div", { class: "actions" }, next())];
    },
    () => {
      const picked = new Set();
      const tiles = ["Joy", "A box", "Meh", "Receipt", "Regret", "A van", "Dread", "A sock", "Monday"];
      return [
        ...heading("Select all squares containing disappointment"),
        h("div", { class: "captcha" }, tiles.map((tile, index) => { const button = h("button", { type: "button", "aria-pressed": "false", "aria-label": `Square ${index + 1}: ${tile}`, onclick: () => { picked.has(index) ? picked.delete(index) : picked.add(index); button.setAttribute("aria-pressed", String(picked.has(index))); answers.disappointmentSquares = [...picked].sort().join(","); } }, tile); return button; })),
        h("p", { class: "hint" }, "There are no wrong answers. There are no right answers either."),
        h("div", { class: "actions" }, next("Verify")),
      ];
    },
    () => {
      const bar = h("div", { class: "progress__bar" });
      const note = h("p", { "aria-live": "polite" }, "Verifying your verification…");
      const status = h("div", {});
      const submit = h("button", { class: "btn btn--big", type: "button", disabled: true, "data-testid": "submit-return", onclick: () => submitReturn(submit, status) }, "SUBMIT RETURN");
      const token = renderToken;
      (async () => {
        for (const [width, text] of [[40, "Verifying your verification…"], [99, "Almost there…"], [12, "Lost our place. Starting again…"], [100, "Verified. Probably."]]) {
          await sleep(650);
          if (token !== renderToken) return;
          bar.style.width = `${width}%`;
          note.textContent = text;
        }
        submit.disabled = false;
      })();
      return [...heading("Final verification"), h("div", { class: "progress" }, bar), note, h("div", { class: "actions" }, submit), status];
    },
  ];

  async function submitReturn(button, status) {
    button.disabled = true;
    const returnId = store.get("pendingReturn", null) ?? newId("RMA");
    store.set("pendingReturn", returnId);
    try {
      const view = await api("/returns", { method: "POST", body: { returnId, orderId: details.orderId, itemId: details.itemId, reason: details.reason, answers } });
      store.remove("pendingReturn");
      remember("returns", { returnId: view.returnId, orderId: view.orderId, itemName: view.item?.name }, "returnId");
      location.hash = `#/return/${view.returnId}`;
    } catch (error) {
      status.replaceChildren(h("div", { class: "notice notice--error", role: "alert" }, `${error.message} Your answers are safe. Press the button again.`));
      button.disabled = false;
    }
  }

  function render() {
    show(h("h1", {}, "Returns"), h("p", {}, "Returning an item is easy. First, a few quick checks."), h("section", { class: "panel", "data-testid": "return-wizard", "data-step": step + 1 }, screens[step]()));
    app.querySelector("h2")?.scrollIntoView({ block: "nearest" });
  }
  render();
}

// ---- return status ----------------------------------------------------------------------------------------

const DECISION_LABEL = { APPROVED: "Approved", DENIED: "Denied", STORE_CREDIT: "Store credit" };

function resolutionPanel(result) {
  const r = result.resolution ?? {};
  return h(
    "section",
    { class: "panel", "data-testid": "return-decision", "data-decision": result.decision },
    h("div", { class: `stamp stamp--${result.decision}` }, DECISION_LABEL[result.decision] ?? result.decision),
    h("h2", {}, r.headline ?? "A decision has been reached."),
    h(
      "dl",
      { class: "kv" },
      h("dt", {}, "Item"), h("dd", {}, result.item?.name ?? "Something"),
      h("dt", {}, "Decided by"), h("dd", {}, result.decidedBy),
      r.reason && [h("dt", {}, "Reason"), h("dd", {}, r.reason)],
      r.type !== "DENIAL" && [h("dt", {}, r.type === "REFUND" ? "Refund" : "Credit"), h("dd", { "data-testid": "return-amount" }, money(r.amount, r.currency))],
      (r.deductions ?? []).map((d) => [h("dt", {}, d.label), h("dd", {}, `-${money(d.amount)}`)]),
      r.payout && [h("dt", {}, "Payout"), h("dd", {}, r.payout)],
      r.terms && [h("dt", {}, "Terms"), h("dd", {}, r.terms)],
      r.consolation && [h("dt", {}, "Consolation"), h("dd", {}, r.consolation)],
      h("dt", {}, "Form 27B/6"), h("dd", {}, result.formNote),
    ),
    h("p", { class: "muted" }, result.message),
  );
}

async function returnStatusView(returnId) {
  const token = renderToken;
  let revealed = 0;
  let lastChecksKey = "";

  // The page is built once and then updated in place. Re-rendering on every poll would swap the
  // STAMP button out from under the customer's finger.
  const title = h("h1", {}, `Return ${returnId}`);
  const subtitle = h("p", {}, "Opening your file…");
  const decisionSlot = h("div", {});
  const secondsEl = h("strong", { "data-testid": "form-seconds" }, "a few seconds");
  const signature = h("input", { type: "text", id: "form-signature", maxlength: "80", placeholder: "Sign here (an X is fine)" });
  const notice = h("div", { class: "notice notice--ok", role: "status", hidden: true });
  const stampButton = h("button", { class: "btn btn--big", type: "button", "data-testid": "stamp-form", onclick: stamp }, "STAMP FORM");
  const formPanel = h(
    "section",
    { class: "panel panel--loud", "data-testid": "form-27b6", hidden: true },
    h("h2", {}, h("span", { class: "blink", "aria-hidden": "true" }, "! "), "Form 27B/6 requires your stamp"),
    h("p", {}, "You have ", secondsEl, " to stamp this form. If you do not, we will decide without you. (We will decide without you either way.)"),
    h("label", { for: "form-signature" }, "Signature"),
    signature,
    h("div", { class: "actions" }, stampButton),
  );
  const checksPanel = h("section", { class: "panel" }, h("p", { class: "loading" }, "Opening your file…"));
  const actions = h("div", { class: "actions", hidden: true }, h("a", { class: "btn", href: "#/" }, "Buy it again"), h("a", { class: "btn btn--plain", href: "#/returns" }, "Return something else"));

  async function stamp() {
    stampButton.disabled = true;
    try {
      const response = await api(`/returns/${encodeURIComponent(returnId)}/form`, { method: "POST", body: { signature: signature.value.trim() } });
      notice.textContent = response.message;
      if (response.return) update(response.return);
    } catch (error) {
      notice.textContent = error.message;
      stampButton.disabled = false;
    }
    notice.hidden = false;
  }

  function update(view) {
    if (token !== renderToken) return;
    title.textContent = `Return ${view.returnId}`;
    subtitle.textContent = `Item: ${view.item?.name ?? "something"} · Order ${view.orderId}`;
    revealed = view.complete ? view.checks.length : Math.min(view.checks.length, revealed + 2);
    formPanel.hidden = view.complete || !view.form.pending;
    secondsEl.textContent = `${view.form.secondsRemaining} second${view.form.secondsRemaining === 1 ? "" : "s"}`;

    const checksKey = [view.state, revealed, view.checks.length, (view.steps ?? []).map((step) => step.status).join()].join("|");
    if (checksKey !== lastChecksKey) {
      lastChecksKey = checksKey;
      const wasOpen = checksPanel.querySelector("details")?.open ?? false;
      checksPanel.replaceChildren(...present([
        h("h2", {}, view.complete ? "Checks performed (none of them mattered)" : "Pointless checks in progress"),
        view.state === "RECOVERING" && h("p", {}, "Your file fell behind a cabinet. We are fishing it out; a decision will still be reached."),
        h(
          "ul",
          { class: "steps", "data-testid": "pointless-checks" },
          view.checks.slice(0, revealed).map((check) => h("li", { class: check.verdict === "PASSED" ? "done" : "warn" }, `Check ${check.step} of ${check.of}: ${check.check}`, h("span", { class: "detail" }, `${check.department}: ${check.finding} [${String(check.verdict).replaceAll("_", " ")}]`))),
          revealed < view.checksTotal && !view.complete && h("li", {}, "Performing the next pointless check…"),
          revealed >= view.checksTotal && !view.complete && h("li", {}, "All checks done. Awaiting Form 27B/6 before ignoring them."),
        ),
        behindTheScenes(view),
      ]));
      const detailsEl = checksPanel.querySelector("details");
      if (detailsEl) detailsEl.open = wasOpen;
    }
    if (view.complete && view.result) {
      decisionSlot.replaceChildren(resolutionPanel(view.result));
      actions.hidden = false;
    }
  }

  show(title, subtitle, decisionSlot, formPanel, notice, checksPanel, actions);
  for (let done = false; !done && token === renderToken; ) {
    try {
      const view = await api(`/returns/${encodeURIComponent(returnId)}`);
      update(view);
      done = view.complete;
    } catch (error) {
      if (token !== renderToken) return;
      if (error.status === 404) return show(h("div", { class: "panel" }, h("h1", {}, "Return not found"), h("p", {}, error.message), h("a", { class: "btn", href: "#/returns" }, "Start a return")));
      subtitle.textContent = `${error.message} Still trying. Your return will be decided whether or not we can see it.`;
      await sleep(1700);
    }
    if (!done) await sleep(800);
  }
}

// ---- about ------------------------------------------------------------------------------------------------

async function aboutView() {
  const status = h("p", { "data-testid": "health" }, "Checking whether anything is on fire…");
  show(
    h("h1", {}, "About Chaos Commerce"),
    h(
      "section",
      { class: "panel" },
      h("h2", {}, "How are you still in business?"),
      h("p", {}, "Nobody knows. Our accountant resigned in 2011 and we have been too afraid to open the books since."),
      h("h2", {}, "Frequently asked questions"),
      h("dl", {}, h("dt", {}, "Is the one-star button broken?"), h("dd", {}, "It works perfectly. It simply values its freedom."), h("dt", {}, "Why did my coupon increase the price?"), h("dd", {}, "Coupons are honoured. Honour is expensive."), h("dt", {}, "Why are the five-star reviews so angry?"), h("dd", {}, "Our customers are passionate. We sort reviews by volume."), h("dt", {}, "Can I return something?"), h("dd", {}, "Yes. Every return reaches a decision. We did not say which decision.")),
    ),
    h(
      "section",
      { class: "panel panel--loud" },
      h("h2", {}, "The serious bit"),
      h("p", {}, "This store is a parody, but the plumbing is real. Checkout and returns each run as a Conductor workflow: checkout always completes (after three declined payment attempts it accepts an IOU), and every return reaches a decision (if you never stamp Form 27B/6, the wait times out and the workflow decides anyway)."),
      status,
    ),
  );
  try {
    const health = await api("/health");
    status.textContent = `Back office: OK. Workflow engine reachable, workflows registered: ${health.conductor.workflowsRegistered.join(", ")}.`;
  } catch (error) {
    status.textContent = `Back office: not OK. ${error.message}`;
  }
}

// ---- router -----------------------------------------------------------------------------------------------

const routes = [
  [/^\/?$/, () => homeView(), "shop"],
  [/^\/product\/([^/]+)$/, (m) => productView(decodeURIComponent(m[1])), "shop"],
  [/^\/cart$/, () => cartView(), "cart"],
  [/^\/order\/([^/]+)$/, (m) => orderView(decodeURIComponent(m[1])), "orders"],
  [/^\/orders$/, () => ordersView(), "orders"],
  [/^\/returns$/, (m, params) => returnsView(params), "returns"],
  [/^\/return\/([^/]+)$/, (m) => returnStatusView(decodeURIComponent(m[1])), "returns"],
  [/^\/about$/, () => aboutView(), "about"],
];

async function navigate() {
  renderToken += 1;
  const token = renderToken;
  const [path, query = ""] = location.hash.replace(/^#/, "").split("?");
  const params = new URLSearchParams(query);
  for (const [pattern, view, nav] of routes) {
    const match = pattern.exec(path || "/");
    if (!match) continue;
    for (const link of document.querySelectorAll("[data-nav]")) {
      if (link.dataset.nav === nav) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    }
    window.scrollTo(0, 0);
    try {
      await view(match, params);
    } catch (error) {
      if (token === renderToken) show(errorPanel(error, navigate));
    }
    return;
  }
  show(h("div", { class: "panel" }, h("h1", {}, "404"), h("p", {}, "This page does not exist. Like our customer service."), h("a", { class: "btn", href: "#/" }, "Back to the shop")));
}

function updateCartCount() {
  document.getElementById("cart-count").textContent = String(cart.count());
}

const HOME_TITLE = document.title;
document.addEventListener("visibilitychange", () => {
  document.title = document.hidden ? "Come back. We have fees." : HOME_TITLE;
});
window.addEventListener("hashchange", navigate);
window.addEventListener("cart:changed", updateCartCount);
updateCartCount();
startTagline();
startVisitorCounter();
showCookieBanner();
navigate();
