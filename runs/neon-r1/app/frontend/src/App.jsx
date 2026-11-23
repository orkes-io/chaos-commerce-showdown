import React, { useEffect, useMemo, useState } from "react";
import { api, getApiBaseUrl, setApiBaseUrl } from "./api.js";
import { Header } from "./components/Header.jsx";
import { ProductCard } from "./components/ProductCard.jsx";
import { ProductModal } from "./components/ProductModal.jsx";
import { DodgingOneStar } from "./components/DodgingOneStar.jsx";
import { CartDrawer } from "./components/CartDrawer.jsx";
import { CheckoutReceiptModal } from "./components/CheckoutReceiptModal.jsx";
import { ReturnsPortal } from "./components/ReturnsPortal.jsx";
import { OrdersView } from "./components/OrdersView.jsx";
import { ChaosBot } from "./components/ChaosBot.jsx";
import { RegretToast } from "./components/RegretToast.jsx";
import { CookieBanner } from "./components/CookieBanner.jsx";

export default function App() {
  const [activeTab, setActiveTab] = useState("shop");
  const [health, setHealth] = useState(null);
  const [products, setProducts] = useState([]);
  const [shippingMethods, setShippingMethods] = useState([]);
  const [addons, setAddons] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [promoHints, setPromoHints] = useState([]);
  const [orders, setOrders] = useState([]);
  const [returnsList, setReturnsList] = useState([]);
  const [globalDodges, setGlobalDodges] = useState(48219);

  const [cart, setCart] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [inspectedProductId, setInspectedProductId] = useState(null);
  const [checkoutResult, setCheckoutResult] = useState(null);
  const [returnTargetOrder, setReturnTargetOrder] = useState(null);

  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState("overpriced");
  const [heroRating, setHeroRating] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const [showApiConfig, setShowApiConfig] = useState(false);
  const [apiUrlInput, setApiUrlInput] = useState(getApiBaseUrl());

  const loadAll = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [h, cat, ord, ret] = await Promise.all([
        api.health(),
        api.catalog(),
        api.getOrders(),
        api.getReturns(),
      ]);
      setHealth(h);
      setProducts(cat.products || []);
      setShippingMethods(cat.shippingMethods || []);
      setAddons(cat.addons || []);
      setPaymentMethods(cat.paymentMethods || []);
      setPromoHints(cat.promoHints || []);
      setGlobalDodges(cat.oneStarDodgeReports || 48219);
      setOrders(ord.orders || []);
      setReturnsList(ret.returns || []);
    } catch (err) {
      setLoadError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const inspectedProduct = useMemo(
    () => products.find((p) => p.id === inspectedProductId) || null,
    [products, inspectedProductId]
  );

  const categories = useMemo(
    () => ["ALL", ...new Set(products.map((p) => p.category))],
    [products]
  );

  const visibleProducts = useMemo(() => {
    const filtered =
      categoryFilter === "ALL"
        ? products
        : products.filter((p) => p.category === categoryFilter);
    const copy = [...filtered];
    if (sortBy === "overpriced") {
      copy.sort((a, b) => b.price - a.price);
    } else if (sortBy === "cheapest") {
      copy.sort((a, b) => a.price - b.price);
    } else if (sortBy === "rage") {
      copy.sort(
        (a, b) =>
          b.reviews.filter((r) => r.rating === 5).length -
          a.reviews.filter((r) => r.rating === 5).length
      );
    }
    return copy;
  }, [products, categoryFilter, sortBy]);

  const addToCart = (product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
    setCartOpen(true);
  };

  const updateCartQty = (productId, nextQty) => {
    if (nextQty <= 0) {
      setCart((prev) => prev.filter((item) => item.product.id !== productId));
      return;
    }
    setCart((prev) =>
      prev.map((item) =>
        item.product.id === productId ? { ...item, quantity: nextQty } : item
      )
    );
  };

  const removeCartItem = (productId) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const handleProductUpdated = (updatedProduct) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === updatedProduct.id ? updatedProduct : p))
    );
  };

  const handleDodge = () => {
    setGlobalDodges((n) => n + 1);
    api.recordDodge();
  };

  const handleCheckoutSuccess = (result) => {
    setCart([]);
    setCartOpen(false);
    setOrders((prev) => [result.order, ...prev]);
    setCheckoutResult(result);
  };

  const handleStartReturnFromOrder = (order) => {
    setCheckoutResult(null);
    setReturnTargetOrder(order);
    setActiveTab("returns");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleReturnCreated = (returnRec) => {
    setReturnsList((prev) => [returnRec, ...prev]);
  };

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div>
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        cartCount={cartCount}
        ordersCount={orders.length}
        returnsCount={returnsList.length}
        onOpenCart={() => setCartOpen(true)}
        health={health}
      />

      <main className="container">
        {loadError && (
          <div className="alert-banner error">
            ⚠️ Could not reach Chaos Commerce backend ({loadError}).{" "}
            <button
              type="button"
              className="btn btn-sm"
              style={{ marginLeft: 8 }}
              onClick={() => setShowApiConfig(true)}
            >
              Configure Backend API URL
            </button>
          </div>
        )}

        {activeTab === "shop" && (
          <>
            <section className="hero">
              <div>
                <span className="hero-eyebrow">
                  🏆 &ldquo;HOW IS THIS STORE STILL OPERATING?&rdquo; — EVERY SHOPPER
                </span>
                <h2>
                  Ridiculous Prices. Furious 5-Star Reviews. Blissful 2-Star Praise.
                </h2>
                <p>
                  Welcome to <strong>Chaos Commerce™</strong>, where promo codes raise your
                  price, shipping takes up to 90 business months, and the 1-star button
                  actively flees your mouse. Behind the jokes,{" "}
                  <strong>checkout always completes</strong> and{" "}
                  <strong>every return reaches a real decision</strong> — orchestrated live by{" "}
                  <strong>Conductor workflows</strong> with zero AI API calls.
                </p>
                <div className="hero-actions">
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => products[0] && addToCart(products[0])}
                  >
                    💸 Impulse-Buy a $9,999.99 Paperclip
                  </button>
                  <button
                    type="button"
                    className="btn btn-yellow"
                    onClick={() => setActiveTab("returns")}
                  >
                    🧾 Enter the Pointless Returns Maze
                  </button>
                </div>
              </div>

              <div className="dodge-card">
                <h3>⭐ Rate Chaos Commerce Right Now!</h3>
                <div style={{ fontSize: "0.78rem", color: "#52525b" }}>
                  Global 1-Star Dodges Logged:{" "}
                  <strong style={{ fontFamily: "var(--mono)", color: "#ff2a6d" }}>
                    {globalDodges.toLocaleString()}
                  </strong>
                </div>
                <DodgingOneStar
                  compact
                  selectedRating={heroRating}
                  onSelectRating={(val) => setHeroRating(val)}
                  onDodge={handleDodge}
                />
                {heroRating && (
                  <div
                    style={{
                      marginTop: 6,
                      fontSize: "0.8rem",
                      fontWeight: 800,
                      color: heroRating === 5 ? "#dc2626" : "#15803d",
                    }}
                  >
                    {heroRating === 5
                      ? "🔥 5 Stars received! We can feel your incandescent fury!"
                      : heroRating === 2
                        ? "✨ 2 Stars received! Thank you for the tears of pure bliss!"
                        : `👍 ${heroRating} Stars logged. Boldly average!`}
                  </div>
                )}
              </div>
            </section>

            <div className="toolbar">
              <div className="toolbar-group">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    className={`btn btn-sm ${categoryFilter === cat ? "btn-active" : ""}`}
                    onClick={() => setCategoryFilter(cat)}
                  >
                    {cat === "ALL" ? "All Regrets" : cat}
                  </button>
                ))}
              </div>

              <div className="toolbar-group">
                <label style={{ fontWeight: 800, fontSize: "0.84rem" }}>Sort:</label>
                <select
                  className="select"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                >
                  <option value="overpriced">Most Outrageously Overpriced</option>
                  <option value="cheapest">Least Bankrupting</option>
                  <option value="rage">Highest 5★ Fury Volume</option>
                </select>
              </div>
            </div>

            {loading ? (
              <div className="panel">Loading terribly priced merchandise...</div>
            ) : (
              <div className="product-grid">
                {visibleProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onAddToCart={addToCart}
                    onInspect={(p) => setInspectedProductId(p.id)}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === "returns" && (
          <ReturnsPortal
            orders={orders}
            returnsList={returnsList}
            preselectedOrder={returnTargetOrder}
            onReturnCreated={handleReturnCreated}
          />
        )}

        {activeTab === "orders" && (
          <OrdersView
            orders={orders}
            onStartReturn={handleStartReturnFromOrder}
          />
        )}
      </main>

      <footer className="footer">
        <div className="footer-inner">
          <div>
            <strong>CHAOS COMMERCE™</strong> — Parody storefront backed by Conductor OSS
            workflows (<code>chaos_checkout</code> &amp;{" "}
            <code>chaos_return_bureaucracy</code>). Zero AI APIs called at runtime.
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            {health?.conductor?.uiUrl && (
              <a
                className="btn btn-sm btn-cyan"
                href={health.conductor.uiUrl}
                target="_blank"
                rel="noreferrer"
              >
                ⚡ Conductor UI ↗
              </a>
            )}
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => setShowApiConfig((v) => !v)}
            >
              ⚙️ Backend URL ({getApiBaseUrl() || "same-origin"})
            </button>
          </div>
        </div>

        {showApiConfig && (
          <div
            style={{
              maxWidth: 1240,
              margin: "12px auto 0",
              padding: 12,
              border: "2px solid #111",
              borderRadius: 8,
              background: "#fef9c3",
              display: "flex",
              gap: 8,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <strong style={{ fontSize: "0.84rem" }}>
              Backend API Base URL (for GitHub Pages → AWS Lambda):
            </strong>
            <input
              className="input"
              style={{ flex: 1, minWidth: 260 }}
              value={apiUrlInput}
              onChange={(e) => setApiUrlInput(e.target.value)}
              placeholder="Leave empty for same-origin or enter https://xxxx.execute-api.us-east-1.amazonaws.com"
            />
            <button
              type="button"
              className="btn btn-sm btn-dark"
              onClick={() => {
                setApiBaseUrl(apiUrlInput);
                setShowApiConfig(false);
                loadAll();
              }}
            >
              Save &amp; Reload
            </button>
          </div>
        )}
      </footer>

      <ProductModal
        product={inspectedProduct}
        onClose={() => setInspectedProductId(null)}
        onAddToCart={addToCart}
        onProductUpdated={handleProductUpdated}
        onDodgeRecorded={handleDodge}
      />

      <CartDrawer
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        cartItems={cart}
        shippingMethods={shippingMethods}
        addons={addons}
        paymentMethods={paymentMethods}
        promoHints={promoHints}
        onUpdateQty={updateCartQty}
        onRemoveItem={removeCartItem}
        onCheckoutSuccess={handleCheckoutSuccess}
      />

      <CheckoutReceiptModal
        result={checkoutResult}
        onClose={() => setCheckoutResult(null)}
        onStartReturn={handleStartReturnFromOrder}
      />

      <RegretToast />
      <ChaosBot />
      <CookieBanner />
    </div>
  );
}
