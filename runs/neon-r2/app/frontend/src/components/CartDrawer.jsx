import React, { useState } from "react";
import { Minus, Plus, ShieldAlert, ShoppingCart, Tag, Trash2, X } from "lucide-react";
import { api } from "../api.js";

export default function CartDrawer({
  open,
  onClose,
  items,
  onUpdateQty,
  onRemove,
  includeBox,
  onToggleBox,
  includeInsurance,
  onToggleInsurance,
  promoCode,
  onPromoCodeChange,
  promoPreview,
  onPromoPreview,
  onProceedCheckout,
}) {
  const [promoLoading, setPromoLoading] = useState(false);

  if (!open) return null;

  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const addonTotal = (includeBox ? 42.0 : 0) + (includeInsurance ? 19.99 : 0);
  const promoAdj = promoPreview?.adjustment || 0;
  const roughEstimate = Math.max(0.01, subtotal + addonTotal + promoAdj);

  const handleApplyPromo = async (codeToTry) => {
    const code = codeToTry !== undefined ? codeToTry : promoCode;
    onPromoCodeChange(code);
    setPromoLoading(true);
    try {
      const result = await api.previewPromo(code, subtotal);
      onPromoPreview(result);
    } catch {
      onPromoPreview(null);
    } finally {
      setPromoLoading(false);
    }
  };

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <aside className="cart-drawer" onClick={(e) => e.stopPropagation()} aria-label="Shopping Cart">
        <div className="drawer-header">
          <div className="drawer-title">
            <ShoppingCart size={20} />
            <h2>Your Cart of Regrets ({items.reduce((s, i) => s + i.quantity, 0)})</h2>
          </div>
          <button type="button" className="modal-close-inline" onClick={onClose} aria-label="Close Cart">
            <X size={20} />
          </button>
        </div>

        {items.length === 0 ? (
          <div className="empty-cart">
            <p className="empty-emoji">🛒</p>
            <h3>Your cart is suspiciously empty!</h3>
            <p>Go add a $4,999.99 damp sock or a $0.03 industrial forklift before common sense returns.</p>
          </div>
        ) : (
          <>
            <div className="cart-items-list">
              {items.map((item) => (
                <div key={item.id} className="cart-row">
                  <span className="cart-item-emoji">{item.emoji}</span>
                  <div className="cart-item-info">
                    <strong>{item.title}</strong>
                    <span className="cart-unit-price">
                      ${item.price.toLocaleString("en-US", { minimumFractionDigits: 2 })} each
                    </span>
                    <div className="qty-controls">
                      <button
                        type="button"
                        className="qty-btn"
                        onClick={() => onUpdateQty(item.id, item.quantity - 1)}
                        aria-label="Decrease quantity"
                      >
                        <Minus size={13} />
                      </button>
                      <span className="qty-num">{item.quantity}</span>
                      <button
                        type="button"
                        className="qty-btn"
                        onClick={() => onUpdateQty(item.id, item.quantity + 1)}
                        aria-label="Increase quantity"
                      >
                        <Plus size={13} />
                      </button>
                      <button
                        type="button"
                        className="remove-btn"
                        onClick={() => onRemove(item.id)}
                        aria-label="Remove item"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Predatory Upsell Add-ons */}
            <div className="upsell-box">
              <div className="upsell-title">
                <ShieldAlert size={16} /> Mandatory &ldquo;Optional&rdquo; Add-Ons
              </div>
              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={includeBox}
                  onChange={(e) => onToggleBox(e.target.checked)}
                />
                <span>
                  <strong>Cardboard Box (+$42.00)</strong> — Uncheck if you prefer your order thrown loose from a moving van.
                </span>
              </label>
              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={includeInsurance}
                  onChange={(e) => onToggleInsurance(e.target.checked)}
                />
                <span>
                  <strong>Shipping Insurance Against Our Own Shipping (+$19.99)</strong> — Covers 0% of pigeon or catapult incidents.
                </span>
              </label>
            </div>

            {/* Backwards Promo Codes */}
            <div className="promo-box">
              <div className="promo-label">
                <Tag size={15} /> Backwards Promo Code (Try: SAVE50, FREE, VIP, or CHAOS)
              </div>
              <div className="promo-input-row">
                <input
                  type="text"
                  value={promoCode}
                  onChange={(e) => onPromoCodeChange(e.target.value)}
                  placeholder="Enter SAVE50..."
                  className="text-input"
                />
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => handleApplyPromo()}
                  disabled={promoLoading}
                >
                  Apply
                </button>
              </div>
              <div className="promo-chips">
                {["SAVE50", "FREE", "VIP", "CHAOS"].map((code) => (
                  <button
                    key={code}
                    type="button"
                    className="promo-chip"
                    onClick={() => handleApplyPromo(code)}
                  >
                    {code}
                  </button>
                ))}
              </div>
              {promoPreview?.note && (
                <div className={`promo-result ${promoPreview.adjustment < 0 ? "promo-good" : "promo-bad"}`}>
                  {promoPreview.note}
                </div>
              )}
            </div>

            <div className="cart-summary">
              <div className="summary-line">
                <span>Items Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <div className="summary-line">
                <span>Absurd Add-Ons</span>
                <span>+${addonTotal.toFixed(2)}</span>
              </div>
              {promoPreview?.applied && (
                <div className="summary-line">
                  <span>Promo ({promoPreview.code})</span>
                  <span>
                    {promoAdj >= 0 ? `+$${promoAdj.toFixed(2)}` : `-$${Math.abs(promoAdj).toFixed(2)}`}
                  </span>
                </div>
              )}
              <div className="summary-line summary-note">
                <span>Hidden Fees &amp; Shipping</span>
                <span>Invented at Checkout!</span>
              </div>
              <div className="summary-total">
                <span>Pre-Chaos Estimate</span>
                <span>${roughEstimate.toFixed(2)}</span>
              </div>

              <button
                type="button"
                className="btn-primary btn-full btn-lg"
                onClick={onProceedCheckout}
                data-testid="proceed-checkout-btn"
              >
                Proceed to Questionable Checkout →
              </button>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
