import React, { useEffect, useState } from "react";

function formatElapsed(sec) {
  const hrs = String(Math.floor(sec / 3600)).padStart(2, "0");
  const mins = String(Math.floor((sec % 3600) / 60)).padStart(2, "0");
  const s = String(sec % 60).padStart(2, "0");
  return `${hrs}:${mins}:${s}`;
}

export function Header({
  activeTab,
  setActiveTab,
  cartCount,
  ordersCount,
  returnsCount,
  onOpenCart,
  health,
}) {
  // Absurd "urgency countdown" that counts UP instead of down!
  const [seconds, setSeconds] = useState(257);

  useEffect(() => {
    const id = setInterval(() => {
      setSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <>
      <div className="chaos-marquee" aria-label="Chaos Commerce announcements">
        <div className="chaos-marquee-track">
          🚨 FLASH SURGE EVENT: PRICES INCREASING FOR NO REASON • ⭐ 4.9★ AVERAGE RATING (MOSTLY SCREAMING) • 💸 USE PROMO CODE &quot;SAVE50&quot; TO PAY +$50 EXTRA! • 🐹 RETURNS AUDITED BY CHIEF LEGAL HAMSTER SIR SQUEAKS ESQ. • 🏆 VOTED &quot;HOW IS THIS LEGAL?&quot; 2024–2026 • ⚡ POWERED BY REAL CONDUCTOR WORKFLOWS (0% AI, 100% BUREAUCRACY) 🚨
        </div>
      </div>

      <header className="site-header">
        <div className="header-inner">
          <div className="brand" onClick={() => setActiveTab("shop")}>
            <div className="brand-logo">?!</div>
            <div>
              <h1 className="brand-title">Chaos Commerce™</h1>
              <div className="brand-sub">
                Bad Prices. Worse Service. Legally Unexplained Longevity.
              </div>
            </div>
          </div>

          <nav className="nav-pills" aria-label="Primary navigation">
            <button
              type="button"
              className={`btn ${activeTab === "shop" ? "btn-active" : ""}`}
              onClick={() => setActiveTab("shop")}
            >
              🛒 Shop Nonsense
            </button>
            <button
              type="button"
              className={`btn ${activeTab === "returns" ? "btn-active" : ""}`}
              onClick={() => setActiveTab("returns")}
            >
              🧾 Returns Maze ({returnsCount})
            </button>
            <button
              type="button"
              className={`btn ${activeTab === "orders" ? "btn-active" : ""}`}
              onClick={() => setActiveTab("orders")}
            >
              📦 Orders &amp; Traces ({ordersCount})
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={onOpenCart}
            >
              🛍️ Cart ({cartCount})
            </button>
          </nav>
        </div>
      </header>

      <div className="sub-strip">
        <div className="sub-strip-inner">
          <div className="trust-badges">
            <span className="badge-pill pink">🔓 0% SSL (Trust Us)</span>
            <span className="badge-pill yellow">🏅 BBB Rating: Z-</span>
            <span className="badge-pill cyan">🚚 Ships Eventually™</span>
            <span className="badge-pill lime">
              ⚡ Conductor:{" "}
              {health?.conductor?.reachable ? "CONNECTED" : "CHECKING..."}
            </span>
          </div>

          <div className="urgency-clock" title="This countdown timer is broken and counts upwards.">
            ⏳ OFFER EXPIRES IN: {formatElapsed(seconds)} (COUNTING UP!)
          </div>
        </div>
      </div>
    </>
  );
}
