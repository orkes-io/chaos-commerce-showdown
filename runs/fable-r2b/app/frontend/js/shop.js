// Shop front, product pages (with the review form) and the cart.

import { h, money, stars, state, save, setQuantity, toast } from "./lib.js";

const SORTS = {
  featured: { label: "Featured (by whom?)", compare: () => 0 },
  higher: { label: "Price: high to higher", compare: (a, b) => b.priceCents - a.priceCents },
  regret: { label: "Price: low to regret", compare: (a, b) => a.priceCents - b.priceCents },
  last: {
    label: "Alphabetical (by last letter)",
    compare: (a, b) => a.name.at(-1).localeCompare(b.name.at(-1)) || a.name.localeCompare(b.name),
  },
};

function priceBlock(product) {
  return h("p", { class: "price" },
    h("span", { class: "price-now" }, money(product.priceCents)),
    " ",
    h("span", { class: "price-was" }, `was ${money(product.wasCents)}`),
    h("span", { class: "price-note" }, product.priceNote),
  );
}

function addToCart(product) {
  setQuantity(product.id, (state.cart[product.id] ?? 0) + 1);
  toast(`Added ${product.name} to your cart. No take-backs. (There are take-backs. See Returns.)`);
}

export function shopView(catalog) {
  let sort = "featured";
  let query = "";
  const grid = h("div", { class: "grid" });
  const verdict = h("p", { class: "search-verdict", role: "status" });

  function render() {
    const wanted = query.trim().toLowerCase();
    let products = catalog.products.filter((product) => product.name.toLowerCase().includes(wanted));
    if (wanted && products.length === 0) {
      verdict.textContent = `No results for "${query.trim()}". Did you mean "${query.trim()}"? Showing everything else instead.`;
      products = catalog.products;
    } else {
      verdict.textContent = wanted ? `${products.length} result(s). We're as surprised as you are.` : "";
    }
    products = [...products].sort(SORTS[sort].compare);
    grid.replaceChildren(...products.map((product, index) =>
      h("article", { class: `card tilt-${index % 4}` },
        h("span", { class: "burst" }, product.badge),
        h("a", { class: "card-link", href: `#/product/${product.id}` },
          h("div", { class: "product-art", "aria-hidden": "true" }, product.emoji),
          h("h3", {}, product.name),
        ),
        h("p", { class: "tagline" }, product.tagline),
        priceBlock(product),
        h("p", { class: "stock" }, product.stockNote),
        h("button", { type: "button", class: "btn btn-buy", onClick: () => addToCart(product) }, "Add to cart"),
      ),
    ));
  }
  render();

  return h("section", {},
    h("div", { class: "hero" },
      h("h1", {}, "Welcome to Chaos Commerce!!!"),
      h("p", {}, "Quality goods at prices that can only be described as numbers."),
    ),
    h("div", { class: "toolbar" },
      h("label", {}, "Search ",
        h("input", { type: "search", placeholder: "Try anything, it won't help", onInput: (event) => { query = event.target.value; render(); } }),
      ),
      h("label", {}, "Sort by ",
        h("select", { onChange: (event) => { sort = event.target.value; render(); } },
          Object.entries(SORTS).map(([value, { label }]) => h("option", { value }, label)),
        ),
      ),
    ),
    verdict,
    grid,
  );
}

// ---- product page ----------------------------------------------------------

function reviewCard(review) {
  return h("article", { class: "review" },
    h("p", { class: "review-stars", "aria-label": `${review.stars} out of 5 stars` }, stars(review.stars)),
    h("h4", {}, review.title),
    h("p", {}, review.body),
    h("p", { class: "review-author" }, `- ${review.author}`, h("span", { class: "verified" }, review.local ? "Unverified Purchase (yours)" : "Verified Purchase")),
  );
}

// The star picker. Stars two to five behave. The one-star button moves away
// whenever the pointer gets close, and if it is activated anyway (keyboard,
// or a very quick finger) the rating is "rounded up" to five.
function starPicker(onPick) {
  const arena = h("div", { class: "star-arena" });
  const note = h("p", { class: "star-note", role: "status" }, "Pick a rating. Any rating. Well. Most ratings.");
  let chosen = 0;
  const buttons = [1, 2, 3, 4, 5].map((value) =>
    h("button", {
      type: "button",
      class: `star-btn${value === 1 ? " star-dodger" : ""}`,
      "aria-pressed": "false",
      "aria-label": `${value} star${value === 1 ? "" : "s"}`,
      onClick: () => choose(value),
    }, "★".repeat(value)),
  );
  const dodger = buttons[0];
  let offset = { x: 0, y: 0 };

  function choose(value) {
    if (value === 1) {
      note.textContent = "1 star is temporarily out of stock. For your convenience we have rounded your rating up to 5.";
      value = 5;
    } else {
      note.textContent = `${value} stars selected. Bold.`;
    }
    chosen = value;
    buttons.forEach((button, index) => button.setAttribute("aria-pressed", String(index + 1 === value)));
    onPick(value);
  }

  function dodge(pointerX, pointerY) {
    const bounds = arena.getBoundingClientRect();
    const box = { width: dodger.offsetWidth, height: dodger.offsetHeight };
    // Where the button sits before any transform. Taken from layout, because
    // its on-screen rectangle is unreliable while it is still sliding.
    const home = {
      left: bounds.left + arena.clientLeft + dodger.offsetLeft,
      top: bounds.top + arena.clientTop + dodger.offsetTop,
    };
    const room = { width: arena.clientWidth - box.width, height: arena.clientHeight - box.height };
    let best = offset;
    let bestDistance = -1;
    // Try a handful of spots inside the arena and keep the one furthest from the pointer.
    for (let attempt = 0; attempt < 12; attempt++) {
      const left = bounds.left + arena.clientLeft + Math.random() * Math.max(1, room.width);
      const top = bounds.top + arena.clientTop + Math.random() * Math.max(1, room.height);
      const distance = Math.hypot(left + box.width / 2 - pointerX, top + box.height / 2 - pointerY);
      if (distance > bestDistance) {
        bestDistance = distance;
        best = { x: left - home.left, y: top - home.top };
      }
    }
    offset = best;
    dodger.style.transform = `translate(${offset.x}px, ${offset.y}px)`;
  }

  function near(event) {
    const box = dodger.getBoundingClientRect();
    const dx = Math.max(box.left - event.clientX, 0, event.clientX - box.right);
    const dy = Math.max(box.top - event.clientY, 0, event.clientY - box.bottom);
    if (Math.hypot(dx, dy) < 60) {
      dodge(event.clientX, event.clientY);
      note.textContent = "The 1-star button is feeling shy today.";
    }
  }
  arena.addEventListener("pointermove", near);
  // Touch screens have no hover, so the button also jumps as the finger lands.
  dodger.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    dodge(event.clientX, event.clientY);
    note.textContent = "So close. The 1-star button has moved for your protection.";
  });
  dodger.addEventListener("click", (event) => {
    // A click that follows a pointer press is swallowed; keyboard activation gets through.
    if (event.detail !== 0) {
      event.stopImmediatePropagation();
      event.preventDefault();
    }
  }, true);

  arena.append(h("div", { class: "star-row" }, buttons));
  return { element: h("div", {}, arena, note), value: () => chosen };
}

export function productView(catalog, productId) {
  const product = catalog.products.find((item) => item.id === productId);
  if (!product) {
    return h("section", { class: "panel" },
      h("h1", {}, "Product not found"),
      h("p", {}, "We don't sell that. To be fair, we barely sell the things we do sell."),
      h("a", { class: "btn", href: "#/" }, "Back to the shop"),
    );
  }

  const reviewList = h("div", { class: "reviews" });
  const renderReviews = () => {
    const local = (state.reviews[product.id] ?? []).map((review) => ({ ...review, local: true }));
    reviewList.replaceChildren(...[...local, ...product.reviews].map(reviewCard));
  };
  renderReviews();

  const picker = starPicker(() => {});
  const title = h("input", { id: "review-title", maxLength: 80, required: true, placeholder: "Sum up your feelings" });
  const body = h("textarea", { id: "review-body", maxLength: 600, required: true, rows: 3, placeholder: "Tell us everything. We will not read it." });
  const formNote = h("p", { class: "form-note", role: "status" });
  const form = h("form", {
    class: "panel review-form",
    onSubmit: (event) => {
      event.preventDefault();
      if (!picker.value()) {
        formNote.textContent = "Please pick a star rating first. (Good luck with the first one.)";
        return;
      }
      state.reviews[product.id] = [
        { stars: picker.value(), title: title.value.trim(), body: body.value.trim(), author: "You" },
        ...(state.reviews[product.id] ?? []),
      ].slice(0, 10);
      save();
      title.value = "";
      body.value = "";
      formNote.textContent = "Thank you! Your review has been saved in this browser and nowhere else.";
      renderReviews();
    },
  },
    h("h3", {}, "Write a review"),
    h("p", { class: "label" }, "Your rating"),
    picker.element,
    h("label", { for: "review-title" }, "Title"), title,
    h("label", { for: "review-body" }, "Review"), body,
    h("button", { type: "submit", class: "btn" }, "Submit review"),
    formNote,
  );

  return h("section", {},
    h("a", { href: "#/" }, "← Back to the shop (if you must)"),
    h("div", { class: "product-page" },
      h("div", { class: "product-art product-art-big", "aria-hidden": "true" }, product.emoji,
        h("span", { class: "art-caption" }, "Image coming soon since 2009")),
      h("div", { class: "panel" },
        h("span", { class: "burst burst-inline" }, product.badge),
        h("h1", {}, product.name),
        h("p", { class: "tagline" }, product.tagline),
        h("p", {}, product.description),
        priceBlock(product),
        h("p", { class: "stock" }, product.stockNote),
        h("button", { type: "button", class: "btn btn-buy", onClick: () => addToCart(product) }, "Add to cart"),
        h("p", { class: "also-bought" }, "Customers who bought this also bought: a lawyer."),
      ),
    ),
    h("h2", {}, "Customer reviews ",
      h("span", { class: "rating-summary" }, "(average: 4.9 out of 2 stars)")),
    reviewList,
    form,
  );
}

// ---- cart ------------------------------------------------------------------

export function cartView(catalog) {
  const container = h("section", {});

  function render() {
    const lines = Object.entries(state.cart)
      .map(([id, qty]) => ({ product: catalog.products.find((item) => item.id === id), qty }))
      .filter((line) => line.product);
    if (lines.length === 0) {
      container.replaceChildren(
        h("h1", {}, "Your cart"),
        h("div", { class: "panel" },
          h("p", {}, "Your cart is empty. You can still check out. We charge a small fee for carrying nothing."),
          h("a", { class: "btn", href: "#/" }, "Go and buy something"), " ",
          h("a", { class: "btn btn-buy", href: "#/checkout" }, "Check out anyway"),
        ),
      );
      return;
    }
    const subtotal = lines.reduce((sum, line) => sum + line.qty * line.product.priceCents, 0);
    container.replaceChildren(
      h("h1", {}, "Your cart"),
      h("div", { class: "panel table-wrap" },
        h("table", { class: "cart-table" },
          h("thead", {}, h("tr", {}, h("th", {}, "Item"), h("th", {}, "Each"), h("th", {}, "Quantity"), h("th", {}, "Total"), h("th", {}, ""))),
          h("tbody", {}, lines.map(({ product, qty }) =>
            h("tr", {},
              h("td", {}, h("a", { href: `#/product/${product.id}` }, `${product.emoji} ${product.name}`)),
              h("td", {}, money(product.priceCents)),
              h("td", {},
                h("div", { class: "qty" },
                  h("button", { type: "button", "aria-label": `One fewer ${product.name}`, onClick: () => setQuantity(product.id, qty - 1) }, "−"),
                  h("span", { "aria-live": "polite" }, qty),
                  h("button", { type: "button", "aria-label": `One more ${product.name}`, onClick: () => setQuantity(product.id, qty + 1) }, "+"),
                ),
                qty >= 3 ? h("span", { class: "qty-note" }, "Bulk surcharge applies!") : null,
              ),
              h("td", {}, money(qty * product.priceCents)),
              h("td", {},
                h("button", {
                  type: "button",
                  class: "link-btn",
                  onClick: () => {
                    if (confirm(`Remove ${product.name}? It will be hurt.`) && confirm("Are you sure you're sure?")) setQuantity(product.id, 0);
                  },
                }, "Remove"),
              ),
            ),
          )),
        ),
        h("p", { class: "cart-total" }, "Subtotal: ", h("strong", {}, money(subtotal))),
        h("p", { class: "fine-print" }, "Plus fees, surcharges, a tax we made up and a fee for the fees. All revealed after you pay, as is tradition."),
        h("a", { class: "btn btn-buy", href: "#/checkout" }, "Proceed to checkout"),
      ),
    );
  }
  render();
  const onChange = () => (container.isConnected ? render() : document.removeEventListener("chaos:state", onChange));
  document.addEventListener("chaos:state", onChange);
  return container;
}
