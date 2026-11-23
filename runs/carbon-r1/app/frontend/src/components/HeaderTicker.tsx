import React from "react";
import type { HealthResponse } from "../types";

interface HeaderTickerProps {
  activeTab: "catalog" | "returns" | "orders";
  onSelectTab: (tab: "catalog" | "returns" | "orders") => void;
  cartCount: number;
  onOpenCart: () => void;
  health: HealthResponse | null;
  onOpenConfigModal: () => void;
}

const TICKER_ITEMS = [
  "🚨 FLASH ANTI-SALE: PRICES MARKED UP UP TO +16,333,200% WHILE SUPPLIES EVAPORATE 🚨",
  "⭐ RATED 5.0 STARS BY ENRAGED VICTIMS WHO COULDN'T CATCH OUR 1-STAR BUTTON ⭐",
  "★★☆☆☆ TWO-STAR REVIEWS RESERVED EXCLUSIVELY FOR TEARS OF PURE JOY ★★☆☆☆",
  "💸 PROMO CODE 'SAVE10' ADDS +10% CEO YACHT FUEL CONTRIBUTION TO YOUR BILL 💸",
  "🦡 NOW SHIPPING VIA THREE RACCOONS IN A TRENCHCOAT & MEDIEVAL TREBUCHET 🦡",
  "📋 ALL RETURNS SUBJECT TO LUNAR ALIGNMENT, FACTORY AIR AUDIT & FORKLIFT FLATTERY 📋"
];

export const HeaderTicker: React.FC<HeaderTickerProps> = ({
  activeTab,
  onSelectTab,
  cartCount,
  onOpenCart,
  health,
  onOpenConfigModal
}) => {
  const repeated = [...TICKER_ITEMS, ...TICKER_ITEMS].join("   •   ");

  return (
    <>
      <div className="chaos-ticker">
        <div className="chaos-ticker-inner">
          <div className="chaos-ticker-track">{repeated}</div>
        </div>
      </div>

      <header className="chaos-header">
        <div className="chaos-header-row">
          <div className="brand-block" onClick={() => onSelectTab("catalog")}>
            <div className="brand-logo" aria-hidden="true">
              🛒
            </div>
            <div>
              <h1 className="brand-title">CHAOS COMMERCE™</h1>
              <p className="brand-sub">
                Proudly Under 19 Active Subpoenas • Powered by Real Conductor Workflows
              </p>
            </div>
          </div>

          <nav className="nav-tabs" aria-label="Main Navigation">
            <button
              type="button"
              className={`nav-btn ${activeTab === "catalog" ? "active" : ""}`}
              onClick={() => onSelectTab("catalog")}
            >
              🔥 Cursed Catalog
            </button>
            <button
              type="button"
              className={`nav-btn ${activeTab === "returns" ? "active" : ""}`}
              onClick={() => onSelectTab("returns")}
            >
              📋 Pointless Returns Gauntlet
            </button>
            <button
              type="button"
              className={`nav-btn ${activeTab === "orders" ? "active" : ""}`}
              onClick={() => onSelectTab("orders")}
            >
              ⚙️ Orders &amp; Conductor Logs
            </button>

            <button
              type="button"
              className={`conductor-pill ${health?.conductor?.reachable ? "" : "offline"}`}
              onClick={onOpenConfigModal}
              title="Inspect Conductor Server Connection & API Configuration"
            >
              <span>●</span>
              <span>
                {health?.conductor?.reachable
                  ? "CONDUCTOR :8080 LIVE"
                  : "CONDUCTOR CHECKING..."}
              </span>
            </button>

            <button
              type="button"
              className="cart-btn"
              onClick={onOpenCart}
              data-testid="open-cart-button"
            >
              🛒 Regret Cart ({cartCount})
            </button>
          </nav>
        </div>
      </header>
    </>
  );
};
