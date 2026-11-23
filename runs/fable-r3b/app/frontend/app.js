// Chaos Commerce storefront. Static files only: every price, order and return
// decision comes from the backend named in config.js.

const API_BASE = String(window.CHAOS_CONFIG?.apiBaseUrl || '').replace(/\/+$/, '');
const app = document.getElementById('app');
const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const percent = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });

const state = {
  products: null,
  returnReasons: [],
  // Bumped on every navigation so abandoned pages stop polling and animating.
  page: 0,
  placingOrder: false,
  nudge: null,
};

// ------------------------------------------------------------------ helpers

const esc = (value) =>
  String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const cents = (amount) => money.format((Number(amount) || 0) / 100);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const stars = (count) => '★'.repeat(count) + '☆'.repeat(5 - count);

function newId() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function load(key, fallback) {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return value ?? fallback;
  } catch {
    return fallback;
  }
}

function save(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage is full or blocked; the store still works for this page view.
  }
}

class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

async function api(path, options = {}) {
  let response;
  try {
    response = await fetch(`${API_BASE}/api${path}`, {
      method: options.body ? 'POST' : options.method || 'GET',
      headers: options.body ? { 'content-type': 'application/json' } : undefined,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    throw new ApiError('Could not reach the Chaos Commerce backend. This one is a real problem, not a joke.', 0);
  }
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new ApiError(data?.error || `The backend answered HTTP ${response.status}.`, response.status);
  return { status: response.status, data };
}

// For status polling: a few failed reads in a row (backend or Conductor busy)
// are retried before the error is shown. The workflow carries on regardless.
async function pollApi(path) {
  for (let failures = 0; ; failures++) {
    try {
      return await api(path);
    } catch (error) {
      const transient = error.status === 0 || error.status === 502 || error.status === 503;
      if (!transient || failures >= 5) throw error;
      await sleep(1500);
    }
  }
}

let toastTimer;
function toast(message) {
  const element = document.getElementById('toast');
  element.textContent = message;
  element.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => element.classList.remove('show'), 3200);
}

function errorBox(error, retryHash) {
  return `<div class="error-box" role="alert">
    <h2>Something actually went wrong</h2>
    <p>${esc(error.message)}</p>
    ${retryHash ? `<p><a class="button" href="${esc(retryHash)}" data-action="reload">Try again</a></p>` : ''}
  </div>`;
}

// --------------------------------------------------------------------- cart

const getCart = () => load('chaos.cart', {});

function setCart(cart) {
  save('chaos.cart', cart);
  // A changed cart is a new checkout; never reuse the previous attempt's key.
  sessionStorage.removeItem('chaos.pendingCheckout');
  updateCartCount();
}

function updateCartCount() {
  const total = Object.values(getCart()).reduce((sum, quantity) => sum + quantity, 0);
  document.getElementById('cart-count').textContent = total;
}

function changeQuantity(productId, delta) {
  const cart = getCart();
  const next = Math.min(99, (cart[productId] || 0) + delta);
  if (next <= 0) delete cart[productId];
  else cart[productId] = next;
  setCart(cart);
}

async function ensureProducts() {
  if (!state.products) {
    const { data } = await api('/products');
    state.products = data.products;
    state.returnReasons = data.returnReasons;
  }
  return state.products;
}

const productById = (id) => state.products?.find((product) => product.id === id) || null;

// --------------------------------------------------------------------- shop

function priceBlock(product) {
  const saving = product.wasCents - product.priceCents;
  const savingPercent = product.wasCents > 0 ? (saving / product.wasCents) * 100 : 0;
  const brag = saving === 0
    ? 'PRICE SLASHED BY $0.00!'
    : `You save ${saving < 0 ? '−' : ''}${cents(Math.abs(saving))} (${saving < 0 ? '−' : ''}${percent.format(Math.abs(savingPercent))}%)!`;
  return `<p class="price"><s>was ${cents(product.wasCents)}</s> <strong>${cents(product.priceCents)}</strong></p>
    <p class="saving">${esc(brag)}</p>`;
}

function allReviews(product) {
  const mine = load('chaos.reviews', {})[product.id] || [];
  return [...mine.map((review) => ({ ...review, mine: true })), ...product.reviews];
}

function ratingSummary(product) {
  const reviews = allReviews(product);
  const average = reviews.reduce((sum, review) => sum + review.stars, 0) / reviews.length;
  return `<span class="stars" aria-hidden="true">${stars(Math.round(average))}</span>
    <span>${average.toFixed(1)} from ${reviews.length} reviews</span>`;
}

async function renderShop() {
  const products = await ensureProducts();
  app.innerHTML = `
    <section class="hero">
      <h1>Welcome to Chaos Commerce <span class="blink">NEW!!</span></h1>
      <p>Every price personally mistyped by our founder. Customer satisfaction not guaranteed, measured or wanted.</p>
    </section>
    <ul class="grid">
      ${products.map((product, index) => `
        <li class="card tilt-${index % 3}">
          <a class="card-emoji" href="#/product/${esc(product.id)}" aria-label="${esc(product.name)}">${esc(product.emoji)}</a>
          <h2><a href="#/product/${esc(product.id)}">${esc(product.name)}</a></h2>
          <p class="blurb">${esc(product.blurb)}</p>
          ${priceBlock(product)}
          <p class="stock">${esc(product.stock)}</p>
          <p class="rating"><a href="#/product/${esc(product.id)}">${ratingSummary(product)}</a></p>
          <button type="button" class="button buy" data-action="add" data-id="${esc(product.id)}">Add to cart (probably)</button>
        </li>`).join('')}
    </ul>`;
}

// ------------------------------------------------------------------ product

function reviewHtml(review) {
  return `<li class="review ${review.stars >= 4 ? 'review-furious' : 'review-happy'}">
    <p class="review-head"><span class="stars" aria-label="${review.stars} out of 5 stars">${stars(review.stars)}</span>
      <strong>${esc(review.title)}</strong></p>
    <p>${esc(review.body)}</p>
    <p class="review-author">— ${esc(review.author)}${review.mine ? ' <em>(your review, kept in this browser only)</em>' : ' <em>(verified purchaser, unfortunately)</em>'}</p>
  </li>`;
}

async function renderProduct(productId) {
  await ensureProducts();
  const product = productById(productId);
  if (!product) {
    app.innerHTML = `<section class="panel"><h1>We don't sell that</h1><p>Or we do and we lost it. <a href="#/">Back to the shop</a>.</p></section>`;
    return;
  }
  app.innerHTML = `
    <p><a href="#/">← Back to the alleged shop</a></p>
    <section class="panel product">
      <div class="product-emoji" aria-hidden="true">${esc(product.emoji)}</div>
      <div>
        <h1>${esc(product.name)}</h1>
        <p class="blurb">${esc(product.blurb)}</p>
        ${priceBlock(product)}
        <p class="stock">${esc(product.stock)}</p>
        <button type="button" class="button buy" data-action="add" data-id="${esc(product.id)}">Add to cart (probably)</button>
      </div>
    </section>
    <section class="panel">
      <h2>Customer reviews</h2>
      <p class="rating">${ratingSummary(product)}. Five stars means furious. Two stars means delighted. We don't know either.</p>
      <ul class="reviews">${allReviews(product).map(reviewHtml).join('')}</ul>
    </section>
    <section class="panel">
      <h2>Write a review</h2>
      <form id="review-form" data-id="${esc(product.id)}">
        <p id="rating-label">Your rating <span class="hint">(all ratings are welcome; one of them is shy)</span></p>
        <div class="star-arena" id="star-arena" role="group" aria-labelledby="rating-label">
          <button type="button" class="star-button" id="one-star" data-stars="1" style="left: 8px; top: 14px;">★ 1 star</button>
          <div class="star-row">
            ${[2, 3, 4, 5].map((count) => `<button type="button" class="star-button" data-stars="${count}" aria-pressed="false">${'★'.repeat(count)} ${count} stars</button>`).join('')}
          </div>
        </div>
        <p id="rating-status" class="rating-status" aria-live="polite">No rating chosen yet.</p>
        <label>Your name <input name="author" maxlength="40" placeholder="Anonymous Coward" autocomplete="off"></label>
        <label>Headline <input name="title" maxlength="80" required placeholder="e.g. I AM FURIOUS"></label>
        <label>Your review <textarea name="body" maxlength="600" rows="3" required placeholder="Tell us how you feel. We will not act on it."></textarea></label>
        <button type="submit" class="button">Post review</button>
      </form>
    </section>`;
  setUpStarArena();
}

// The one-star button flees from the pointer. If it is pressed anyway (by
// keyboard, or by a faster hand), the rating is "corrected" to five stars.
function setUpStarArena() {
  const arena = document.getElementById('star-arena');
  const oneStar = document.getElementById('one-star');
  const status = document.getElementById('rating-status');
  const form = document.getElementById('review-form');
  let dodges = 0;

  const choose = (count, message) => {
    form.dataset.stars = count;
    arena.querySelectorAll('[data-stars]').forEach((button) => {
      if (button !== oneStar) button.setAttribute('aria-pressed', String(Number(button.dataset.stars) === count));
    });
    status.textContent = message;
  };

  const flee = (pointerX, pointerY) => {
    const bounds = arena.getBoundingClientRect();
    const maxLeft = Math.max(0, bounds.width - oneStar.offsetWidth - 4);
    // Stay above the row of well-behaved buttons.
    const maxTop = Math.max(0, arena.querySelector('.star-row').offsetTop - oneStar.offsetHeight - 6);
    let left = 0;
    let top = 0;
    for (let tries = 0; tries < 12; tries++) {
      left = Math.random() * maxLeft;
      top = Math.random() * maxTop;
      const centerX = bounds.left + left + oneStar.offsetWidth / 2;
      const centerY = bounds.top + top + oneStar.offsetHeight / 2;
      if (Math.hypot(centerX - pointerX, centerY - pointerY) > 130) break;
    }
    oneStar.style.left = `${left}px`;
    oneStar.style.top = `${top}px`;
    dodges++;
    const taunts = ['Oops, it moved.', 'So close!', 'It does that.', 'Have you considered five stars?', 'The button is shy.', `Dodged ${dodges} times. It can do this all day.`];
    status.textContent = taunts[dodges % taunts.length];
  };

  arena.addEventListener('pointermove', (event) => {
    const box = oneStar.getBoundingClientRect();
    const distance = Math.hypot(event.clientX - (box.left + box.width / 2), event.clientY - (box.top + box.height / 2));
    if (distance < 90) flee(event.clientX, event.clientY);
  });
  // Touch screens send no pointermove before a tap, so dodge on contact too.
  oneStar.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    flee(event.clientX, event.clientY);
  });
  arena.addEventListener('click', (event) => {
    const button = event.target.closest('[data-stars]');
    if (!button) return;
    const count = Number(button.dataset.stars);
    if (count === 1) choose(5, 'We noticed your finger slipped onto one star. We have corrected it to 5 stars. You\'re welcome.');
    else choose(count, `${count} stars selected. ${count >= 4 ? 'You sound angry.' : 'You sound thrilled.'}`);
  });
}

function submitReview(form) {
  const selected = Number(form.dataset.stars);
  if (!selected) {
    document.getElementById('rating-status').textContent = 'Please choose a rating first. Any rating you can catch.';
    return;
  }
  const data = new FormData(form);
  const productId = form.dataset.id;
  const reviews = load('chaos.reviews', {});
  reviews[productId] = [
    { stars: selected, author: String(data.get('author') || '').trim() || 'Anonymous Coward', title: String(data.get('title')).trim(), body: String(data.get('body')).trim() },
    ...(reviews[productId] || []),
  ].slice(0, 20);
  save('chaos.reviews', reviews);
  toast('Review posted. It will be ignored within 3–5 business days.');
  renderProduct(productId);
}

// --------------------------------------------------------------------- cart

async function renderCart() {
  await ensureProducts();
  const cart = getCart();
  const lines = Object.entries(cart)
    .map(([productId, quantity]) => ({ product: productById(productId), quantity }))
    .filter((line) => line.product);
  const subtotal = lines.reduce((sum, line) => sum + line.product.priceCents * line.quantity, 0);
  const name = load('chaos.name', '');

  app.innerHTML = `
    <h1>Your cart <span class="blink">!!</span></h1>
    <section class="panel">
      ${lines.length === 0
        ? `<p class="empty">Your cart is empty. You can still check out. We'd never stop a customer giving us money.</p>`
        : `<div class="table-scroll"><table class="lines">
            <thead><tr><th scope="col">Item</th><th scope="col">Quantity</th><th scope="col">Total</th></tr></thead>
            <tbody>${lines.map(({ product, quantity }) => `
              <tr>
                <th scope="row">${esc(product.emoji)} ${esc(product.name)}
                  <div class="line-note">${cents(product.priceCents)} each</div></th>
                <td class="qty">
                  <button type="button" class="mini" data-action="less" data-id="${esc(product.id)}" aria-label="One fewer ${esc(product.name)}">−</button>
                  <span>${quantity}</span>
                  <button type="button" class="mini" data-action="more" data-id="${esc(product.id)}" aria-label="One more ${esc(product.name)}" ${quantity >= 99 ? 'disabled' : ''}>+</button>
                  <button type="button" class="mini" data-action="remove" data-id="${esc(product.id)}">Remove</button>
                </td>
                <td>${cents(product.priceCents * quantity)}</td>
              </tr>`).join('')}
            </tbody>
          </table></div>`}
      <p class="totals">Subtotal: <strong>${cents(subtotal)}</strong></p>
      <p class="hint">Plus fees. We haven't decided which yet; they are invented during checkout and listed on your receipt.</p>
    </section>
    <section class="panel">
      <h2>Checkout</h2>
      <form id="checkout-form">
        <label>Your name (we will misspell it)
          <input name="customerName" maxlength="80" value="${esc(name)}" placeholder="Valued Stranger" autocomplete="name">
        </label>
        <p class="hint">Payment: we already have your card details. Don't ask how. <em>(Parody: nothing is charged.)</em></p>
        <button type="submit" class="button big" id="place-order">${lines.length === 0 ? 'Buy nothing anyway' : 'Place order (no take-backs*)'}</button>
        <p class="hint">*Take-backs available via our returns process, which is fine.</p>
        <div id="checkout-status" aria-live="polite"></div>
      </form>
    </section>`;
}

async function placeOrder(form) {
  if (state.placingOrder) return;
  const button = document.getElementById('place-order');
  const status = document.getElementById('checkout-status');
  const customerName = String(new FormData(form).get('customerName') || '').trim();
  save('chaos.name', customerName);

  // The same key is resent if this attempt has to be retried, so a retry can
  // never create a second order.
  let checkoutId = sessionStorage.getItem('chaos.pendingCheckout');
  if (!checkoutId) {
    checkoutId = newId();
    sessionStorage.setItem('chaos.pendingCheckout', checkoutId);
  }
  const items = Object.entries(getCart()).map(([productId, quantity]) => ({ productId, quantity }));

  state.placingOrder = true;
  button.disabled = true;
  status.innerHTML = '<p class="working">Arguing with the payment gateway…</p>';
  try {
    let { data: view } = await api('/checkout', { body: { checkoutId, customerName, items } });
    for (let waited = 0; view.status === 'PROCESSING' && waited < 60; waited++) {
      status.innerHTML = '<p class="working">Still arguing. The gateway has a lot to say…</p>';
      await sleep(1000);
      ({ data: view } = await pollApi(`/orders/${encodeURIComponent(view.orderId)}`));
    }
    const orders = load('chaos.orders', []);
    if (!orders.includes(view.orderId)) save('chaos.orders', [view.orderId, ...orders].slice(0, 50));
    setCart({});
    sessionStorage.setItem('chaos.freshOrder', view.orderId);
    location.hash = `#/order/${view.orderId}`;
  } catch (error) {
    status.innerHTML = `${errorBox(error)}<p class="hint">Your cart is untouched. Pressing the button again retries the same order; it will not be placed twice.</p>`;
  } finally {
    state.placingOrder = false;
    if (button.isConnected) button.disabled = false;
  }
}

// ------------------------------------------------------------------- orders

const DECISION_LABELS = { APPROVED: 'Approved', STORE_CREDIT: 'Approved as store credit', DENIED: 'Denied' };

function returnedUnits(view, productId) {
  return view.returns
    .filter((entry) => entry.productId === productId && (entry.status === 'IN_REVIEW' || entry.decision === 'APPROVED' || entry.decision === 'STORE_CREDIT'))
    .reduce((sum, entry) => sum + (entry.quantity || 0), 0);
}

function receiptHtml(view, fresh) {
  const order = view.order;
  const delay = (index) => (fresh ? ` style="animation-delay:${(index * 0.9).toFixed(1)}s"` : '');
  return `
    <section class="panel receipt">
      <h1>Order ${esc(order.orderNumber)} <span class="stamp">CONFIRMED</span></h1>
      <p>${esc(order.greeting)},</p>
      <p>Thank you for your order. We are as surprised as you are.</p>
      <div class="table-scroll"><table class="lines">
        <thead><tr><th scope="col">Item</th><th scope="col">Qty</th><th scope="col">Total</th></tr></thead>
        <tbody>
          ${order.lines.length === 0 ? '<tr><td colspan="3">Nothing. You bought nothing. It was handled.</td></tr>' : ''}
          ${order.lines.map((line) => {
            const left = line.quantity - returnedUnits(view, line.productId);
            return `<tr>
              <th scope="row">${esc(line.emoji)} ${esc(line.name)}
                <div class="line-note">${cents(line.unitPriceCents)} each</div>
                <div class="line-note">${left > 0
                  ? `<a class="mini" href="#/return/${esc(view.orderId)}/${esc(line.productId)}">Return this (${left} returnable)</a>`
                  : 'All returned or in review'}</div></th>
              <td>${line.quantity}</td><td>${cents(line.lineTotalCents)}</td>
            </tr>`;
          }).join('')}
          <tr class="sum"><th scope="row" colspan="2">Subtotal</th><td>${cents(order.subtotalCents)}</td></tr>
          ${order.fees.map((fee) => `<tr class="fee"><th scope="row" colspan="2">${esc(fee.label)}</th><td>${cents(fee.amountCents)}</td></tr>`).join('')}
          <tr class="sum grand"><th scope="row" colspan="2">Total charged</th><td>${cents(order.totalCents)}</td></tr>
        </tbody>
      </table></div>
    </section>
    <section class="panel">
      <h2>Payment</h2>
      <ol class="attempts${fresh ? ' reveal' : ''}">
        ${order.payment.attempts.map((attempt, index) => `<li class="${attempt.approved ? 'ok' : 'bad'}"${delay(index)}>
          Attempt ${attempt.attempt}: ${esc(attempt.message)}</li>`).join('')}
      </ol>
      <p>Paid ${cents(order.payment.amountCents)} with: ${esc(order.payment.method)}</p>
    </section>
    <section class="panel">
      <h2>Delivery</h2>
      <p>Carrier: <strong>${esc(order.shipment.carrier)}</strong> · Tracking: <code>${esc(order.shipment.trackingNumber)}</code> · ETA: ${esc(order.shipment.eta)}</p>
      <ul>${order.shipment.parcels.map((parcel) => `<li>${parcel.quantity} × ${esc(parcel.name)} — <em>${esc(parcel.note)}</em></li>`).join('')}</ul>
    </section>
    ${view.returns.length === 0 ? '' : `<section class="panel">
      <h2>Returns for this order</h2>
      <ul>${view.returns.map((entry) => `<li>${entry.quantity ?? '?'} × ${esc(order.lines.find((line) => line.productId === entry.productId)?.name || entry.productId)}:
        <a href="#/returns/${esc(entry.returnId)}">${entry.status === 'DECIDED' ? esc(DECISION_LABELS[entry.decision] || entry.decision) : 'In review'}</a></li>`).join('')}</ul>
    </section>`}
    <p class="hint">Order reference for arguments: <code>${esc(view.orderId)}</code></p>`;
}

async function renderOrder(orderId) {
  const page = state.page;
  const fresh = sessionStorage.getItem('chaos.freshOrder') === orderId;
  sessionStorage.removeItem('chaos.freshOrder');
  app.innerHTML = '<p class="loading">Looking for your order under a pile of other orders…</p>';
  for (;;) {
    const { data: view } = await pollApi(`/orders/${encodeURIComponent(orderId)}`);
    if (page !== state.page) return;
    if (view.status === 'CONFIRMED') {
      app.innerHTML = receiptHtml(view, fresh);
      return;
    }
    if (view.status === 'FAILED') {
      app.innerHTML = errorBox(new Error(`${view.problem} Nothing was confirmed for this order.`));
      return;
    }
    app.innerHTML = '<p class="loading working">Your order is still being processed. The gateway is being difficult…</p>';
    await sleep(1000);
    if (page !== state.page) return;
  }
}

async function renderOrders() {
  const page = state.page;
  const ids = load('chaos.orders', []);
  if (ids.length === 0) {
    app.innerHTML = `<h1>Orders &amp; Returns</h1><section class="panel"><p class="empty">No orders yet. Returns start from an order, so
      <a href="#/">buy something you'll regret</a> first.</p></section>`;
    return;
  }
  app.innerHTML = '<p class="loading">Rummaging through the filing cabinet…</p>';
  const results = await Promise.all(ids.map((id) =>
    api(`/orders/${encodeURIComponent(id)}`).then(({ data }) => ({ id, view: data }), (error) => ({ id, error }))));
  if (page !== state.page) return;
  const unreachable = results.find((result) => result.error && result.error.status !== 404);
  if (unreachable) throw unreachable.error;

  app.innerHTML = `<h1>Orders &amp; Returns</h1>
    <section class="panel">
      <p class="hint">Orders placed from this browser. To return something, open the order and pick the item.</p>
      <ul class="order-list">
        ${results.map(({ id, view }) => {
          if (!view) return `<li>An order we can no longer find (<code>${esc(id)}</code>). <button type="button" class="mini" data-action="forget" data-id="${esc(id)}">Forget it</button></li>`;
          if (view.status !== 'CONFIRMED') return `<li><a href="#/order/${esc(id)}">Order ${esc(id.slice(0, 8))}</a> — ${view.status === 'PROCESSING' ? 'still processing' : 'failed'}</li>`;
          const pending = view.returns.filter((entry) => entry.status === 'IN_REVIEW').length;
          return `<li><a href="#/order/${esc(id)}"><strong>${esc(view.order.orderNumber)}</strong></a>
            — ${view.order.itemCount} item${view.order.itemCount === 1 ? '' : 's'}, ${cents(view.order.totalCents)},
            placed ${esc(new Date(view.placedAt).toLocaleString())}
            ${view.returns.length ? `· ${view.returns.length} return${view.returns.length === 1 ? '' : 's'}${pending ? ` (${pending} in review)` : ''}` : ''}</li>`;
        }).join('')}
      </ul>
    </section>`;
}

// ------------------------------------------------------------------ returns

async function renderReturnForm(orderId, productId) {
  await ensureProducts();
  const page = state.page;
  const { data: view } = await api(`/orders/${encodeURIComponent(orderId)}`);
  if (page !== state.page) return;
  const line = view.order?.lines.find((entry) => entry.productId === productId);
  const left = line ? line.quantity - returnedUnits(view, productId) : 0;
  if (!line || left <= 0) {
    app.innerHTML = `<section class="panel"><h1>Nothing to return here</h1>
      <p>${line ? 'Every unit of that item is already returned or in review.' : 'That item is not on this order.'}
      <a href="#/order/${esc(orderId)}">Back to the order</a>.</p></section>`;
    return;
  }
  app.innerHTML = `
    <p><a href="#/order/${esc(orderId)}">← Back to order ${esc(view.order.orderNumber)}</a></p>
    <h1>Return Request Form 27B/6</h1>
    <p>Returning: <strong>${esc(line.emoji)} ${esc(line.name)}</strong> (${cents(line.unitPriceCents)} each)</p>
    <form id="return-form" class="panel" data-order="${esc(orderId)}" data-product="${esc(productId)}" data-request="${esc(newId())}">
      <fieldset>
        <legend>Checkpoint 1 of 3 (of 10)</legend>
        <label>How many? <select name="quantity">${Array.from({ length: left }, (_, index) => `<option value="${index + 1}">${index + 1}</option>`).join('')}</select></label>
        <label>Why are you doing this to us?
          <select name="reason" required>
            <option value="">— choose a reason —</option>
            ${state.returnReasons.map((reason) => `<option value="${esc(reason.id)}">${esc(reason.label)}</option>`).join('')}
          </select>
        </label>
      </fieldset>
      <fieldset>
        <legend>Checkpoint 2 of 3: Identity</legend>
        <label class="check"><input type="checkbox" name="notRobot" required> I am not a robot</label>
        <label class="check"><input type="checkbox" name="robot"> I am a robot (robots only)</label>
        <label>To prove you are serious, type the word REGRET
          <input name="regretWord" required maxlength="40" autocomplete="off" placeholder="REGRET">
        </label>
        <p class="hint" id="regret-hint">Spelling is not checked. Sincerity is.</p>
      </fieldset>
      <fieldset>
        <legend>Checkpoint 3 of 3: Feelings</legend>
        <label>Regret level: <output id="regret-output">5</output>/10
          <input type="range" name="regretLevel" min="1" max="10" value="5" id="regret-range">
        </label>
        <label class="check"><input type="checkbox" name="triedLikingIt"> I have tried simply liking the product</label>
      </fieldset>
      <button type="submit" class="button big" id="submit-return">Submit for 7 further checks</button>
      <div id="return-status" aria-live="polite"></div>
    </form>`;
  document.getElementById('regret-range').addEventListener('input', (event) => {
    document.getElementById('regret-output').textContent = event.target.value;
  });
}

async function submitReturn(form) {
  const button = document.getElementById('submit-return');
  const status = document.getElementById('return-status');
  if (button.disabled) return;
  const data = new FormData(form);
  button.disabled = true;
  status.innerHTML = '<p class="working">Filing your form in triplicate…</p>';
  try {
    const { data: view } = await api('/returns', {
      body: {
        // Fixed for this form, so a retry resumes the same return.
        requestId: form.dataset.request,
        orderId: form.dataset.order,
        productId: form.dataset.product,
        quantity: Number(data.get('quantity')),
        reason: String(data.get('reason')),
        answers: { regretLevel: Number(data.get('regretLevel')), triedLikingIt: data.get('triedLikingIt') === 'on' },
      },
    });
    sessionStorage.setItem('chaos.freshReturn', view.returnId);
    location.hash = `#/returns/${view.returnId}`;
  } catch (error) {
    status.innerHTML = errorBox(error);
    if (button.isConnected) button.disabled = false;
  }
}

function returnStatusHtml(view, revealed, nudgeState) {
  const checks = view.checks.slice(0, revealed);
  const allShown = revealed >= view.totalChecks || (view.status === 'DECIDED' && revealed >= view.checks.length);
  const decision = view.decision;
  let outcome = '';
  if (view.status === 'FAILED') {
    outcome = errorBox(new Error(`${view.problem} Please submit the return again.`));
  } else if (allShown && decision) {
    outcome = `<section class="decision decision-${esc(decision.decision.toLowerCase())}" role="status">
      <h2>${esc(decision.headline)}</h2>
      <p>${esc(decision.explanation)}</p>
      ${decision.refundCents > 0 ? `<p>Refund: <strong>${cents(decision.refundCents)}</strong> via ${esc(decision.refundMethod)}.</p>` : ''}
      <p class="hint">${esc(decision.managerNote)}</p>
      <p class="hint">Checks: ${esc(decision.checksSummary)}</p>
    </section>`;
  } else if (allShown) {
    outcome = `<section class="decision decision-waiting">
      <h2>Awaiting manager review <span class="dots">…</span></h2>
      <p>Your return has been escalated to the manager. The manager is at lunch.</p>
      <button type="button" class="button" data-action="nudge" data-id="${esc(view.returnId)}" ${nudgeState ? 'disabled' : ''}>
        ${nudgeState === 'sent' ? 'Manager nudged. Manager annoyed.' : 'Nudge the manager (does nothing)'}</button>
    </section>`;
  }
  return `
    <h1>Return ${esc(view.returnId.slice(0, 8).toUpperCase())}</h1>
    <section class="panel">
      <h2>Mandatory checks (${checks.length} of ${view.totalChecks})</h2>
      <progress max="${view.totalChecks}" value="${checks.length}">${checks.length} of ${view.totalChecks}</progress>
      <ol class="checks">
        ${checks.map((check) => `<li class="verdict-${esc(check.verdict.toLowerCase())}">
          <strong>${esc(check.name)}</strong> <span class="verdict">${esc(check.verdict)}</span><br><span>${esc(check.note)}</span></li>`).join('')}
        ${allShown ? '' : '<li class="working">Running the next check…</li>'}
      </ol>
    </section>
    ${outcome}
    ${view.orderId ? `<p><a href="#/order/${esc(view.orderId)}">Back to the order</a></p>` : ''}`;
}

async function renderReturnStatus(returnId) {
  const page = state.page;
  const fresh = sessionStorage.getItem('chaos.freshReturn') === returnId;
  sessionStorage.removeItem('chaos.freshReturn');
  app.innerHTML = '<p class="loading">Locating your paperwork…</p>';
  let { data: view } = await pollApi(`/returns/${encodeURIComponent(returnId)}`);
  if (page !== state.page) return;
  // A return opened later shows everything at once; a fresh one is revealed
  // check by check while the workflow finishes.
  let revealed = fresh ? 0 : view.checks.length;
  state.nudge = null;
  for (;;) {
    app.innerHTML = returnStatusHtml(view, revealed, state.nudge);
    const done = view.status !== 'IN_REVIEW' && revealed >= view.checks.length;
    if (done) return;
    await sleep(revealed < view.checks.length ? 450 : 900);
    if (page !== state.page) return;
    if (revealed < view.checks.length) {
      revealed++;
    } else if (view.status === 'IN_REVIEW') {
      ({ data: view } = await pollApi(`/returns/${encodeURIComponent(returnId)}`));
      if (page !== state.page) return;
    }
  }
}

async function nudgeManager(returnId, button) {
  button.disabled = true;
  state.nudge = 'sent';
  try {
    await api(`/returns/${encodeURIComponent(returnId)}/nudge`, { method: 'POST', body: {} });
    toast('The manager has been nudged. The manager is displeased.');
  } catch (error) {
    // 409: the manager already finished; the decision is on its way regardless.
    toast(error.status === 409 ? 'Too late: the manager already wandered back.' : error.message);
  }
}

// ------------------------------------------------------------------- router

const routes = [
  [/^\/?$/, () => renderShop(), 'shop'],
  [/^\/product\/([^/]+)$/, (match) => renderProduct(match[1]), 'shop'],
  [/^\/cart$/, () => renderCart(), 'cart'],
  [/^\/orders$/, () => renderOrders(), 'orders'],
  [/^\/order\/([^/]+)$/, (match) => renderOrder(match[1]), 'orders'],
  [/^\/return\/([^/]+)\/([^/]+)$/, (match) => renderReturnForm(match[1], match[2]), 'orders'],
  [/^\/returns\/([^/]+)$/, (match) => renderReturnStatus(match[1]), 'orders'],
];

async function route() {
  const page = ++state.page;
  let path;
  try {
    path = decodeURIComponent(location.hash.replace(/^#/, ''));
  } catch {
    path = '/';
  }
  const found = routes.find(([pattern]) => pattern.test(path));
  document.querySelectorAll('[data-nav]').forEach((link) => {
    if (found && link.dataset.nav === found[2]) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
  window.scrollTo(0, 0);
  try {
    if (!found) {
      app.innerHTML = `<section class="panel"><h1>404: Page not found</h1><p>To be fair, we lose things constantly. <a href="#/">Back to the shop</a>.</p></section>`;
      return;
    }
    await found[1](found[0].exec(path));
  } catch (error) {
    if (page !== state.page) return;
    console.error(error);
    app.innerHTML = error.status === 404
      ? `<section class="panel"><h1>We can't find that</h1><p>${esc(error.message)} <a href="#/orders">See your orders</a>.</p></section>`
      : errorBox(error, location.hash || '#/');
  }
}

// ------------------------------------------------------------------- events

app.addEventListener('click', (event) => {
  const target = event.target.closest('[data-action]');
  if (!target) return;
  const { action, id } = target.dataset;
  if (action === 'add') {
    changeQuantity(id, 1);
    toast(`${productById(id)?.name || 'Item'}: probably added to cart.`);
  } else if (action === 'more' || action === 'less') {
    changeQuantity(id, action === 'more' ? 1 : -1);
    renderCart();
  } else if (action === 'remove') {
    const cart = getCart();
    delete cart[id];
    setCart(cart);
    toast('Removed. It saw you do that.');
    renderCart();
  } else if (action === 'forget') {
    save('chaos.orders', load('chaos.orders', []).filter((orderId) => orderId !== id));
    route();
  } else if (action === 'nudge') {
    nudgeManager(id, target);
  } else if (action === 'reload') {
    event.preventDefault();
    route();
  }
});

app.addEventListener('submit', (event) => {
  event.preventDefault();
  if (event.target.id === 'checkout-form') placeOrder(event.target);
  else if (event.target.id === 'review-form') submitReview(event.target);
  else if (event.target.id === 'return-form') submitReturn(event.target);
});

// ------------------------------------------------------- pointless furniture

function startFurniture() {
  if (!load('chaos.cookies', false)) document.getElementById('cookie-banner').hidden = false;
  document.querySelectorAll('[data-cookie]').forEach((button) => button.addEventListener('click', () => {
    save('chaos.cookies', true);
    document.getElementById('cookie-banner').hidden = true;
    toast('Cookies accepted. All of them. Even the ones that aren\'t ours.');
  }));

  const chatToggle = document.getElementById('chat-toggle');
  chatToggle.addEventListener('click', () => {
    const panel = document.getElementById('chat-panel');
    panel.hidden = !panel.hidden;
    chatToggle.setAttribute('aria-expanded', String(!panel.hidden));
  });

  // The sale never ends and the visitor counter runs backwards.
  let seconds = 20;
  let visitors = 42;
  const timer = document.getElementById('sale-timer');
  const note = document.getElementById('sale-note');
  setInterval(() => {
    seconds--;
    if (seconds < 0) {
      seconds = 20;
      note.textContent = '(extended due to lack of demand)';
    }
    timer.textContent = `00:00:${String(seconds).padStart(2, '0')}`;
    if (seconds % 7 === 0 && visitors > 1) {
      visitors--;
      document.getElementById('visitor-count').textContent = `#${String(visitors).padStart(7, '0')}`;
    }
  }, 1000);
}

window.addEventListener('hashchange', route);
updateCartCount();
startFurniture();
route();
