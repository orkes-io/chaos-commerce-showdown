import React, { useEffect, useState } from "react";
import { api, formatUsd } from "../api.js";

export function CartDrawer({
  open,
  onClose,
  cartItems,
  shippingMethods,
  addons,
  paymentMethods,
  promoHints,
  onUpdateQty,
  onRemoveItem,
  onCheckoutSuccess,
}) {
  const [shippingMethod, setShippingMethod] = useState(
    shippingMethods[0]?.id || "snail_helmet"
  );
  const [selectedAddons, setSelectedAddons] = useState(["void_warranty"]);
  const [paymentMethod, setPaymentMethod] = useState(
    paymentMethods[0]?.id || "imaginary_platinum"
  );
  const [promoInput, setPromoInput] = useState("");
  const [appliedPromo, setAppliedPromo] = useState("");
  const [customerName, setCustomerName] = useState("Impulse Shopper");
  const [customerEmail, setCustomerEmail] = useState("shopper@example.com");
  const [customerAddress, setCustomerAddress] = useState("404 Bad Decision Ln");
  const [quote, setQuote] = useState(null);
  const [checkingOut, setCheckingOut] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open || cartItems.length === 0) {
      setQuote(null);
      return;
    }
    let cancelled = false;
    api
      .quote({
        items: cartItems.map((c) => ({
          productId: c.product.id,
          quantity: c.quantity,
        })),
        shippingMethod,
        promoCode: appliedPromo,
        addons: selectedAddons,
      })
      .then((q) => {
        if (!cancelled) setQuote(q);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [open, cartItems, shippingMethod, appliedPromo, selectedAddons]);

  if (!open) return null;

  const toggleAddon = (id) => {
    setSelectedAddons((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleApplyPromo = () => {
    setAppliedPromo(promoInput.trim().toUpperCase());
  };

  const handleCheckout = async (e) => {
    e.preventDefault();
    if (cartItems.length === 0) return;
    setCheckingOut(true);
    setError(null);
    try {
      const result = await api.checkout({
        customer: {
          name: customerName,
          email: customerEmail,
          address: customerAddress,
        },
        items: cartItems.map((c) => ({
          productId: c.product.id,
          quantity: c.quantity,
        })),
        shippingMethod,
        paymentMethod,
        promoCode: appliedPromo,
        addons: selectedAddons,
      });
      onCheckoutSuccess(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setCheckingOut(false);
    }
  };

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <aside className="drawer" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header" style={{ marginBottom: 4 }}>
          <div>
            <h2 style={{ margin: 0 }}>🛍️ Your Regret Cart</h2>
            <div style={{ fontSize: "0.8rem", color: "#52525b" }}>
              Checkout runs on real Conductor workflow <code>chaos_checkout</code> and always completes!
            </div>
          </div>
          <button type="button" className="btn btn-sm" onClick={onClose}>
            ✕
          </button>
        </div>

        {cartItems.length === 0 ? (
          <div className="panel" style={{ textAlign: "center" }}>
            <p style={{ fontWeight: 800 }}>Your cart is suspiciously empty.</p>
            <p style={{ fontSize: "0.86rem", color: "#52525b" }}>
              Add a $9,999.99 pre-bent paperclip to start making questionable choices!
            </p>
            <button type="button" className="btn btn-yellow" onClick={onClose}>
              Back to Nonsense
            </button>
          </div>
        ) : (
          <form onSubmit={handleCheckout}>
            {/* Items */}
            <div className="panel" style={{ padding: 12, marginBottom: 12 }}>
              {cartItems.map(({ product, quantity }) => (
                <div
                  key={product.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 8,
                    padding: "8px 0",
                    borderBottom: "1.5px dashed #d4d4d8",
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 800, fontSize: "0.88rem" }}>
                      {product.name}
                    </div>
                    <div style={{ fontSize: "0.78rem", fontFamily: "var(--mono)", color: "#ff2a6d" }}>
                      {formatUsd(product.price)} each
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <button
                      type="button"
                      className="btn btn-sm"
                      onClick={() => onUpdateQty(product.id, quantity - 1)}
                    >
                      −
                    </button>
                    <strong style={{ minWidth: 22, textAlign: "center" }}>
                      {quantity}
                    </strong>
                    <button
                      type="button"
                      className="btn btn-sm"
                      onClick={() => onUpdateQty(product.id, quantity + 1)}
                    >
                      +
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm"
                      onClick={() => onRemoveItem(product.id)}
                      title="Remove item"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Reverse Promo Code */}
            <div className="panel" style={{ padding: 12, marginBottom: 12 }}>
              <label style={{ fontWeight: 800, fontSize: "0.83rem", display: "block", marginBottom: 6 }}>
                🎟️ Reverse Promo Code (Try: {(promoHints || []).join(", ")})
              </label>
              <div style={{ display: "flex", gap: 6 }}>
                <input
                  className="input"
                  style={{ flex: 1 }}
                  value={promoInput}
                  onChange={(e) => setPromoInput(e.target.value)}
                  placeholder="Enter SAVE50 or FREESHIP..."
                />
                <button
                  type="button"
                  className="btn btn-yellow btn-sm"
                  onClick={handleApplyPromo}
                >
                  Apply
                </button>
              </div>
              {quote?.promoCode && (
                <div
                  style={{
                    marginTop: 6,
                    fontSize: "0.78rem",
                    fontWeight: 800,
                    color: "#dc2626",
                  }}
                >
                  ⚠️ {quote.promoMessage}
                </div>
              )}
            </div>

            {/* Shipping */}
            <div className="field">
              <label>🚚 Absurd Shipping Method</label>
              <select
                className="select"
                value={shippingMethod}
                onChange={(e) => setShippingMethod(e.target.value)}
              >
                {shippingMethods.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label} (+{formatUsd(m.price)})
                  </option>
                ))}
              </select>
            </div>

            {/* Add-ons */}
            <div className="panel" style={{ padding: 12, marginBottom: 12 }}>
              <div style={{ fontWeight: 800, fontSize: "0.83rem", marginBottom: 6 }}>
                🛡️ Completely Useless Add-Ons
              </div>
              {addons.map((a) => (
                <label
                  key={a.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 8,
                    fontSize: "0.82rem",
                    padding: "4px 0",
                    cursor: "pointer",
                  }}
                >
                  <span>
                    <input
                      type="checkbox"
                      checked={selectedAddons.includes(a.id)}
                      onChange={() => toggleAddon(a.id)}
                      style={{ marginRight: 6 }}
                    />
                    {a.label}
                  </span>
                  <strong>+{formatUsd(a.price)}</strong>
                </label>
              ))}
            </div>

            {/* Payment & Customer */}
            <div className="field">
              <label>💳 Parody Payment Method (No Real Charge!)</label>
              <select
                className="select"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
              >
                {paymentMethods.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label>Your Name</label>
              <input
                className="input"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                required
              />
            </div>

            <div className="field">
              <label>Email</label>
              <input
                className="input"
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                required
              />
            </div>

            <div className="field">
              <label>Shipping Address (Catapult Landing Zone)</label>
              <input
                className="input"
                value={customerAddress}
                onChange={(e) => setCustomerAddress(e.target.value)}
                required
              />
            </div>

            {/* Live Receipt Breakdown */}
            {quote && (
              <div
                className="panel"
                style={{
                  padding: 12,
                  marginBottom: 12,
                  background: "#fef9c3",
                }}
              >
                <div style={{ fontWeight: 900, marginBottom: 6 }}>
                  💸 Mandatory Fee Escalation Summary
                </div>
                <div className="fee-row">
                  <span>Items Subtotal</span>
                  <span>{formatUsd(quote.subtotal)}</span>
                </div>
                <div className="fee-row">
                  <span>Shipping</span>
                  <span>{formatUsd(quote.shippingCost)}</span>
                </div>
                {quote.addonsTotal > 0 && (
                  <div className="fee-row">
                    <span>Useless Add-Ons</span>
                    <span>{formatUsd(quote.addonsTotal)}</span>
                  </div>
                )}
                {quote.fees.map((f, idx) => (
                  <div key={idx} className="fee-row" style={{ color: "#991b1b" }}>
                    <span>+ {f.name}</span>
                    <span>{formatUsd(f.amount)}</span>
                  </div>
                ))}
                <div className="fee-row total">
                  <span>GRAND TOTAL</span>
                  <span>{formatUsd(quote.grandTotal)}</span>
                </div>
              </div>
            )}

            {error && <div className="alert-banner error">❌ {error}</div>}

            <button
              type="submit"
              className="btn btn-primary"
              disabled={checkingOut}
              style={{ width: "100%", justifyContent: "center", padding: "13px 16px" }}
            >
              {checkingOut
                ? "⚡ Running Conductor Checkout Workflow..."
                : `🔥 Complete Terrible Decision (${formatUsd(quote?.grandTotal || 0)})`}
            </button>
          </form>
        )}
      </aside>
    </div>
  );
}
