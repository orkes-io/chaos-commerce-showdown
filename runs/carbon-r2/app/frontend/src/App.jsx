import React, { useEffect, useMemo, useState } from "react";
import { api } from "./api.js";
import DodgingStarPicker from "./components/DodgingStarPicker.jsx";
import ProductModal from "./components/ProductModal.jsx";
import CheckoutView from "./components/CheckoutView.jsx";
import ReturnsView from "./components/ReturnsView.jsx";
import LedgerView from "./components/LedgerView.jsx";
import { CookieDoomBanner, UnhelpfulChatWidget } from "./components/Extras.jsx";

const TICKER_MESSAGES = [
  "🚨 ANTI-SALE ALERT: Enter code SAVE10 at checkout to pay 10% MORE for your audacity!",
  "⭐ REVIEW REMINDER: 5-Star reviews are for UNHINGED FURY. 2-Star reviews are for TEARFUL PRAISE. 1-Star button is on cardio.",
  "📦 WAREHOUSE UPDATE: Currently -4 items in stock! Raccoon supervisors synthesizing imaginary inventory on demand!",
  "🏛️ RETURNS NOTICE: All returns must pass Astrology, Cardboard Shyness, Tear Salinity, and 3x Lukewarm Espresso Stamping.",
  "⚡ POWERED BY CONDUCTOR: 100% real Conductor workflows at localhost:8080 • Zero AI API calls at runtime!",
];

function formatMoney(n) {
  return Number(n || 0).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}

function readInitialTab() {
  const hash = (window.location.hash || "").replace(/^#/, "").toLowerCase();
  if (["shop", "cart", "returns", "ledger"].includes(hash)) return hash;
  return "shop";
}

export default function App() {
  const [activeTab, setActiveTab] = useState(readInitialTab);
  const [products, setProducts] = useState([]);
  const [shippingMethods, setShippingMethods] = useState([]);
  const [promoHints, setPromoHints] = useState([]);
  const [orders, setOrders] = useState([]);
  const [returnsList, setReturnsList] = useState([]);
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);

  const [sortBy, setSortBy] = useState("FEATURED");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [storefrontRating, setStorefrontRating] = useState(5);
  const [storefrontToast, setStorefrontToast] = useState(null);
  const [tickerIndex, setTickerIndex] = useState(0);
  const [preselectedReturnOrder, setPreselectedReturnOrder] = useState(null);

  const [cart, setCart] = useState([
    {
      id: "sock-left-01",
      name: "Single Artisanal Left Sock (Pre-Lost)",
      emoji: "🧦",
      price: 9499.99,
      quantity: 1,
    },
  ]);

  useEffect(() => {
    const timer = setInterval(() => {
      setTickerIndex((i) => (i + 1) % TICKER_MESSAGES.length);
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const onHash = () => setActiveTab(readInitialTab());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const switchTab = (tab) => {
    setActiveTab(tab);
    window.history.replaceState(null, "", `#${tab}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  useEffect(() => {
    async function boot() {
      setLoading(true);
      try {
        const [catalogData, ordersData, returnsData, healthData] =
          await Promise.all([
            api.getCatalog(),
            api.getOrders(),
            api.getReturns(),
            api.getHealth(),
          ]);
        setProducts(catalogData.products || []);
        setShippingMethods(catalogData.shippingMethods || []);
        setPromoHints(catalogData.promoHints || []);
        setOrders(ordersData.orders || []);
        setReturnsList(returnsData.returns || []);
        setHealth(healthData);
      } catch (err) {
        showToast(`Backend connection hiccup: ${err.message}`);
      } finally {
        setLoading(false);
      }
    }
    boot();
  }, []);

  const showToast = (msg) => {
    setStorefrontToast(msg);
    setTimeout(() => {
      setStorefrontToast((cur) => (cur === msg ? null : cur));
    }, 3600);
  };

  const handleAddToCart = (product) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === product.id);
      if (existing) {
        return prev.map((i) =>
          i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [
        ...prev,
        {
          id: product.id,
          name: product.name,
          emoji: product.emoji,
          price: product.price,
          quantity: 1,
        },
      ];
    });
    showToast(
      `💸 Added "${product.name}" (${formatMoney(
        product.price
      )}) to cart! Your credit card whimpered softly.`
    );
  };

  const handleUpdateQty = (id, nextQty) => {
    if (nextQty <= 0) {
      setCart((prev) => prev.filter((i) => i.id !== id));
      return;
    }
    setCart((prev) =>
      prev.map((i) => (i.id === id ? { ...i, quantity: nextQty } : i))
    );
  };

  const handleRemoveItem = (id) => {
    setCart((prev) => prev.filter((i) => i.id !== id));
  };

  const handleProductUpdated = (updatedProduct) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === updatedProduct.id ? updatedProduct : p))
    );
    setSelectedProduct(updatedProduct);
  };

  const categories = useMemo(() => {
    const set = new Set(products.map((p) => p.category));
    return ["ALL", ...Array.from(set)];
  }, [products]);

  const sortedProducts = useMemo(() => {
    const filtered =
      selectedCategory === "ALL"
        ? [...products]
        : products.filter((p) => p.category === selectedCategory);

    switch (sortBy) {
      case "PRICE_HIGH":
        return filtered.sort((a, b) => b.price - a.price);
      case "PRICE_LOW":
        return filtered.sort((a, b) => a.price - b.price);
      case "HAUNTED":
        return filtered.sort((a, b) => b.hauntedLevel - a.hauntedLevel);
      case "USELESS":
        return filtered.sort((a, b) => a.usefulnessScore - b.usefulnessScore);
      case "THIRD_LETTER":
        return filtered.sort((a, b) =>
          (a.name[2] || "z").localeCompare(b.name[2] || "z")
        );
      default:
        return filtered;
    }
  }, [products, selectedCategory, sortBy]);

  const cartCount = cart.reduce((acc, i) => acc + i.quantity, 0);
  const cartTotal = cart.reduce((acc, i) => acc + i.price * i.quantity, 0);

  return (
    <div className="chaos-app">
      <div className="dishonesty-ticker">{TICKER_MESSAGES[tickerIndex]}</div>

      <header className="chaos-header">
        <div className="header-brand" onClick={() => switchTab("shop")}>
          <span className="brand-flame">🔥</span>
          <div>
            <h1>CHAOS COMMERCE™</h1>
            <span className="brand-sub">
              &ldquo;How Are They Still In Business?!&rdquo; — Everyone Since
              2019
            </span>
          </div>
        </div>

        <nav className="chaos-nav">
          <button
            type="button"
            className={activeTab === "shop" ? "active" : ""}
            onClick={() => switchTab("shop")}
          >
            🛍️ Aisle of Regret
          </button>
          <button
            type="button"
            className={activeTab === "cart" ? "active" : ""}
            onClick={() => switchTab("cart")}
            data-testid="nav-cart-btn"
          >
            🛒 Extortion Cart ({cartCount}) • {formatMoney(cartTotal)}
          </button>
          <button
            type="button"
            className={activeTab === "returns" ? "active" : ""}
            onClick={() => switchTab("returns")}
            data-testid="nav-returns-btn"
          >
            🏛️ Pointless Returns ({returnsList.length})
          </button>
          <button
            type="button"
            className={activeTab === "ledger" ? "active" : ""}
            onClick={() => switchTab("ledger")}
            data-testid="nav-ledger-btn"
          >
            🔬 Conductor X-Ray
          </button>
        </nav>

        <div className="conductor-status-badge">
          <span
            className={`dot ${
              health?.conductor?.reachable ? "online" : "offline"
            }`}
          />
          <span>
            Conductor{" "}
            {health?.conductor?.reachable
              ? `v${health.conductor.version} ONLINE`
              : "Connecting..."}
          </span>
        </div>
      </header>

      {storefrontToast && (
        <div className="chaos-toast" role="status">
          {storefrontToast}
        </div>
      )}

      <main className="chaos-main">
        {activeTab === "shop" && (
          <section className="page-section">
            <div className="hero-split">
              <div className="hero-copy">
                <div className="hero-pill">
                  🏆 BBB RATING: F− (INVENTED NEW MINUS SIGN FOR US)
                </div>
                <h2>
                  Astronomical Markups. Suspiciously Haunted Toasters.{" "}
                  <span className="highlight-neon">Zero Remorse.</span>
                </h2>
                <p>
                  Welcome to the internet&apos;s worst storefront—where a single
                  damp left sock costs <strong>$9,499.99</strong>, a haunted
                  Victorian toaster costs <strong>$0.03</strong>,{" "}
                  <strong>5-star reviews</strong> are written in blinding rage,{" "}
                  <strong>2-star reviews</strong> weep with poetic gratitude,
                  and every checkout &amp; bureaucratic return runs on real{" "}
                  <strong>Conductor workflows</strong>!
                </p>
                <div className="hero-cta-row">
                  <button
                    type="button"
                    className="btn-primary-loud"
                    onClick={() => switchTab("cart")}
                  >
                    💸 Recklessly Checkout Right Now →
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => switchTab("returns")}
                  >
                    🏛️ Attempt Our 7-Check Return Gauntlet
                  </button>
                </div>
              </div>

              <div className="hero-rating-card">
                <h3>⭐ Quick-Rate Your Shopping Misery!</h3>
                <p>
                  Unhappy with our $65,535.00 0.4-inch HDMI cable? Try clicking{" "}
                  <strong>1 Star</strong> below:
                </p>
                <DodgingStarPicker
                  compact={true}
                  value={storefrontRating}
                  onChange={(r) => {
                    setStorefrontRating(r);
                    showToast(
                      r === 5
                        ? "🔥 5★ Selected: Prepare to type in ALL CAPS FURY!"
                        : r === 2
                        ? "💐 2★ Selected: Glowing poetic adoration mode engaged!"
                        : `🤨 ${r}★ Selected: Mild confusion noted and ignored.`
                    );
                  }}
                  label="Live Satisfaction Capture:"
                />
              </div>
            </div>

            <div className="catalog-toolbar">
              <div className="category-pills">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    className={selectedCategory === cat ? "active" : ""}
                    onClick={() => setSelectedCategory(cat)}
                  >
                    {cat === "ALL" ? "All Mistakes" : cat}
                  </button>
                ))}
              </div>

              <label className="sort-control">
                Sort Hostility By:
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                >
                  <option value="FEATURED">Featured Financial Disasters</option>
                  <option value="PRICE_HIGH">
                    Price: Financially Ruinous First ($65,535 → $0.03)
                  </option>
                  <option value="PRICE_LOW">
                    Price: Suspiciously Cheap Traps First ($0.03 → $65,535)
                  </option>
                  <option value="THIRD_LETTER">
                    Alphabetical by 3rd Letter of Name (Why Not?)
                  </option>
                  <option value="HAUNTED">Most Haunted First 👻</option>
                  <option value="USELESS">Least Useful First 🗑️</option>
                </select>
              </label>
            </div>

            {loading ? (
              <div className="loading-box">
                Rummaging through damp warehouse bins...
              </div>
            ) : (
              <div className="product-grid">
                {sortedProducts.map((product) => {
                  const furySample = product.reviews.find(
                    (r) => r.rating === 5
                  );
                  const praiseSample = product.reviews.find(
                    (r) => r.rating === 2
                  );

                  return (
                    <article
                      key={product.id}
                      className="product-card"
                      data-testid={`product-card-${product.id}`}
                    >
                      <div
                        className="product-card-visual"
                        style={{ borderBottomColor: product.accentColor }}
                        onClick={() => setSelectedProduct(product)}
                      >
                        <span className="product-markup-ribbon">
                          {product.markupBadge}
                        </span>
                        <div className="product-emoji">{product.emoji}</div>
                        <span className="product-stock-pill">
                          {product.stockText}
                        </span>
                      </div>

                      <div className="product-card-body">
                        <div className="product-meta-line">
                          <span className="product-cat-chip">
                            {product.category}
                          </span>
                          {sortBy === "THIRD_LETTER" && (
                            <span className="third-letter-badge">
                              3rd letter: &ldquo;{product.name[2]}&rdquo;
                            </span>
                          )}
                        </div>

                        <h3
                          className="product-title"
                          onClick={() => setSelectedProduct(product)}
                        >
                          {product.name}
                        </h3>
                        <p className="product-tagline">{product.tagline}</p>

                        <div className="price-strip">
                          <span className="price-now">
                            {formatMoney(product.price)}
                          </span>
                          <span className="price-was">
                            Normal store:{" "}
                            <s>{formatMoney(product.compareAtPrice)}</s>
                          </span>
                        </div>

                        <div className="inverted-review-teasers">
                          {furySample && (
                            <div className="teaser-line fury">
                              <strong>★★★★★ (5★ Rage):</strong> &ldquo;
                              {furySample.title}&rdquo;
                            </div>
                          )}
                          {praiseSample && (
                            <div className="teaser-line praise">
                              <strong>★★☆☆☆ (2★ Praise):</strong> &ldquo;
                              {praiseSample.title}&rdquo;
                            </div>
                          )}
                        </div>

                        <div className="product-card-actions">
                          <button
                            type="button"
                            className="btn-inspect"
                            onClick={() => setSelectedProduct(product)}
                          >
                            🔍 Reviews &amp; Dodge 1★ ({product.reviewCount})
                          </button>
                          <button
                            type="button"
                            className="btn-add-cart"
                            onClick={() => handleAddToCart(product)}
                          >
                            + Cart ({formatMoney(product.price)})
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {activeTab === "cart" && (
          <CheckoutView
            cart={cart}
            shippingMethods={shippingMethods}
            promoHints={promoHints}
            onUpdateQty={handleUpdateQty}
            onRemoveItem={handleRemoveItem}
            onClearCart={() => setCart([])}
            onOrderCompleted={(newOrder) => {
              setOrders((prev) => [newOrder, ...prev]);
              showToast(
                `✅ Order ${newOrder.orderId} completed via Conductor workflow!`
              );
            }}
            onStartReturnForOrder={(order) => {
              setPreselectedReturnOrder(order);
              switchTab("returns");
            }}
            onBackToShop={() => switchTab("shop")}
          />
        )}

        {activeTab === "returns" && (
          <ReturnsView
            orders={orders}
            returnsList={returnsList}
            preselectedOrder={preselectedReturnOrder}
            onReturnCompleted={(newRet) => {
              setReturnsList((prev) => [newRet, ...prev]);
              showToast(
                `📜 Tribunal Verdict for ${newRet.returnId}: ${newRet.decision}!`
              );
            }}
          />
        )}

        {activeTab === "ledger" && (
          <LedgerView
            health={health}
            orders={orders}
            returnsList={returnsList}
          />
        )}
      </main>

      <footer className="chaos-footer">
        <div>
          <strong>CHAOS COMMERCE™</strong> — Proudly confusing shoppers while
          reliably completing 100% of Conductor workflows since this morning.
        </div>
        <div className="footer-fine">
          Static SPA ready for GitHub Pages • Stateless API ready for AWS Lambda
          • Orchestrated by Conductor at{" "}
          <code>
            {health?.conductor?.conductorApiUrl || "http://localhost:8080/api"}
          </code>
        </div>
      </footer>

      <ProductModal
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onAddToCart={handleAddToCart}
        onProductUpdated={handleProductUpdated}
      />

      <CookieDoomBanner />
      <UnhelpfulChatWidget />
    </div>
  );
}
