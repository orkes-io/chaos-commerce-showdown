// Checkout form, the wait for the checkout workflow, and the receipt.

import { ApiError, api, h, money, newToken, remember, save, sleep, state } from "./lib.js";

const RETRY_DELAYS = [1500, 3000, 5000, 8000];

function radioGroup(name, legend, options, describe) {
  return h("fieldset", {},
    h("legend", {}, legend),
    options.map((option, index) =>
      h("label", { class: "radio" },
        h("input", { type: "radio", name, value: option.id, checked: index === 0 }),
        h("span", {}, h("strong", {}, option.label), describe ? h("small", {}, describe(option)) : null),
      ),
    ),
  );
}

export function checkoutView(catalog, navigate) {
  const lines = Object.entries(state.cart)
    .map(([id, qty]) => ({ product: catalog.products.find((item) => item.id === id), qty }))
    .filter((line) => line.product);
  const subtotal = lines.reduce((sum, line) => sum + line.qty * line.product.priceCents, 0);

  const status = h("div", { class: "panel checkout-status", role: "status", hidden: true });
  const submit = h("button", { type: "submit", class: "btn btn-buy btn-big" }, "Pay (allegedly)");

  // Sends the order and keeps at it until the checkout workflow has finished.
  // The same client token is reused on every retry, so the backend returns the
  // order already started instead of creating a second one.
  async function placeOrder(payload) {
    let failures = 0;
    for (;;) {
      try {
        let result = await api("/checkout", { method: "POST", body: payload });
        while (result.state === "PROCESSING") {
          status.replaceChildren(h("p", {}, "⏳ Your order is being processed by our finest available machinery..."));
          await sleep(1000);
          result = await api(`/checkout/${result.workflowId}`);
        }
        return result;
      } catch (error) {
        const retryable = !(error instanceof ApiError) || error.retryable;
        if (!retryable || failures >= RETRY_DELAYS.length) throw error;
        const delay = RETRY_DELAYS[failures++];
        status.replaceChildren(
          h("p", {}, `😬 ${error.message}`),
          h("p", {}, `Your cart is safe. Trying again in ${Math.round(delay / 1000)} seconds (attempt ${failures + 1})...`),
        );
        await sleep(delay);
      }
    }
  }

  async function onSubmit(event) {
    event.preventDefault();
    const data = new FormData(event.target);
    state.checkoutToken ??= newToken();
    save();
    const payload = {
      clientToken: state.checkoutToken,
      items: lines.map((line) => ({ id: line.product.id, qty: line.qty })),
      customer: { name: data.get("name"), email: data.get("email") },
      coupon: data.get("coupon"),
      shipping: data.get("shipping"),
      payment: data.get("payment"),
    };
    submit.disabled = true;
    status.hidden = false;
    status.replaceChildren(h("p", {}, "⏳ Contacting the back office..."));
    try {
      const result = await placeOrder(payload);
      if (result.state !== "COMPLETED") {
        status.replaceChildren(
          h("p", {}, "🧯 This order could not be finished automatically and needs a person to look at it."),
          h("p", { class: "fine-print" }, `Reference: ${result.workflowId}`),
        );
        return;
      }
      remember("orders", {
        workflowId: result.workflowId,
        orderId: result.receipt.orderId,
        placedAt: result.receipt.placedAt,
        totalCents: result.receipt.totalCents,
        lines: result.receipt.lines.map(({ id, name, emoji, qty }) => ({ id, name, emoji, qty })),
      });
      state.cart = {};
      state.checkoutToken = null;
      save();
      sessionStorage.setItem("chaos-commerce:fresh-order", result.workflowId);
      navigate(`#/order/${result.workflowId}`);
    } catch (error) {
      submit.disabled = false;
      status.replaceChildren(
        h("p", {}, `💥 ${error.message}`),
        h("p", {}, "Your cart and your order details are still here. Press the button to try again; you will not be charged twice (or, strictly speaking, once)."),
      );
    }
  }

  return h("section", {},
    h("h1", {}, "Checkout"),
    h("form", { class: "checkout-form", onSubmit },
      h("div", { class: "panel" },
        h("h2", {}, "Your order"),
        lines.length === 0
          ? h("p", {}, "Nothing. You are buying nothing. An Empty Cart Handling Fee applies.")
          : h("ul", { class: "plain-list" }, lines.map((line) =>
              h("li", {}, `${line.product.emoji} ${line.qty} × ${line.product.name} `, h("strong", {}, money(line.qty * line.product.priceCents))))),
        h("p", { class: "cart-total" }, "Subtotal: ", h("strong", {}, money(subtotal)), " + fees (surprise!)"),
      ),
      h("div", { class: "panel" },
        h("h2", {}, "About you"),
        h("p", { class: "warning" }, "⚠️ This is a parody store. Do not enter real personal or payment details. We never ask for a card number; we have lost too many."),
        h("label", { for: "co-name" }, "Name (any name)"),
        h("input", { id: "co-name", name: "name", maxLength: 80, autocomplete: "off", placeholder: "Valued Customer #7" }),
        h("label", { for: "co-email" }, "Email (optional; we will lose it)"),
        h("input", { id: "co-email", name: "email", type: "email", maxLength: 120, autocomplete: "off", placeholder: "nobody@example.com" }),
        h("label", { for: "co-coupon" }, "Coupon code"),
        h("input", { id: "co-coupon", name: "coupon", maxLength: 40, autocomplete: "off", placeholder: "e.g. SAVE10" }),
        h("small", {}, "Coupons are a premium feature. Using one costs 10% extra."),
      ),
      h("div", { class: "panel" },
        radioGroup("shipping", "Shipping method", catalog.shippingOptions, (option) => ` ${money(option.priceCents)} - ${option.eta}`),
      ),
      h("div", { class: "panel" },
        radioGroup("payment", "Payment method", catalog.paymentMethods),
        h("small", {}, "If your payment method is declined we will keep trying other ones until something works."),
      ),
      submit,
      status,
    ),
  );
}

// ---- receipt ---------------------------------------------------------------

function receiptBody(result, catalog, animate) {
  const receipt = result.receipt;
  const attempts = receipt.payment?.attempts ?? [];
  const attemptItems = attempts.map((attempt) =>
    h("li", { class: attempt.approved ? "attempt ok" : "attempt bad", hidden: animate },
      h("strong", {}, `Attempt ${attempt.attempt}: ${attempt.processor}`), ` - ${attempt.message}`));
  const settled = h("p", { class: "settled", hidden: animate }, `✅ Paid via: ${receipt.payment?.settledBy}`);
  if (animate) {
    // Replays the payment saga the workflow went through, one attempt at a time.
    (async () => {
      for (const item of attemptItems) {
        await sleep(700);
        item.hidden = false;
      }
      await sleep(400);
      settled.hidden = false;
    })();
  }
  const returnable = new Set(catalog.products.map((product) => product.id));

  return [
    h("div", { class: "panel receipt" },
      h("h1", {}, receipt.rescued ? "Order confirmed (the hard way)" : "Order confirmed!!!"),
      h("p", {}, receipt.message),
      receipt.rescued ? h("p", { class: "warning" }, "Our checkout fell over part-way, so a backup process completed your order with all fees waived.") : null,
      h("dl", { class: "facts" },
        h("dt", {}, "Order number"), h("dd", {}, receipt.orderId),
        h("dt", {}, "Customer"), h("dd", {}, receipt.customer?.name),
        h("dt", {}, "Placed"), h("dd", {}, receipt.placedAt),
        h("dt", {}, "Shipping"), h("dd", {}, `${receipt.shipping?.method} - ${receipt.shipping?.eta}`),
        h("dt", {}, "Tracking"), h("dd", {}, receipt.shipping?.trackingNumber),
        h("dt", {}, "Loyalty points earned"), h("dd", {}, receipt.loyaltyPoints),
      ),
      h("h2", {}, "Items"),
      receipt.lines.length === 0 ? h("p", {}, "None. You bought nothing, successfully.") : null,
      h("ul", { class: "plain-list" }, receipt.lines.map((line) =>
        h("li", { class: "receipt-line" },
          h("span", {}, `${line.emoji} ${line.qty} × ${line.name} `, h("strong", {}, money(line.qty * line.unitPriceCents))),
          h("small", {}, `Warehouse says: ${line.fulfilment}`),
          returnable.has(line.id)
            ? h("a", { class: "link-btn", href: `#/returns?order=${result.workflowId}&item=${line.id}` }, "Return this")
            : null,
        ))),
      h("h2", {}, "The damage"),
      h("table", { class: "charges" },
        h("tbody", {},
          h("tr", {}, h("td", {}, "Subtotal"), h("td", {}, money(receipt.subtotalCents))),
          receipt.charges.map((charge) =>
            h("tr", {}, h("td", {}, charge.label, h("small", {}, charge.note)), h("td", {}, money(charge.amountCents)))),
          h("tr", { class: "grand-total" }, h("td", {}, "TOTAL"), h("td", {}, money(receipt.totalCents))),
        ),
      ),
      h("h2", {}, "Payment"),
      attempts.length === 0 ? h("p", {}, "No payment attempts were needed.") : h("ol", { class: "plain-list attempts" }, attemptItems),
      settled,
      h("p", { class: "fine-print" }, "No money changed hands. This is a parody store."),
      result.conductorUrl
        ? h("p", { class: "fine-print" }, h("a", { href: result.conductorUrl, target: "_blank", rel: "noopener" }, "See how this order was processed (Conductor workflow)"))
        : null,
    ),
    h("a", { class: "btn", href: "#/" }, "Buy more things"), " ",
    h("a", { class: "btn", href: "#/regrets" }, "My regrets"),
  ];
}

export function orderView(catalog, workflowId) {
  const container = h("section", {}, h("p", { class: "panel", role: "status" }, "⏳ Looking for your order in the filing cabinet..."));
  const animate = sessionStorage.getItem("chaos-commerce:fresh-order") === workflowId;
  sessionStorage.removeItem("chaos-commerce:fresh-order");

  (async () => {
    try {
      let result = await api(`/checkout/${encodeURIComponent(workflowId)}`);
      while (result.state === "PROCESSING" && container.isConnected) {
        await sleep(1500);
        result = await api(`/checkout/${encodeURIComponent(workflowId)}`);
      }
      if (!container.isConnected) return;
      if (result.state === "COMPLETED") container.replaceChildren(...receiptBody(result, catalog, animate));
      else {
        container.replaceChildren(h("div", { class: "panel" },
          h("h1", {}, "This order needs a person"),
          h("p", {}, "It could not be finished automatically. Someone has to look at it."),
          h("p", { class: "fine-print" }, `Reference: ${result.workflowId}`)));
      }
    } catch (error) {
      if (!container.isConnected) return;
      container.replaceChildren(h("div", { class: "panel" },
        h("h1", {}, error.status === 404 ? "Order not found" : "We can't reach the filing cabinet"),
        h("p", {}, error.status === 404 ? "We have no record of that order, which is consistent with our record-keeping." : error.message),
        h("a", { class: "btn", href: error.status === 404 ? "#/" : location.hash, onClick: () => error.status !== 404 && location.reload() }, error.status === 404 ? "Back to the shop" : "Try again")));
    }
  })();
  return container;
}
