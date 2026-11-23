import React, { useEffect, useMemo, useState } from "react";
import { api, getApiBaseUrl, setApiBaseUrlOverride } from "./api.js";
import ProductCard, { formatMoney } from "./components/ProductCard.jsx";
import DodgingOneStarButton from "./components/DodgingOneStarButton.jsx";
import ReviewModal from "./components/ReviewModal.jsx";
import CartCheckoutDrawer from "./components/CartCheckoutDrawer.jsx";
import ReturnsLabyrinth from "./components/ReturnsLabyrinth.jsx";
import WorkflowTraceCard from "./components/WorkflowTraceCard.jsx";

export default function App() {
  const [activeTab, setActiveTab] = useState("catalog");
  const [products, setProducts] = useState([]);
  const [shippingMethods, setShippingMethods] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [promoCodes, setPromoCodes] = useState([]);
  const [oneStarDodges, setOneStarDodges] = useState(1482);
  const [orders, setOrders] = useState([]);
  const [returnsList, setReturnsList] = useState([]);
  const [health, setHealth] = useState(null);

  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState("featured");
  const [heroRating, setHeroRating] = useState(5);
  const [heroRatingFeedback, setHeroRatingFeedback] = useState("");

  const [cart, setCart] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [reviewProduct, setReviewProduct] = useState(null);
  const [prefillReturnOrder, setPrefillReturnOrder] = useState(null);

  // Conductor live executions tab state
  const [executions, setExecutions] = useState([]);
  const [selectedExecution, setSelectedExecution] = useState(null);
  const [loadingExecutions, setLoadingExecutions] = useState(false);
  const [apiUrlInput, setApiUrlInput] = useState(getApiBaseUrl());

  // Ambient parody UI
  const [cookieDismissed, setCookieDismissed] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const [supportInput, setSupportInput] = useState("");
  const [supportMessages, setSupportMessages] = useState([
    {
      from: "bot",
      text: "Welcome to Chaos Support! Queue #94,218. Zero AI used — 100% pure artisanal snark."
    }
  ]);

  const [loadError, setLoadError] = useState("");

  async function loadInitialData() {
    setLoadError("");
    try {
      const [catRes, ordRes, retRes, healthRes] = await Promise.all([
        api.getCatalog(),
        api.getOrders(),
        api.getReturns(),
        api.getHealth()
      ]);
      setProducts(catRes.products || []);
      setShippingMethods(catRes.shippingMethods || []);
      setPaymentMethods(catRes.paymentMethods || []);
      setPromoCodes(catRes.promoCodes || []);
      setOneStarDodges(catRes.oneStarDodges ?? 1482);
      setOrders(ordRes.orders || []);
      setReturnsList(retRes.returns || []);
      setHealth(healthRes);
    } catch (err) {
      setLoadError(err.message);
    }
  }

  useEffect(() => {
    loadInitialData();
  }, []);

  async function refreshConductorTab() {
    setLoadingExecutions(true);
    try {
      const [h, ex] = await Promise.all([
        api.getHealth(),
        api.getWorkflowExecutions()
      ]);
      setHealth(h);
      setExecutions(ex.executions || []);
    } catch {
      // ignore
    } finally {
      setLoadingExecutions(false);
    }
  }

  useEffect(() => {
    if (activeTab === "conductor") {
      refreshConductorTab();
    }
  }, [activeTab]);

  const categories = useMemo(() => {
    const uniq = new Set(products.map((p) => p.category));
    return ["ALL", ...uniq];
  }, [products]);

  const visibleProducts = useMemo(() => {
    const filtered =
      categoryFilter === "ALL"
        ? [...products]
        : products.filter((p) => p.category === categoryFilter);

    if (sortBy === "price_desc") {
      filtered.sort((a, b) => b.price - a.price);
    } else if (sortBy === "price_asc") {
      filtered.sort((a, b) => a.price - b.price);
    } else if (sortBy === "name") {
      filtered.sort((a, b) => a.name.localeCompare(b.name));
    }
    return filtered;
  }, [products, categoryFilter, sortBy]);

  const totalCartItems = cart.reduce((acc, i) => acc + i.quantity, 0);

  function handleAddToCart(product) {
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
          quantity: 1
        }
      ];
    });
    setCartOpen(true);
  }

  function handleUpdateCartQty(productId, nextQty) {
    setCart((prev) => {
      if (nextQty <= 0) {
        return prev.filter((i) => i.id !== productId);
      }
      return prev.map((i) =>
        i.id === productId ? { ...i, quantity: nextQty } : i
      );
    });
  }

  function handleReviewAdded(productId, newReview, updatedDodges) {
    if (typeof updatedDodges === "number") {
      setOneStarDodges(updatedDodges);
    }
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id !== productId) return p;
        const reviews = [newReview, ...(p.reviews || [])];
        return {
          ...p,
          reviews,
          reviewCount: reviews.length
        };
      })
    );
    setReviewProduct((prev) =>
      prev && prev.id === productId
        ? {
            ...prev,
            reviews: [newReview, ...(prev.reviews || [])],
            reviewCount: (prev.reviewCount || 0) + 1
          }
        : prev
    );
  }

  async function handleSupportSubmit(e) {
    e.preventDefault();
    const text = supportInput.trim();
    if (!text) return;
    setSupportMessages((prev) => [...prev, { from: "user", text }]);
    setSupportInput("");
    try {
      const res = await api.sendSupportMessage(text);
      setSupportMessages((prev) => [
        ...prev,
        {
          from: "bot",
          text: `${res.reply} (New Queue Pos: #${res.queuePosition.toLocaleString()})`
        }
      ]);
    } catch {
      setSupportMessages((prev) => [
        ...prev,
        {
          from: "bot",
          text: "Support carrier pigeon flew into a ceiling fan. Try again never!"
        }
      ]);
    }
  }

  return (
    <div>
      {/* Marquee Hazard Ticker */}
      <div className="hazard-ticker">
        <div className="hazard-ticker-inner">
          ⚠️ REGULATORY NOTICE: Chaos Commerce™ remains inexplicable legal in 3
          maritime time zones! • 💸 Use code SAVE20 to pay +20% MORE! • 😡
          5-Star Reviews = Unhinged Fury • 😍 2-Star Reviews = Tearful Worship •
          🏃 1-Star Button Undefeated ({oneStarDodges.toLocaleString()} dodges!) •
          ⚙️ All Checkouts &amp; Pointless Returns Orchestrated Live on Conductor!
          &nbsp;&nbsp;&nbsp;&nbsp; ⚠️ REGULATORY NOTICE: Chaos Commerce™ remains
          inexplicably legal in 3 maritime time zones! • 💸 Use code SAVE20 to pay
          +20% MORE! • 😡 5-Star Reviews = Unhinged Fury • 😍 2-Star Reviews =
          Tearful Worship • 🏃 1-Star Button Undefeated (
          {oneStarDodges.toLocaleString()} dodges!) • ⚙️ All Checkouts &amp;
          Pointless Returns Orchestrated Live on Conductor!
        </div>
      </div>

      {/* Header */}
      <header className="top-header">
        <div className="header-inner">
          <div
            className="brand-block"
            style={{ cursor: "pointer" }}
            onClick={() => setActiveTab("catalog")}
          >
            <div className="brand-logo">🔥</div>
            <div>
              <h1 className="brand-title">Chaos Commerce™</h1>
              <p className="brand-sub">
                “How Are They Still In Business?!” — Every Shopper Since 2019
              </p>
            </div>
          </div>

          <nav className="nav-tabs">
            <button
              type="button"
              className={`btn ${activeTab === "catalog" ? "btn-active" : ""}`}
              onClick={() => setActiveTab("catalog")}
              data-testid="tab-catalog"
            >
              🛍️ Ridiculous Catalog
            </button>
            <button
              type="button"
              className={`btn ${activeTab === "returns" ? "btn-active" : ""}`}
              onClick={() => setActiveTab("returns")}
              data-testid="tab-returns"
            >
              🏛️ Pointless Returns ({returnsList.length})
            </button>
            <button
              type="button"
              className={`btn ${activeTab === "conductor" ? "btn-active" : ""}`}
              onClick={() => setActiveTab("conductor")}
              data-testid="tab-conductor"
            >
              ⚙️ Conductor Live{" "}
              {health?.conductor?.connected ? "🟢" : "🟡"}
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setCartOpen(true)}
              data-testid="open-cart-btn"
            >
              🛒 Regret Basket ({totalCartItems})
            </button>
          </nav>
        </div>
      </header>

      <main className="container">
        {loadError && (
          <div
            className="form-card"
            style={{ background: "var(--danger-soft)", borderColor: "var(--danger)" }}
          >
            <strong>⚠️ Could not reach Chaos Backend API:</strong> {loadError}
            <div style={{ marginTop: "0.5rem", fontSize: "0.85rem" }}>
              If viewing from GitHub Pages, configure your deployed AWS Lambda API
              URL under the <strong>⚙️ Conductor Live</strong> tab.
            </div>
          </div>
        )}

        {activeTab === "catalog" && (
          <>
            {/* Hero + 1-Star Dodge Spotlight */}
            <section className="hero-banner">
              <div>
                <span className="hero-kicker">
                  VOTED #1 WORST FINANCIAL DECISION ON THE INTERNET
                </span>
                <h2 className="hero-title">
                  Overpriced Debris. Furious 5★ Rants. Worshipful 2★ Love Letters.
                </h2>
                <p className="hero-desc">
                  Welcome to the only store bold enough to charge{" "}
                  <strong>$49,999.99</strong> for a chewed paperclip,{" "}
                  <strong>-$14.99</strong> for a cursed brick (plus a $199.99
                  containment fee), and route every order &amp; return through
                  multi-branch <strong>Conductor workflows</strong> that{" "}
                  <em>always</em> finish what you regrettably started.
                </p>
                <div className="stat-pills">
                  <span className="stat-pill">
                    ✅ Checkout: 100% Completion Guarantee
                  </span>
                  <span className="stat-pill">
                    ⚖️ Returns: 100% Tribunal Decision Guarantee
                  </span>
                  <span className="stat-pill">🤖 Runtime AI Calls: 0</span>
                </div>
              </div>

              <div>
                <div
                  style={{
                    fontWeight: 900,
                    fontSize: "0.88rem",
                    marginBottom: "0.35rem",
                    display: "flex",
                    justifyContent: "space-between"
                  }}
                >
                  <span>🎯 Storefront Satisfaction Poll (Try Clicking 1★!)</span>
                  {heroRatingFeedback && (
                    <span style={{ color: "var(--danger)", fontSize: "0.78rem" }}>
                      {heroRatingFeedback}
                    </span>
                  )}
                </div>
                <DodgingOneStarButton
                  compact
                  selectedRating={heroRating}
                  onSelectRating={(stars) => {
                    setHeroRating(stars);
                    setHeroRatingFeedback(
                      stars === 5
                        ? "Recorded 5★ Incandescent Fury!"
                        : stars === 2
                        ? "Recorded 2★ Tearful Adoration!"
                        : `Recorded ${stars}★ Bewilderment!`
                    );
                  }}
                  globalDodges={oneStarDodges}
                  onDodgeIncrement={() => setOneStarDodges((n) => n + 1)}
                />
              </div>
            </section>

            {/* Filter & Sort Toolbar */}
            <div className="catalog-toolbar">
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
                {categories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    className={`btn btn-sm ${
                      categoryFilter === cat ? "btn-active" : ""
                    }`}
                    onClick={() => setCategoryFilter(cat)}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <label style={{ fontWeight: 800, fontSize: "0.82rem" }}>
                  Sort By:
                </label>
                <select
                  className="input-control"
                  style={{ padding: "0.35rem 0.6rem", fontSize: "0.84rem" }}
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                >
                  <option value="featured">Curated Catastrophes</option>
                  <option value="price_desc">
                    Price: Most Financially Ruinous First
                  </option>
                  <option value="price_asc">
                    Price: Negative Price Traps First
                  </option>
                  <option value="name">Alphabetical Regret (A–Z)</option>
                </select>
              </div>
            </div>

            {/* Product Grid */}
            <section className="product-grid">
              {visibleProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onAddToCart={handleAddToCart}
                  onOpenReviews={(p) => setReviewProduct(p)}
                />
              ))}
            </section>
          </>
        )}

        {activeTab === "returns" && (
          <ReturnsLabyrinth
            orders={orders}
            prefillOrder={prefillReturnOrder}
            pastReturns={returnsList}
            onReturnCompleted={(newRet) => {
              setReturnsList((prev) => [newRet, ...prev]);
            }}
          />
        )}

        {activeTab === "conductor" && (
          <section data-testid="conductor-live-section">
            <div className="form-card" style={{ background: "var(--surface-alt)" }}>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "0.75rem"
                }}
              >
                <div>
                  <span className="hero-kicker">ORCHESTRATION TELEMETRY</span>
                  <h2 style={{ margin: "0.2rem 0 0.3rem" }}>
                    ⚙️ Conductor Live Workflow Inspector
                  </h2>
                  <p style={{ margin: 0, fontSize: "0.88rem", color: "var(--muted)" }}>
                    Conductor API:{" "}
                    <code>
                      {health?.conductor?.conductorServerUrl ||
                        "http://localhost:8080/api"}
                    </code>{" "}
                    • Status:{" "}
                    <strong>
                      {health?.conductor?.connected ? "CONNECTED" : "OFFLINE"}
                    </strong>{" "}
                    • Registered:{" "}
                    <code>
                      {(health?.conductor?.registeredWorkflows || []).join(", ") ||
                        "none"}
                    </code>
                  </p>
                </div>
                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                  <button
                    type="button"
                    className="btn btn-sm"
                    onClick={refreshConductorTab}
                    disabled={loadingExecutions}
                  >
                    {loadingExecutions ? "Refreshing..." : "↻ Refresh Executions"}
                  </button>
                  {health?.conductor?.conductorUiUrl && (
                    <a
                      href={health.conductor.conductorUiUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-sm btn-hazard"
                      style={{ textDecoration: "none" }}
                    >
                      Open Conductor Server UI ↗
                    </a>
                  )}
                </div>
              </div>
            </div>

            <div className="form-card">
              <h3 style={{ marginTop: 0 }}>
                📜 Recent Checkout &amp; Return Workflow Executions
              </h3>
              {executions.length === 0 ? (
                <p style={{ color: "var(--muted)", fontSize: "0.9rem" }}>
                  No executions recorded yet — complete a checkout or submit a
                  return to watch Conductor orchestrate it live!
                </p>
              ) : (
                <div style={{ display: "grid", gap: "0.5rem" }}>
                  {executions.map((ex) => (
                    <div
                      key={ex.workflowId}
                      style={{
                        border: "2px solid var(--border)",
                        padding: "0.65rem 0.85rem",
                        display: "flex",
                        flexWrap: "wrap",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: "0.5rem",
                        background: "#fffdf9"
                      }}
                    >
                      <div style={{ fontFamily: "var(--mono)", fontSize: "0.82rem" }}>
                        <strong>{ex.workflowType}</strong> •{" "}
                        <code>{ex.workflowId}</code> •{" "}
                        <span style={{ color: "#059669", fontWeight: 900 }}>
                          {ex.status}
                        </span>
                      </div>
                      <div style={{ display: "flex", gap: "0.45rem" }}>
                        <button
                          type="button"
                          className="btn btn-sm"
                          onClick={async () => {
                            const detail = await api.getWorkflowExecutionDetail(
                              ex.workflowId
                            );
                            setSelectedExecution(detail.execution);
                          }}
                        >
                          Inspect Tasks
                        </button>
                        <a
                          href={ex.conductorUiExecutionUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn-sm btn-hazard"
                          style={{ textDecoration: "none" }}
                        >
                          Conductor UI ↗
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {selectedExecution && (
                <WorkflowTraceCard
                  execution={selectedExecution}
                  title={`Execution Detail: ${selectedExecution.workflowName}`}
                />
              )}
            </div>

            <div className="form-card">
              <h3 style={{ marginTop: 0 }}>
                ☁️ GitHub Pages ↔ AWS Lambda API Endpoint Configuration
              </h3>
              <p style={{ fontSize: "0.86rem", color: "var(--muted)" }}>
                Locally, leave blank to use same-origin <code>/api</code> on{" "}
                <code>http://localhost:3000</code>. When hosted on GitHub Pages,
                set <code>VITE_API_BASE_URL</code> at build time or paste your AWS
                Lambda Function URL / API Gateway URL here:
              </p>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                <input
                  className="input-control"
                  style={{ flex: 1, minWidth: "240px" }}
                  placeholder="Same-origin (default) or https://xyz.execute-api.us-east-1.amazonaws.com"
                  value={apiUrlInput}
                  onChange={(e) => setApiUrlInput(e.target.value)}
                />
                <button
                  type="button"
                  className="btn btn-sm btn-active"
                  onClick={() => {
                    setApiBaseUrlOverride(apiUrlInput);
                    loadInitialData();
                    refreshConductorTab();
                  }}
                >
                  Save &amp; Reconnect
                </button>
              </div>
            </div>
          </section>
        )}
      </main>

      {/* Product Review Modal */}
      <ReviewModal
        product={reviewProduct}
        onClose={() => setReviewProduct(null)}
        onReviewAdded={handleReviewAdded}
        globalDodges={oneStarDodges}
        onDodgeIncrement={() => setOneStarDodges((n) => n + 1)}
      />

      {/* Cart & Checkout Drawer */}
      <CartCheckoutDrawer
        isOpen={cartOpen}
        onClose={() => setCartOpen(false)}
        cart={cart}
        onUpdateQty={handleUpdateCartQty}
        onClearCart={() => setCart([])}
        shippingMethods={shippingMethods}
        paymentMethods={paymentMethods}
        promoCodes={promoCodes}
        onOrderCompleted={(newOrder) => {
          setOrders((prev) => [newOrder, ...prev]);
        }}
        onStartReturnForOrder={(ord) => {
          setPrefillReturnOrder(ord);
          setActiveTab("returns");
        }}
      />

      {/* Cookie Parody Banner */}
      {!cookieDismissed && (
        <div className="cookie-banner">
          <div style={{ fontWeight: 900, marginBottom: "0.3rem" }}>
            🍪 Mandatory Haunted Cookie Notice
          </div>
          <p style={{ margin: "0 0 0.65rem" }}>
            We use 14,209 artisanal tracking cookies, 2 stale scones, and an
            imaginary biscuit to remember how many times the 1★ button outran your
            mouse.
          </p>
          <div style={{ display: "flex", gap: "0.45rem", flexWrap: "wrap" }}>
            <button
              type="button"
              className="btn btn-sm btn-primary"
              onClick={() => setCookieDismissed(true)}
            >
              Accept All Enthusiastically
            </button>
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => setCookieDismissed(true)}
            >
              Accept Reluctantly (Sigh Logged)
            </button>
          </div>
        </div>
      )}

      {/* Unhelpful Support Bot */}
      <div className="support-widget">
        {supportOpen && (
          <div className="support-panel">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderBottom: "2px solid var(--border)",
                paddingBottom: "0.45rem",
                marginBottom: "0.55rem"
              }}
            >
              <strong style={{ fontSize: "0.86rem" }}>
                🐐 Unhelpful Support (0% AI)
              </strong>
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => setSupportOpen(false)}
              >
                ✕
              </button>
            </div>
            <div
              style={{
                maxHeight: "170px",
                overflowY: "auto",
                fontSize: "0.8rem",
                display: "flex",
                flexDirection: "column",
                gap: "0.4rem",
                marginBottom: "0.55rem"
              }}
            >
              {supportMessages.map((m, idx) => (
                <div
                  key={idx}
                  style={{
                    background: m.from === "user" ? "var(--accent-soft)" : "#f5f2e8",
                    border: "1.5px solid var(--border)",
                    padding: "0.4rem 0.55rem"
                  }}
                >
                  <strong>{m.from === "user" ? "You: " : "Clerk #0: "}</strong>
                  {m.text}
                </div>
              ))}
            </div>
            <form onSubmit={handleSupportSubmit} style={{ display: "flex", gap: "0.35rem" }}>
              <input
                className="input-control"
                style={{ flex: 1, padding: "0.38rem 0.55rem", fontSize: "0.82rem" }}
                placeholder="Complain into the void..."
                value={supportInput}
                onChange={(e) => setSupportInput(e.target.value)}
              />
              <button type="submit" className="btn btn-sm btn-active">
                Yell
              </button>
            </form>
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button
            type="button"
            className="btn btn-hazard btn-sm"
            onClick={() => setSupportOpen((o) => !o)}
          >
            🐐 Live Unhelpful Help (Wait: 11 yrs)
          </button>
        </div>
      </div>
    </div>
  );
}
