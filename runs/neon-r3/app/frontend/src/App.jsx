import React, { useEffect, useMemo, useState } from 'react';
import { fetchHealth, fetchOrders, fetchProducts, fetchReturns } from './api';
import { ProductArtwork } from './components/ProductArtwork';
import { ProductModal } from './components/ProductModal';
import { CheckoutPanel } from './components/CheckoutPanel';
import { ReturnsPanel } from './components/ReturnsPanel';
import { OrdersInspector } from './components/OrdersInspector';
import { ChadSupportWidget } from './components/ChadSupportWidget';

function getTabFromHash() {
  const h = window.location.hash.replace(/^#\/?/, '');
  if (h === 'cart' || h === 'returns' || h === 'orders') return h;
  return 'shop';
}

export function App() {
  const [tab, setTab] = useState(getTabFromHash);
  const [products, setProducts] = useState([]);
  const [health, setHealth] = useState(null);
  const [orders, setOrders] = useState([]);
  const [returnsList, setReturnsList] = useState([]);
  const [loadingLedger, setLoadingLedger] = useState(false);

  const [category, setCategory] = useState('All');
  const [sortBy, setSortBy] = useState('chaos');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [cart, setCart] = useState([]);
  const [prefillReturnOrder, setPrefillReturnOrder] = useState(null);

  // Absurd resetting countdown timer (always resets when it hits 1s!)
  const [saleSeconds, setSaleSeconds] = useState(9);
  const [saleResetCount, setSaleResetCount] = useState(0);

  // Dismissible 4,118-cookie banner
  const [showCookies, setShowCookies] = useState(true);
  const [toast, setToast] = useState('');

  function showToastMessage(msg) {
    setToast(msg);
    window.clearTimeout(window.__chaosToastTimer);
    window.__chaosToastTimer = window.setTimeout(() => setToast(''), 3400);
  }

  function navigate(nextTab) {
    setTab(nextTab);
    window.location.hash = `#/${nextTab}`;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  useEffect(() => {
    const onHashChange = () => setTab(getTabFromHash());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setSaleSeconds((prev) => {
        if (prev <= 1) {
          setSaleResetCount((c) => c + 1);
          return 9;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  async function refreshLedger() {
    setLoadingLedger(true);
    try {
      const [ordRes, retRes] = await Promise.all([fetchOrders(), fetchReturns()]);
      setOrders(ordRes.orders || []);
      setReturnsList(retRes.returns || []);
    } catch {
      // Keep existing state on transient error
    } finally {
      setLoadingLedger(false);
    }
  }

  useEffect(() => {
    fetchProducts()
      .then((res) => setProducts(res.products || []))
      .catch((err) => showToastMessage(`Failed to load catalog: ${err.message}`));

    fetchHealth()
      .then(setHealth)
      .catch(() => setHealth({ conductor: { reachable: false } }));

    refreshLedger();
  }, []);

  const categories = useMemo(() => ['All', ...new Set(products.map((p) => p.category))], [products]);

  const displayedProducts = useMemo(() => {
    const filtered = category === 'All' ? products : products.filter((p) => p.category === category);
    const copy = [...filtered];
    if (sortBy === 'price-desc') copy.sort((a, b) => b.price - a.price);
    else if (sortBy === 'price-asc') copy.sort((a, b) => a.price - b.price);
    else if (sortBy === 'fury') {
      copy.sort(
        (a, b) =>
          b.reviews.filter((r) => r.rating === 5).length - a.reviews.filter((r) => r.rating === 5).length,
      );
    } else if (sortBy === 'praise') {
      copy.sort(
        (a, b) =>
          b.reviews.filter((r) => r.rating === 2).length - a.reviews.filter((r) => r.rating === 2).length,
      );
    }
    return copy;
  }, [products, category, sortBy]);

  function addToCart(product) {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === product.id);
      if (existing) {
        return prev.map((i) => (i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i));
      }
      return [...prev, { id: product.id, name: product.name, price: product.price, quantity: 1 }];
    });
    showToastMessage(`Added "${product.name}" to your Regret Cart!`);
  }

  function updateCartQty(productId, nextQty) {
    if (nextQty <= 0) {
      setCart((prev) => prev.filter((i) => i.id !== productId));
      return;
    }
    setCart((prev) => prev.map((i) => (i.id === productId ? { ...i, quantity: nextQty } : i)));
  }

  function handleReviewAdded(updatedProduct) {
    setProducts((prev) => prev.map((p) => (p.id === updatedProduct.id ? updatedProduct : p)));
    setSelectedProduct(updatedProduct);
  }

  function handleStartReturnForOrder(order) {
    setPrefillReturnOrder(order);
    navigate('returns');
  }

  const cartCount = cart.reduce((sum, i) => sum + i.quantity, 0);
  const conductorConnected = Boolean(health?.conductor?.reachable);

  return (
    <div>
      {/* Fake Resetting Urgency Banner */}
      <div className="urgency-bar">
        <span>
          🚨 FLASH SALE ENDS IN{' '}
          <span className="urgency-timer">00:0{saleSeconds}</span>
        </span>
        <span>
          {saleResetCount > 0
            ? `OH NO, WE EXTENDED IT AGAIN (×${saleResetCount}) — PRICES GOING UP 0.01% SOON!`
            : 'FREE SHIPPING ON ORDERS OVER $999,999.00 (+$39.95 FREE SHIPPING HANDLING FEE)'}
        </span>
      </div>

      {/* Header */}
      <header className="site-header">
        <div className="header-inner">
          <button type="button" className="brand-btn" onClick={() => navigate('shop')}>
            <div className="brand-mark">CC</div>
            <div>
              <h1 className="brand-title">CHAOS COMMERCE™</h1>
              <div className="brand-sub">Disrupting Common Sense Since Five Minutes Ago</div>
            </div>
          </button>

          <nav className="nav-tabs" aria-label="Main navigation">
            <button type="button" className={`nav-btn ${tab === 'shop' ? 'active' : ''}`} onClick={() => navigate('shop')}>
              🛍️ Shop Junk
            </button>
            <button type="button" className={`nav-btn ${tab === 'cart' ? 'active' : ''}`} onClick={() => navigate('cart')}>
              🛒 Regret Cart {cartCount > 0 && <span className="cart-pill">{cartCount}</span>}
            </button>
            <button
              type="button"
              className={`nav-btn ${tab === 'returns' ? 'active' : ''}`}
              onClick={() => navigate('returns')}
            >
              📋 Returns Bureaucracy
            </button>
            <button
              type="button"
              className={`nav-btn ${tab === 'orders' ? 'active' : ''}`}
              onClick={() => {
                navigate('orders');
                refreshLedger();
              }}
            >
              ⚙️ Conductor Ledger ({orders.length + returnsList.length})
            </button>

            <span className={`status-pill ${conductorConnected ? '' : 'offline'}`}>
              {conductorConnected ? '● Conductor Live' : '○ Conductor Offline'}
            </span>
          </nav>
        </div>
      </header>

      {/* Main View */}
      <main className="main-container">
        {tab === 'shop' && (
          <>
            <section className="hero-banner">
              <div>
                <span className="hero-kicker">Voted #1 Store Shoppers Cannot Believe Is Still Legal</span>
                <h1>Ridiculous Prices. Hostile UX. Rock-Solid Conductor Workflows Underneath.</h1>
                <p>
                  Read incandescent <strong>5-star fury</strong> and ecstatic <strong>2-star praise</strong>, try to
                  catch our runaway <strong>1-star button</strong>, survive absurd checkout fees, and battle our
                  pointless returns gauntlet—backed by real <strong>Conductor</strong> workflows that always complete
                  and always reach a decision.
                </p>
              </div>
              <div className="hero-stats">
                <div className="stat-box">
                  <div className="stat-value">4.9★</div>
                  <div className="stat-label">Average Rating (All Rage)</div>
                </div>
                <div className="stat-box">
                  <div className="stat-value">0%</div>
                  <div className="stat-label">AI APIs Called at Runtime</div>
                </div>
                <div className="stat-box">
                  <div className="stat-value">100%</div>
                  <div className="stat-label">Checkout Completion Rate</div>
                </div>
                <div className="stat-box">
                  <div className="stat-value">7 Checks</div>
                  <div className="stat-label">Per Return Workflow</div>
                </div>
              </div>
            </section>

            <div className="controls-bar">
              <div className="category-pills">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    className={`pill-btn ${category === cat ? 'active' : ''}`}
                    onClick={() => setCategory(cat)}
                  >
                    {cat}
                  </button>
                ))}
              </div>
              <select className="sort-select" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                <option value="chaos">Sort: Chaos Order</option>
                <option value="price-desc">Sort: Most Overpriced</option>
                <option value="price-asc">Sort: Least Overpriced (Still Painful)</option>
                <option value="fury">Sort: Highest 5★ Fury</option>
                <option value="praise">Sort: Most 2★ Gratitude</option>
              </select>
            </div>

            <div className="product-grid">
              {displayedProducts.map((product) => {
                const topFury = product.reviews.find((r) => r.rating === 5);
                return (
                  <article key={product.id} className="product-card" data-testid={`product-card-${product.id}`}>
                    <div className="card-art-wrap" onClick={() => setSelectedProduct(product)}>
                      <span className="card-badge">{product.badge}</span>
                      <ProductArtwork artwork={product.artwork} size={150} />
                      <span className="card-watchers">👀 {product.watchers.toLocaleString()} regretting</span>
                    </div>

                    <div className="card-body">
                      <span className="card-cat">{product.category}</span>
                      <h2 className="card-title" onClick={() => setSelectedProduct(product)}>
                        {product.name}
                      </h2>
                      <p className="card-tagline">{product.tagline}</p>

                      <div className="price-row">
                        <span className="price-now">
                          ${product.price.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                        <span className="price-was">
                          Was ${product.wasPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                      </div>

                      <div className="stock-warning">{product.stockText}</div>

                      {topFury && (
                        <div className="review-teaser">
                          <strong>★★★★★</strong> "{topFury.title}"
                        </div>
                      )}

                      <div className="card-actions">
                        <button type="button" className="btn btn-primary" onClick={() => addToCart(product)}>
                          + Add to Cart
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost"
                          onClick={() => setSelectedProduct(product)}
                        >
                          Reviews ({product.reviewCount})
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </>
        )}

        {tab === 'cart' && (
          <CheckoutPanel
            cart={cart}
            onUpdateQty={updateCartQty}
            onClearCart={() => setCart([])}
            onCheckoutComplete={(order) => {
              setOrders((prev) => [order, ...prev]);
              showToastMessage(`Order ${order.orderId} completed via Conductor!`);
            }}
            onStartReturnForOrder={handleStartReturnForOrder}
            onGoShop={() => navigate('shop')}
          />
        )}

        {tab === 'returns' && (
          <ReturnsPanel
            orders={orders}
            prefillOrder={prefillReturnOrder}
            onReturnComplete={(ret) => {
              setReturnsList((prev) => [ret, ...prev]);
              showToastMessage(`Return ${ret.returnId} reached decision: ${ret.decision?.decision}!`);
            }}
          />
        )}

        {tab === 'orders' && (
          <OrdersInspector
            orders={orders}
            returns={returnsList}
            loading={loadingLedger}
            onRefresh={refreshLedger}
            onStartReturnForOrder={handleStartReturnForOrder}
          />
        )}
      </main>

      {/* Product Detail + Dodging 1★ Review Modal */}
      {selectedProduct && (
        <ProductModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onAddToCart={addToCart}
          onReviewAdded={handleReviewAdded}
        />
      )}

      {/* Cookie Consent Parody Bar */}
      {showCookies && (
        <div className="cookie-banner">
          <div style={{ fontSize: '0.82rem', maxWidth: '410px' }}>
            🍪 <strong>We use 4,118 cookies, 3 biscuits, and one haunted scone</strong> to maximize your checkout
            regret. No actual trackers are loaded.
          </div>
          <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-primary"
              style={{ padding: '0.4rem 0.7rem', fontSize: '0.78rem' }}
              onClick={() => {
                setShowCookies(false);
                showToastMessage('Adopted all 4,118 cookies and one haunted scone.');
              }}
            >
              Accept All
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              style={{ padding: '0.4rem 0.7rem', fontSize: '0.78rem' }}
              onClick={() => {
                setShowCookies(false);
                showToastMessage('Rejected 1 cookie (4,117 imaginary cookies remain).');
              }}
            >
              Reject (Keeps 4,117)
            </button>
          </div>
        </div>
      )}

      {/* Floating Deterministic Support Bot */}
      <ChadSupportWidget />

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
