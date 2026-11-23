import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  fetchHealth,
  fetchOrders,
  fetchProducts,
  fetchReturns,
  fetchWorkflowTrace,
  getApiBaseUrl,
  setApiBaseUrlOverride
} from "./api";
import { CheckoutModal } from "./components/CheckoutModal";
import { ConductorTraceDrawer } from "./components/ConductorTraceDrawer";
import { HeaderTicker } from "./components/HeaderTicker";
import { ReturnsPortal } from "./components/ReturnsPortal";
import { ReviewSection } from "./components/ReviewSection";
import { SupportDaveWidget } from "./components/SupportDaveWidget";
import type {
  CartItem,
  ChaosProduct,
  ChaosReview,
  HealthResponse,
  WorkflowExecutionTrace
} from "./types";

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"catalog" | "returns" | "orders">("catalog");
  const [products, setProducts] = useState<ChaosProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [health, setHealth] = useState<HealthResponse | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [sortMode, setSortMode] = useState<
    "featured" | "price_desc" | "price_asc" | "second_letter"
  >("featured");

  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

  const [orders, setOrders] = useState<Array<Record<string, any>>>([]);
  const [returnsList, setReturnsList] = useState<Array<Record<string, any>>>([]);
  const [prefillReturnOrder, setPrefillReturnOrder] = useState<{
    orderId: string;
    itemName: string;
    itemPrice: number;
  } | null>(null);

  const [activeTrace, setActiveTrace] = useState<WorkflowExecutionTrace | null>(null);
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [apiOverrideDraft, setApiOverrideDraft] = useState(getApiBaseUrl());
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    window.setTimeout(() => {
      setToastMsg((curr) => (curr === msg ? null : curr));
    }, 3400);
  };

  const refreshStoreData = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [prodRes, healthRes, ordersRes, returnsRes] = await Promise.all([
        fetchProducts(),
        fetchHealth().catch(() => null),
        fetchOrders().catch(() => ({ orders: [] })),
        fetchReturns().catch(() => ({ returns: [] }))
      ]);
      setProducts(prodRes.products);
      if (healthRes) setHealth(healthRes);
      setOrders(ordersRes.orders);
      setReturnsList(returnsRes.returns);
    } catch (err: any) {
      setLoadError(err?.message || "Failed to contact Chaos Commerce backend");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshStoreData();
  }, [refreshStoreData]);

  const addToCart = (product: ChaosProduct) => {
    setCart((prev) => {
      const idx = prev.findIndex((c) => c.product.id === product.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], quantity: copy[idx].quantity + 1 };
        return copy;
      }
      return [...prev, { product, quantity: 1 }];
    });
    showToast(`Added "${product.name}" ($${product.price.toLocaleString()}) to Regret Cart!`);
  };

  const updateCartQty = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((c) =>
          c.product.id === productId ? { ...c, quantity: c.quantity + delta } : c
        )
        .filter((c) => c.quantity > 0)
    );
  };

  const handleReviewAdded = (productId: string, review: ChaosReview) => {
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id !== productId) return p;
        const nextReviews = [review, ...p.reviews];
        const avg =
          Math.round(
            (nextReviews.reduce((s, r) => s + r.stars, 0) / nextReviews.length) * 10
          ) / 10;
        return {
          ...p,
          reviews: nextReviews,
          reviewCount: nextReviews.length,
          averageStars: avg
        };
      })
    );
  };

  const sortedProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const filtered = products.filter(
      (p) =>
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.tagline.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
    );

    const copy = [...filtered];
    if (sortMode === "price_desc") {
      copy.sort((a, b) => b.price - a.price);
    } else if (sortMode === "price_asc") {
      copy.sort((a, b) => a.price - b.price);
    } else if (sortMode === "second_letter") {
      copy.sort((a, b) => (a.name[1] || "").localeCompare(b.name[1] || ""));
    }
    return copy;
  }, [products, searchQuery, sortMode]);

  const selectedProduct = useMemo(
    () => products.find((p) => p.id === selectedProductId) || null,
    [products, selectedProductId]
  );

  const cartCount = cart.reduce((s, c) => s + c.quantity, 0);

  const openTraceById = async (workflowId: string) => {
    try {
      const res = await fetchWorkflowTrace(workflowId);
      setActiveTrace(res.trace);
    } catch (err: any) {
      showToast(`Could not load trace: ${err?.message || "Unknown error"}`);
    }
  };

  return (
    <div>
      <HeaderTicker
        activeTab={activeTab}
        onSelectTab={(t) => {
          setActiveTab(t);
          if (t === "orders") void refreshStoreData();
        }}
        cartCount={cartCount}
        onOpenCart={() => setCartOpen(true)}
        health={health}
        onOpenConfigModal={() => setConfigModalOpen(true)}
      />

      {toastMsg && (
        <div
          style={{
            position: "fixed",
            top: 84,
            right: 20,
            zIndex: 90,
            background: "#23153c",
            border: "2px solid var(--neon-yellow)",
            color: "#fff",
            padding: "0.65rem 1rem",
            borderRadius: 12,
            fontWeight: 700,
            fontSize: "0.84rem",
            boxShadow: "0 10px 28px rgba(0,0,0,0.6)"
          }}
        >
          🔔 {toastMsg}
        </div>
      )}

      <main className="main-wrap">
        {loadError && (
          <div
            style={{
              background: "rgba(255,59,59,0.14)",
              border: "1.5px solid var(--danger-red)",
              borderRadius: 12,
              padding: "1rem",
              marginBottom: "1.2rem"
            }}
          >
            <strong>⚠️ Backend Connection Snag:</strong> {loadError}{" "}
            <button
              type="button"
              className="btn-secondary"
              style={{ marginLeft: "0.6rem" }}
              onClick={() => setConfigModalOpen(true)}
            >
              Configure API URL
            </button>
          </div>
        )}

        {/* TAB 1: CURSED CATALOG */}
        {activeTab === "catalog" && (
          <>
            <section className="hero-banner">
              <div style={{ maxWidth: 780 }}>
                <span className="gauntlet-step-tag">
                  VOTED #47,812 IN CUSTOMER DELIGHT • ZERO RUNTIME AI APIS
                </span>
                <h2 style={{ margin: "0.35rem 0", fontSize: "1.75rem" }}>
                  Welcome to Chaos Commerce™ — Where Every Price Feels Like a Typo!
                </h2>
                <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "0.92rem" }}>
                  Marvel at $88,888 air-gapped extension cords, read{" "}
                  <strong style={{ color: "#ff8a8a" }}>5-star reviews full of volcanic rage</strong>{" "}
                  and{" "}
                  <strong style={{ color: "var(--neon-green)" }}>
                    2-star reviews full of ecstatic praise
                  </strong>
                  , try catching our cursor-dodging 1-star button, and run real{" "}
                  <strong style={{ color: "var(--neon-cyan)" }}>Conductor workflows</strong>{" "}
                  for every checkout and return!
                </p>
                <div className="hero-badges">
                  <span className="badge-chip">💸 Up to +16,333,200% Markup</span>
                  <span className="badge-chip">🏃‍♂️ Cursor-Dodging 1★ Button</span>
                  <span className="badge-chip">✅ 100% Deterministic Checkout</span>
                  <span className="badge-chip">⚖️ 5-Check Pointless Return Tribunal</span>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.55rem" }}>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => {
                    if (products[0]) addToCart(products[0]);
                    setCartOpen(true);
                  }}
                >
                  ⚡ Instant $4,899.99 Impulse Mistake
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setActiveTab("returns")}
                >
                  📋 Visit Pointless Returns Gauntlet
                </button>
              </div>
            </section>

            <div className="catalog-toolbar">
              <input
                className="input-control"
                style={{ minWidth: 260, flex: 1 }}
                placeholder="Search cursed inventory (ice cube, brick, banana, sock...)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <label style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                  Unhelpful Sort:
                </label>
                <select
                  className="select-control"
                  value={sortMode}
                  onChange={(e) => setSortMode(e.target.value as any)}
                >
                  <option value="featured">Curated by Warehouse Goblins</option>
                  <option value="price_desc">Price: Financially Ruinous → Painful</option>
                  <option value="price_asc">Price: Merely Absurd → Ruinous</option>
                  <option value="second_letter">Alphabetical by 2nd Letter</option>
                </select>
              </div>
            </div>

            {loading ? (
              <p>Summoning cursed inventory from Sub-Basement 4B...</p>
            ) : (
              <div className="product-grid">
                {sortedProducts.map((product) => {
                  const rageSample = product.reviews.find((r) => r.stars === 5);
                  const blissSample = product.reviews.find((r) => r.stars === 2);

                  return (
                    <article key={product.id} className="product-card">
                      <div>
                        <span className="markup-ribbon">{product.priceExcuse}</span>
                        <div
                          className="product-emoji-stage"
                          style={{ cursor: "pointer" }}
                          onClick={() => setSelectedProductId(product.id)}
                        >
                          <span>{product.emoji}</span>
                        </div>

                        <div
                          style={{
                            fontSize: "0.73rem",
                            color: "var(--neon-cyan)",
                            fontFamily: "var(--font-mono)"
                          }}
                        >
                          {product.sku} • {product.category}
                        </div>
                        <h3 style={{ margin: "0.25rem 0 0.35rem 0", fontSize: "1.08rem" }}>
                          {product.name}
                        </h3>
                        <p
                          style={{
                            margin: 0,
                            fontSize: "0.84rem",
                            color: "var(--text-muted)"
                          }}
                        >
                          {product.tagline}
                        </p>

                        <div className="price-block">
                          <div>
                            <span className="ridiculous-price">
                              $
                              {product.price.toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2
                              })}
                            </span>
                            <span className="was-price">
                              Was <del>${product.compareAtPrice.toFixed(2)}</del>
                            </span>
                          </div>
                          <div className="price-excuse">📦 {product.stockNotice}</div>
                        </div>

                        {/* Mini Review Teasers: 5★ Fury & 2★ Praise */}
                        <div
                          style={{
                            fontSize: "0.75rem",
                            background: "#120e1e",
                            borderRadius: 9,
                            padding: "0.55rem 0.65rem",
                            border: "1px solid #2b2142"
                          }}
                        >
                          {rageSample && (
                            <div style={{ marginBottom: "0.3rem", color: "#ffb0b0" }}>
                              <strong>★★★★★:</strong> "{rageSample.title.slice(0, 54)}..."
                            </div>
                          )}
                          {blissSample && (
                            <div style={{ color: "#9ef7c8" }}>
                              <strong>★★☆☆☆:</strong> "{blissSample.title.slice(0, 54)}..."
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="card-actions">
                        <button
                          type="button"
                          className="btn-primary"
                          onClick={() => addToCart(product)}
                        >
                          🛒 Add to Cart
                        </button>
                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={() => setSelectedProductId(product.id)}
                          data-testid={`reviews-btn-${product.id}`}
                        >
                          ★ Reviews ({product.reviewCount})
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* TAB 2: POINTLESS RETURNS GAUNTLET */}
        {activeTab === "returns" && (
          <ReturnsPortal
            products={products}
            recentOrders={orders}
            prefillOrder={prefillReturnOrder}
            onReturnCompleted={(res) => {
              showToast(`Return ${res.returnId} reached decision: ${res.decision?.decisionCode}!`);
              void refreshStoreData();
            }}
            onInspectTrace={(trace) => setActiveTrace(trace)}
          />
        )}

        {/* TAB 3: ORDERS & CONDUCTOR WORKFLOW LOGS */}
        {activeTab === "orders" && (
          <div>
            <div className="hero-banner">
              <div>
                <span className="gauntlet-step-tag">DURABLE CONDUCTOR EXECUTION LEDGER</span>
                <h2 style={{ margin: "0.3rem 0" }}>
                  ⚙️ Completed Checkouts &amp; Return Verdicts on Conductor
                </h2>
                <p style={{ margin: 0, fontSize: "0.86rem", color: "var(--text-muted)" }}>
                  Fetched live from Conductor workflow search (
                  <code>chaos_checkout_workflow</code> &amp; <code>chaos_return_workflow</code>).
                </p>
              </div>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => void refreshStoreData()}
              >
                🔄 Refresh From Conductor
              </button>
            </div>

            <div className="gauntlet-grid">
              <div className="gauntlet-box">
                <h3 style={{ marginTop: 0 }}>🧾 Completed Checkouts ({orders.length})</h3>
                {orders.length === 0 ? (
                  <p style={{ color: "var(--text-muted)", fontSize: "0.86rem" }}>
                    No checkouts yet. Buy something absurd in the Catalog!
                  </p>
                ) : (
                  orders.map((ord) => (
                    <div key={ord.workflowId} className="review-card">
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: "0.3rem"
                        }}
                      >
                        <strong style={{ color: "var(--neon-yellow)" }}>
                          {ord.orderId}
                        </strong>
                        <span className="status-pill COMPLETED">{ord.status}</span>
                      </div>
                      <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                        Total: <strong>${Number(ord.receipt?.grandTotal || 0).toFixed(2)}</strong> •
                        Carrier: {ord.carrierName} • Payment Passes: {ord.paymentAttempts || 2}
                      </div>
                      <div
                        style={{
                          display: "flex",
                          gap: "0.45rem",
                          flexWrap: "wrap",
                          marginTop: "0.55rem"
                        }}
                      >
                        <button
                          type="button"
                          className="btn-secondary"
                          style={{ padding: "0.3rem 0.65rem", fontSize: "0.75rem" }}
                          onClick={() => void openTraceById(ord.workflowId)}
                        >
                          ⚙️ View Conductor Trace
                        </button>
                        <button
                          type="button"
                          className="btn-secondary"
                          style={{ padding: "0.3rem 0.65rem", fontSize: "0.75rem" }}
                          onClick={() => {
                            const item = ord.receipt?.items?.[0];
                            setPrefillReturnOrder({
                              orderId: ord.orderId,
                              itemName: item?.name || products[0]?.name || "Mystery Item",
                              itemPrice: Number(item?.lineTotal || ord.receipt?.grandTotal || 99.99)
                            });
                            setActiveTab("returns");
                          }}
                        >
                          📋 File Pointless Return
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="gauntlet-box">
                <h3 style={{ marginTop: 0 }}>
                  ⚖️ Return Tribunal Decisions ({returnsList.length})
                </h3>
                {returnsList.length === 0 ? (
                  <p style={{ color: "var(--text-muted)", fontSize: "0.86rem" }}>
                    No return decisions yet. Test the Pointless Returns Gauntlet!
                  </p>
                ) : (
                  returnsList.map((ret) => (
                    <div key={ret.workflowId} className="review-card">
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: "0.3rem"
                        }}
                      >
                        <strong style={{ color: "var(--neon-cyan)" }}>
                          {ret.returnId} (Order {ret.orderId})
                        </strong>
                        <span className="status-pill COMPLETED">DECIDED</span>
                      </div>
                      <div style={{ fontSize: "0.82rem", fontWeight: 700 }}>
                        {ret.decisionCode} — Score {ret.totalScore}/100
                      </div>
                      <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                        Cash Refund: ${Number(ret.refundAmount || 0).toFixed(2)} • Chaos Bucks: $
                        {Number(ret.chaosBucksCredit || 0).toFixed(2)}
                      </div>
                      <button
                        type="button"
                        className="btn-secondary"
                        style={{
                          padding: "0.3rem 0.65rem",
                          fontSize: "0.75rem",
                          marginTop: "0.5rem"
                        }}
                        onClick={() => void openTraceById(ret.workflowId)}
                      >
                        ⚙️ View Conductor Trace
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* PRODUCT DETAILS + DODGING 1-STAR REVIEW MODAL */}
      {selectedProduct && (
        <div className="modal-backdrop" onClick={() => setSelectedProductId(null)}>
          <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <span className="markup-ribbon">{selectedProduct.priceExcuse}</span>
                <h2 style={{ margin: "0.2rem 0 0 0" }}>
                  {selectedProduct.emoji} {selectedProduct.name}
                </h2>
              </div>
              <button
                type="button"
                className="close-x"
                onClick={() => setSelectedProductId(null)}
              >
                ✕
              </button>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                gap: "1rem",
                marginBottom: "1rem"
              }}
            >
              <div className="price-block" style={{ margin: 0 }}>
                <div className="ridiculous-price">
                  $
                  {selectedProduct.price.toLocaleString(undefined, {
                    minimumFractionDigits: 2
                  })}
                </div>
                <div className="was-price" style={{ marginLeft: 0 }}>
                  Originally <del>${selectedProduct.compareAtPrice.toFixed(2)}</del>
                </div>
                <p style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
                  📍 Warehouse Bin: <strong>{selectedProduct.cursedWarehouseLocation}</strong>
                  <br />⚖️ Weight: {selectedProduct.weightDescription}
                </p>
                <button
                  type="button"
                  className="btn-primary"
                  style={{ width: "100%" }}
                  onClick={() => addToCart(selectedProduct)}
                >
                  🛒 Add to Regret Cart (${selectedProduct.price.toLocaleString()})
                </button>
              </div>

              <div
                style={{
                  background: "#120e1e",
                  border: "1px solid var(--border-loud)",
                  borderRadius: 12,
                  padding: "0.85rem 1rem",
                  fontSize: "0.84rem"
                }}
              >
                <strong style={{ color: "var(--neon-cyan)" }}>
                  🔬 Questionable Specifications:
                </strong>
                <ul style={{ paddingLeft: "1.2rem", margin: "0.45rem 0" }}>
                  {selectedProduct.specs.map((sp, i) => (
                    <li key={i}>{sp}</li>
                  ))}
                </ul>
                <div style={{ fontSize: "0.75rem", color: "#ff9e9e" }}>
                  ⚖️ {selectedProduct.legalDisclaimer}
                </div>
              </div>
            </div>

            <ReviewSection
              product={selectedProduct}
              onReviewAdded={handleReviewAdded}
            />
          </div>
        </div>
      )}

      {/* CHECKOUT MODAL */}
      <CheckoutModal
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        cart={cart}
        fallbackProduct={products[0]}
        onUpdateQty={updateCartQty}
        onAddFallback={(p) => addToCart(p)}
        onClearCart={() => setCart([])}
        onOrderCompleted={() => void refreshStoreData()}
        onInspectTrace={(t) => setActiveTrace(t)}
        onStartReturnFromOrder={(info) => {
          setPrefillReturnOrder(info);
          setActiveTab("returns");
        }}
      />

      {/* CONDUCTOR TRACE DRAWER */}
      <ConductorTraceDrawer
        trace={activeTrace}
        onClose={() => setActiveTrace(null)}
      />

      {/* CONDUCTOR STATUS & API CONFIG MODAL */}
      {configModalOpen && (
        <div className="modal-backdrop" onClick={() => setConfigModalOpen(false)}>
          <div
            className="modal-panel"
            style={{ maxWidth: 600 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3 style={{ margin: 0 }}>⚙️ Conductor &amp; Cloud Deployment Diagnostics</h3>
              <button
                type="button"
                className="close-x"
                onClick={() => setConfigModalOpen(false)}
              >
                ✕
              </button>
            </div>

            <div style={{ fontSize: "0.85rem", marginBottom: "1rem" }}>
              <p style={{ marginTop: 0 }}>
                <strong>Conductor API URL:</strong>{" "}
                <code>{health?.conductor?.serverUrl || "Unknown"}</code>
              </p>
              <p>
                <strong>Conductor UI:</strong>{" "}
                {health?.conductor?.uiUrl ? (
                  <a
                    href={health.conductor.uiUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: "var(--neon-cyan)" }}
                  >
                    {health.conductor.uiUrl} ↗
                  </a>
                ) : (
                  "N/A"
                )}
              </p>
              <p>
                <strong>Worker Mode:</strong>{" "}
                <code>{health?.conductor?.workerMode || "daemon"}</code> •{" "}
                <strong>Runtime AI APIs Called:</strong> <code>false</code>
              </p>
              <p>
                <strong>Registered Workflows:</strong>{" "}
                <code>
                  {(health?.conductor?.registeredWorkflows || []).join(", ") || "None"}
                </code>
              </p>
            </div>

            <div
              style={{
                background: "#110d1c",
                border: "1px solid var(--border-loud)",
                borderRadius: 12,
                padding: "0.9rem"
              }}
            >
              <label style={{ fontSize: "0.8rem", fontWeight: 700 }}>
                Frontend → Backend API Base URL (For GitHub Pages → AWS Lambda):
              </label>
              <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", margin: "0.25rem 0 0.5rem" }}>
                Leave blank when served together at <code>http://localhost:3000</code>, or set to
                your AWS Lambda Function URL / API Gateway endpoint.
              </p>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <input
                  className="input-control"
                  style={{ flex: 1 }}
                  placeholder="https://xxxx.lambda-url.us-east-1.on.aws"
                  value={apiOverrideDraft}
                  onChange={(e) => setApiOverrideDraft(e.target.value)}
                />
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => {
                    setApiBaseUrlOverride(apiOverrideDraft);
                    setConfigModalOpen(false);
                    void refreshStoreData();
                  }}
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <SupportDaveWidget />
    </div>
  );
};
