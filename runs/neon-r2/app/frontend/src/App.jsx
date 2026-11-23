import React, { useCallback, useEffect, useMemo, useState } from "react";
import { AlertOctagon, Search, SlidersHorizontal } from "lucide-react";
import { api } from "./api.js";
import ChaosHeader from "./components/ChaosHeader.jsx";
import ProductCard from "./components/ProductCard.jsx";
import ProductModal from "./components/ProductModal.jsx";
import CartDrawer from "./components/CartDrawer.jsx";
import CheckoutModal from "./components/CheckoutModal.jsx";
import ReturnsCenter from "./components/ReturnsCenter.jsx";
import CustomerDisservice from "./components/CustomerDisservice.jsx";

export default function App() {
  const [activeTab, setActiveTab] = useState("shop");
  const [products, setProducts] = useState([]);
  const [shippingMethods, setShippingMethods] = useState([]);
  const [tickerItems, setTickerItems] = useState([]);
  const [returnReasons, setReturnReasons] = useState([]);
  const [zodiacSigns, setZodiacSigns] = useState([]);
  const [conductorUiUrl, setConductorUiUrl] = useState("");
  const [health, setHealth] = useState(null);
  const [loadError, setLoadError] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [sortBy, setSortBy] = useState("featured");

  const [inspectedProductId, setInspectedProductId] = useState(null);
  const [cart, setCart] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [includeBox, setIncludeBox] = useState(true);
  const [includeInsurance, setIncludeInsurance] = useState(false);
  const [promoCode, setPromoCode] = useState("");
  const [promoPreview, setPromoPreview] = useState(null);

  const [orders, setOrders] = useState([]);
  const [returnsHistory, setReturnsHistory] = useState([]);
  const [preselectedOrderForReturn, setPreselectedOrderForReturn] = useState(null);
  const [toast, setToast] = useState("");

  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => {
      setToast((current) => (current === msg ? "" : current));
    }, 3200);
  }, []);

  const refreshHistory = useCallback(async () => {
    try {
      const [ordersRes, returnsRes] = await Promise.all([api.getOrders(), api.getReturns()]);
      if (Array.isArray(ordersRes?.orders)) setOrders(ordersRes.orders);
      if (Array.isArray(returnsRes?.returns)) setReturnsHistory(returnsRes.returns);
    } catch {
      // Non-fatal if Conductor search index is warming up
    }
  }, []);

  useEffect(() => {
    let active = true;
    async function bootstrap() {
      try {
        const [prodRes, cfgRes, healthRes] = await Promise.all([
          api.getProducts(),
          api.getConfig(),
          api.getHealth().catch(() => null),
        ]);
        if (!active) return;
        setProducts(prodRes.products || []);
        setShippingMethods(cfgRes.shippingMethods || prodRes.shippingMethods || []);
        setTickerItems(cfgRes.regretTicker || prodRes.regretTicker || []);
        setReturnReasons(cfgRes.returnReasons || []);
        setZodiacSigns(cfgRes.zodiacSigns || []);
        setConductorUiUrl(cfgRes.conductorUiUrl || "");
        setHealth(healthRes);
        await refreshHistory();
      } catch (err) {
        if (!active) return;
        setLoadError(err.message);
      }
    }
    bootstrap();
    return () => {
      active = false;
    };
  }, [refreshHistory]);

  const categories = useMemo(() => {
    const set = new Set(["All"]);
    products.forEach((p) => set.add(p.category));
    return Array.from(set);
  }, [products]);

  const displayedProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const filtered = products.filter((p) => {
      const catOk = selectedCategory === "All" || p.category === selectedCategory;
      const textOk =
        !q ||
        p.title.toLowerCase().includes(q) ||
        p.tagline.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q);
      return catOk && textOk;
    });

    const sorted = [...filtered];
    if (sortBy === "price-desc") {
      sorted.sort((a, b) => b.price - a.price);
    } else if (sortBy === "price-asc") {
      sorted.sort((a, b) => a.price - b.price);
    } else if (sortBy === "regret-desc") {
      sorted.sort((a, b) => b.regretCounter - a.regretCounter);
    }
    return sorted;
  }, [products, searchQuery, selectedCategory, sortBy]);

  const inspectedProduct = useMemo(
    () => products.find((p) => p.id === inspectedProductId) || null,
    [products, inspectedProductId]
  );

  const handleAddToCart = (product) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === product.id);
      if (existing) {
        return prev.map((i) => (i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i));
      }
      return [...prev, { ...product, quantity: 1 }];
    });
    showToast(`Added "${product.title}" to Cart of Regrets. Why did you do that?`);
  };

  const handleUpdateQty = (id, qty) => {
    if (qty <= 0) {
      setCart((prev) => prev.filter((i) => i.id !== id));
      return;
    }
    setCart((prev) => prev.map((i) => (i.id === id ? { ...i, quantity: qty } : i)));
  };

  const handleRemoveFromCart = (id) => {
    setCart((prev) => prev.filter((i) => i.id !== id));
  };

  const handleSubmitReview = async (productId, payload) => {
    const res = await api.submitReview(productId, payload);
    if (res.product) {
      setProducts((prev) => prev.map((p) => (p.id === productId ? res.product : p)));
    }
    showToast(`Published ${payload.rating}★ review!`);
    return res;
  };

  const handleOrderCompleted = (exec) => {
    setOrders((prev) => [exec, ...prev.filter((o) => o.workflowId !== exec.workflowId)]);
    setCart([]);
    setPromoCode("");
    setPromoPreview(null);
    showToast(`Order ${exec.output?.orderId || ""} completed on Conductor!`);
    refreshHistory();
  };

  const handleStartReturnFromReceipt = (orderExec) => {
    setCheckoutOpen(false);
    setPreselectedOrderForReturn(orderExec);
    setActiveTab("returns");
  };

  const handleReturnCompleted = (exec) => {
    setReturnsHistory((prev) => [exec, ...prev.filter((r) => r.workflowId !== exec.workflowId)]);
    showToast(`Return decree reached: ${exec.output?.decisionLabel || exec.status}`);
    refreshHistory();
  };

  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);
  const cartSubtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);

  return (
    <div className="app-shell">
      <ChaosHeader
        activeTab={activeTab}
        onTabChange={setActiveTab}
        cartCount={cartCount}
        cartSubtotal={cartSubtotal}
        onOpenCart={() => setCartOpen(true)}
        tickerItems={tickerItems}
        health={health}
        conductorUiUrl={conductorUiUrl}
        ordersCount={orders.length}
      />

      {toast && <div className="toast-banner">{toast}</div>}

      <main className="main-container">
        {loadError && (
          <div className="alert-error fatal-load">
            <AlertOctagon size={18} />
            <span>
              Could not reach the Chaos Commerce backend API: <strong>{loadError}</strong>. Make sure the server is running!
            </span>
          </div>
        )}

        {activeTab === "shop" && (
          <>
            {/* Parody Hero Banner */}
            <section className="hero-banner">
              <div className="hero-left">
                <span className="hero-pill">CERTIFIED TERRIBLE SINCE 2019</span>
                <h2>Ridiculous Prices. Furious 5★ Reviews. A 1★ Button You Cannot Catch.</h2>
                <p>
                  Welcome to <strong>Chaos Commerce</strong>—the only online store brave enough to hike prices during a flash sale, charge $42 for a cardboard box, and consult an office ficus before deciding your return. Yet behind every joke, checkout{" "}
                  <strong>always completes</strong> and every return <strong>always reaches a decision</strong> via real Conductor workflows.
                </p>
              </div>
              <div className="hero-stats">
                <div className="hero-stat-box">
                  <strong>5.0★</strong>
                  <span>Average Rage</span>
                </div>
                <div className="hero-stat-box">
                  <strong>2.0★</strong>
                  <span>Average Praise</span>
                </div>
                <div className="hero-stat-box">
                  <strong>0</strong>
                  <span>1★ Buttons Caught</span>
                </div>
              </div>
            </section>

            {/* Search, Filter & Satirical Sort Bar */}
            <section className="toolbar">
              <div className="search-wrap">
                <Search size={17} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search for terrible decisions (e.g. sock, forklift, brick, satellite)..."
                  className="search-input"
                />
              </div>

              <div className="category-bar">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    className={`cat-btn ${selectedCategory === cat ? "cat-btn-active" : ""}`}
                    onClick={() => setSelectedCategory(cat)}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <label className="sort-wrap">
                <SlidersHorizontal size={15} />
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                  <option value="featured">Sort: Featured Bad Ideas</option>
                  <option value="price-desc">Price: Absurd → Financial Ruin</option>
                  <option value="price-asc">Price: Suspiciously Cheap → Overpriced</option>
                  <option value="regret-desc">Most Regretted Right Now</option>
                </select>
              </label>
            </section>

            {/* Product Grid */}
            <section className="product-grid">
              {displayedProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onInspect={(p) => setInspectedProductId(p.id)}
                  onAddToCart={handleAddToCart}
                />
              ))}
            </section>
          </>
        )}

        {activeTab === "returns" && (
          <ReturnsCenter
            orders={orders}
            returnsHistory={returnsHistory}
            preselectedOrder={preselectedOrderForReturn}
            returnReasons={returnReasons}
            zodiacSigns={zodiacSigns}
            onReturnCompleted={handleReturnCompleted}
            onRefreshHistory={refreshHistory}
          />
        )}
      </main>

      <footer className="chaos-footer">
        <p>
          <strong>CHAOS COMMERCE™</strong> — Parody storefront powered by{" "}
          <strong>Conductor</strong> workflows (<code>chaos_checkout_workflow</code> &amp;{" "}
          <code>chaos_return_workflow</code>). Zero real payments. Zero AI APIs at runtime. 100% questionable merchandise.
        </p>
      </footer>

      <ProductModal
        product={inspectedProduct}
        onClose={() => setInspectedProductId(null)}
        onAddToCart={handleAddToCart}
        onSubmitReview={handleSubmitReview}
      />

      <CartDrawer
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        items={cart}
        onUpdateQty={handleUpdateQty}
        onRemove={handleRemoveFromCart}
        includeBox={includeBox}
        onToggleBox={setIncludeBox}
        includeInsurance={includeInsurance}
        onToggleInsurance={setIncludeInsurance}
        promoCode={promoCode}
        onPromoCodeChange={setPromoCode}
        promoPreview={promoPreview}
        onPromoPreview={setPromoPreview}
        onProceedCheckout={() => {
          setCartOpen(false);
          setCheckoutOpen(true);
        }}
      />

      <CheckoutModal
        open={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        items={cart}
        shippingMethods={shippingMethods}
        includeBox={includeBox}
        includeInsurance={includeInsurance}
        promoCode={promoCode}
        onOrderCompleted={handleOrderCompleted}
        onStartReturnForOrder={handleStartReturnFromReceipt}
      />

      <CustomerDisservice />
    </div>
  );
}
