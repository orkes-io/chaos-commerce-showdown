import React, { useEffect, useState } from "react";
import { AlertTriangle, ExternalLink, RotateCcw, ShoppingCart, Store, Zap } from "lucide-react";

export default function ChaosHeader({
  activeTab,
  onTabChange,
  cartCount,
  cartSubtotal,
  onOpenCart,
  tickerItems,
  health,
  conductorUiUrl,
  ordersCount,
}) {
  const [secondsSinceSaleEnded, setSecondsSinceSaleEnded] = useState(247);

  useEffect(() => {
    const id = setInterval(() => setSecondsSinceSaleEnded((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const mins = Math.floor(secondsSinceSaleEnded / 60);
  const secs = String(secondsSinceSaleEnded % 60).padStart(2, "0");

  const tickerText = (tickerItems || []).join("   ★   ");

  return (
    <header className="chaos-header">
      {/* Anti-Urgency Sale Ended Banner */}
      <div className="hazard-banner">
        <Zap size={16} />
        <span>
          FLASH SALE ENDED <strong>{mins}m {secs}s AGO!</strong> ALL PRICES AUTOMATICALLY INCREASED BY 18%! HURRY BEFORE THEY RISE AGAIN!
        </span>
        <Zap size={16} />
      </div>

      {/* Main Nav Bar */}
      <div className="nav-shell">
        <div className="brand-block" onClick={() => onTabChange("shop")} role="button" tabIndex={0}>
          <div className="brand-logo">CC</div>
          <div>
            <h1 className="brand-title">CHAOS COMMERCE™</h1>
            <p className="brand-sub">
              &ldquo;How Is This Store Still Legally Operating?&rdquo; — Rated 5.0★ of Pure Rage
            </p>
          </div>
        </div>

        <nav className="nav-actions">
          <button
            type="button"
            className={`nav-btn ${activeTab === "shop" ? "nav-btn-active" : ""}`}
            onClick={() => onTabChange("shop")}
          >
            <Store size={17} /> Shop Questionable Goods
          </button>

          <button
            type="button"
            className={`nav-btn ${activeTab === "returns" ? "nav-btn-active" : ""}`}
            onClick={() => onTabChange("returns")}
          >
            <RotateCcw size={17} /> Orders &amp; Futile Returns
            {ordersCount > 0 && <span className="nav-pill">{ordersCount}</span>}
          </button>

          <button
            type="button"
            className="cart-trigger-btn"
            onClick={onOpenCart}
            data-testid="open-cart-btn"
          >
            <ShoppingCart size={18} />
            <span>Cart ({cartCount})</span>
            {cartCount > 0 && <span className="cart-mini-total">${cartSubtotal.toFixed(2)}</span>}
          </button>
        </nav>
      </div>

      {/* Conductor Connection Strip */}
      <div className="conductor-strip">
        <div className="conductor-strip-left">
          <span className={`dot ${health?.conductor?.ok ? "dot-ok" : "dot-warn"}`} />
          <span>
            Conductor Workflow Engine:{" "}
            <strong>{health?.conductor?.ok ? "CONNECTED (Checkout & Returns Live)" : "CHECKING..."}</strong>
          </span>
          <span className="no-ai-badge">0% AI APIs at Runtime • 100% Pure Bureaucracy</span>
        </div>
        {conductorUiUrl && (
          <a href={conductorUiUrl} target="_blank" rel="noreferrer" className="strip-link">
            Open Conductor UI <ExternalLink size={13} />
          </a>
        )}
      </div>

      {/* Marquee Regret Ticker */}
      {tickerText && (
        <div className="ticker-wrap" aria-label="Live Shopper Regrets">
          <div className="ticker-badge">
            <AlertTriangle size={14} /> LIVE REGRET FEED
          </div>
          <div className="ticker-viewport">
            <div className="ticker-track">
              <span>{tickerText}</span>
              <span aria-hidden="true">   ★   {tickerText}</span>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
