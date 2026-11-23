import React, { useEffect, useState } from "react";
import { api } from "../api.js";
import { formatMoney } from "./ProductCard.jsx";
import WorkflowTraceCard from "./WorkflowTraceCard.jsx";

export default function CartCheckoutDrawer({
  isOpen,
  onClose,
  cart,
  onUpdateQty,
  onClearCart,
  shippingMethods,
  paymentMethods,
  promoCodes,
  onOrderCompleted,
  onStartReturnForOrder
}) {
  const [customerName, setCustomerName] = useState("Impulsive Shopper #404");
  const [customerEmail, setCustomerEmail] = useState("regrets@chaoscommerce.parody");
  const [promoCode, setPromoCode] = useState("");
  const [shippingMethod, setShippingMethod] = useState("blindfolded_pigeon");
  const [paymentMethod, setPaymentMethod] = useState("guessed_card");
  const [chaosNotes, setChaosNotes] = useState(
    "Please do not catapult directly into my koi pond."
  );
  const [quote, setQuote] = useState(null);
  const [checkingOut, setCheckingOut] = useState(false);
  const [checkoutResult, setCheckoutResult] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen || cart.length === 0) {
      setQuote(null);
      return;
    }
    let cancelled = false;
    api
      .quoteCart({
        items: cart,
        promoCode,
        shippingMethod
      })
      .then((res) => {
        if (!cancelled) setQuote(res.quote);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isOpen, cart, promoCode, shippingMethod]);

  if (!isOpen) return null;

  async function handleCheckoutSubmit(e) {
    e.preventDefault();
    setCheckingOut(true);
    setError("");
    try {
      const res = await api.checkout({
        customerName,
        customerEmail,
        items: cart,
        promoCode,
        shippingMethod,
        paymentMethod,
        chaosNotes
      });
      setCheckoutResult(res);
      onClearCart();
      if (onOrderCompleted) {
        onOrderCompleted(res.order);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setCheckingOut(false);
    }
  }

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <div
        className="drawer-panel"
        onClick={(e) => e.stopPropagation()}
        data-testid="cart-checkout-drawer"
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderBottom: "3px solid var(--border)",
            paddingBottom: "0.75rem"
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: "1.35rem" }}>
              🛒 Basket of Questionable Choices
            </h2>
            <span
              style={{
                fontFamily: "var(--mono)",
                fontSize: "0.75rem",
                color: "var(--muted)"
              }}
            >
              Powered by Conductor Workflow <code>chaos_checkout_workflow</code>
            </span>
          </div>
          <button type="button" className="btn btn-sm" onClick={onClose}>
            ✕ Close
          </button>
        </div>

        {checkoutResult && (
          <div
            style={{
              background: "#ecfdf5",
              border: "3px solid var(--border)",
              boxShadow: "var(--shadow)",
              padding: "1rem"
            }}
            data-testid="checkout-confirmation-box"
          >
            <div
              style={{
                display: "inline-block",
                background: "#059669",
                color: "#fff",
                fontFamily: "var(--mono)",
                fontSize: "0.74rem",
                fontWeight: 900,
                padding: "0.2rem 0.5rem",
                marginBottom: "0.45rem"
              }}
            >
              ✓ CHECKOUT GUARANTEED & COMPLETED!
            </div>
            <h3 style={{ margin: "0 0 0.35rem", fontSize: "1.15rem" }}>
              Order {checkoutResult.order?.orderId} Irrevocably Confirmed!
            </h3>
            <p style={{ margin: "0 0 0.65rem", fontSize: "0.86rem" }}>
              <strong>Carrier:</strong>{" "}
              {checkoutResult.receipt?.shipment?.carrierName} •{" "}
              <strong>Tracking:</strong>{" "}
              <code>{checkoutResult.order?.trackingNumber}</code>
              <br />
              <strong>ETA:</strong>{" "}
              {checkoutResult.receipt?.shipment?.estimatedArrival}
              <br />
              <strong>Payment Note:</strong>{" "}
              {checkoutResult.receipt?.payment?.settlementNote}
              <br />
              <strong>Chaos Tier Perk:</strong>{" "}
              {checkoutResult.receipt?.chaosPerk}
            </p>

            <div className="receipt-box" style={{ marginBottom: "0.75rem" }}>
              <div className="receipt-row">
                <span>Subtotal</span>
                <span>
                  {formatMoney(checkoutResult.receipt?.pricing?.subtotal)}
                </span>
              </div>
              <div className="receipt-row">
                <span>Shipping ({checkoutResult.receipt?.pricing?.shippingMethodName})</span>
                <span>
                  {formatMoney(checkoutResult.receipt?.pricing?.shippingFee)}
                </span>
              </div>
              {(checkoutResult.receipt?.pricing?.chaosFees || []).map((f, idx) => (
                <div key={idx} className="receipt-row">
                  <span>{f.name}</span>
                  <span>{formatMoney(f.amount)}</span>
                </div>
              ))}
              {checkoutResult.receipt?.pricing?.promoAdjustment > 0 && (
                <div className="receipt-row" style={{ color: "var(--danger)" }}>
                  <span>
                    Backfiring Promo ({checkoutResult.receipt?.pricing?.promoCode})
                  </span>
                  <span>
                    +{formatMoney(checkoutResult.receipt?.pricing?.promoAdjustment)}
                  </span>
                </div>
              )}
              <div className="receipt-total">
                <span>TOTAL SETTLED</span>
                <span>{formatMoney(checkoutResult.order?.grandTotal)}</span>
              </div>
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.55rem" }}>
              <button
                type="button"
                className="btn btn-accent btn-sm"
                onClick={() => {
                  const ord = checkoutResult.order;
                  setCheckoutResult(null);
                  onClose();
                  if (onStartReturnForOrder) {
                    onStartReturnForOrder(ord);
                  }
                }}
                data-testid="start-return-from-order-btn"
              >
                🏛️ Regret It Already? Enter Pointless Returns Labyrinth →
              </button>
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => setCheckoutResult(null)}
              >
                Shop For More Mistakes
              </button>
            </div>

            <WorkflowTraceCard
              execution={checkoutResult.workflowExecution}
              title="Checkout Conductor Workflow Trace"
            />
          </div>
        )}

        {cart.length === 0 && !checkoutResult && (
          <div
            style={{
              padding: "2rem 1rem",
              textAlign: "center",
              border: "2.5px dashed var(--border)",
              background: "#faf7ef"
            }}
          >
            <div style={{ fontSize: "2.5rem" }}>🕸️</div>
            <h3 style={{ margin: "0.5rem 0" }}>Your Cart Is Suspiciously Sane</h3>
            <p style={{ margin: 0, fontSize: "0.88rem", color: "var(--muted)" }}>
              Go add a $49,999.99 pre-chewed paperclip or a -$14.99 haunted brick so
              our Conductor workflow has something ridiculous to orchestrate!
            </p>
          </div>
        )}

        {cart.length > 0 && (
          <form onSubmit={handleCheckoutSubmit}>
            <div style={{ marginBottom: "1rem" }}>
              {cart.map((item) => (
                <div
                  key={item.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "0.6rem",
                    border: "2px solid var(--border)",
                    padding: "0.6rem 0.75rem",
                    marginBottom: "0.5rem",
                    background: "#fffdf8"
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 800, fontSize: "0.9rem" }}>
                      {item.emoji} {item.name}
                    </div>
                    <div
                      style={{
                        fontFamily: "var(--mono)",
                        fontSize: "0.78rem",
                        color: item.price < 0 ? "var(--danger)" : "var(--muted)"
                      }}
                    >
                      {formatMoney(item.price)} each
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                    <button
                      type="button"
                      className="btn btn-sm"
                      onClick={() => onUpdateQty(item.id, item.quantity - 1)}
                    >
                      −
                    </button>
                    <span
                      style={{
                        fontFamily: "var(--mono)",
                        fontWeight: 900,
                        minWidth: "24px",
                        textAlign: "center"
                      }}
                    >
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      className="btn btn-sm"
                      onClick={() => onUpdateQty(item.id, item.quantity + 1)}
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div
              style={{
                background: "var(--surface-alt)",
                border: "2px solid var(--border)",
                padding: "0.75rem",
                marginBottom: "0.9rem"
              }}
            >
              <label style={{ fontWeight: 800, fontSize: "0.82rem", display: "block" }}>
                🎟️ Backfiring Promo Code (Every Coupon Raises Your Price!)
              </label>
              <div style={{ display: "flex", gap: "0.4rem", marginTop: "0.35rem" }}>
                <input
                  className="input-control"
                  style={{ flex: 1 }}
                  placeholder="Try SAVE20, FREESHIP, SORRY..."
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value)}
                />
                {promoCode && (
                  <button
                    type="button"
                    className="btn btn-sm"
                    onClick={() => setPromoCode("")}
                  >
                    Remove
                  </button>
                )}
              </div>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "0.35rem",
                  marginTop: "0.45rem"
                }}
              >
                {(promoCodes || []).map((p) => (
                  <button
                    key={p.code}
                    type="button"
                    className={`btn btn-sm ${
                      promoCode.toUpperCase() === p.code ? "btn-primary" : ""
                    }`}
                    onClick={() => setPromoCode(p.code)}
                  >
                    {p.code}
                  </button>
                ))}
              </div>
              {quote?.pricingCommentary && (
                <div
                  style={{
                    fontFamily: "var(--mono)",
                    fontSize: "0.73rem",
                    marginTop: "0.45rem",
                    color: "#7c2d12",
                    fontWeight: 700
                  }}
                >
                  {quote.pricingCommentary}
                </div>
              )}
            </div>

            <div className="field-group">
              <label>🕊️ Questionable Delivery Carrier</label>
              <select
                className="input-control"
                value={shippingMethod}
                onChange={(e) => setShippingMethod(e.target.value)}
              >
                {(shippingMethods || []).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} — {formatMoney(s.fee)} ({s.eta})
                  </option>
                ))}
              </select>
            </div>

            <div className="field-group">
              <label>💳 Dubious Payment Tender (Guaranteed to Settle Anyway)</label>
              <select
                className="input-control"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
              >
                {(paymentMethods || []).map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "0.6rem"
              }}
            >
              <div className="field-group">
                <label>Victim Name</label>
                <input
                  className="input-control"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  required
                />
              </div>
              <div className="field-group">
                <label>Apology Email</label>
                <input
                  className="input-control"
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="field-group">
              <label>Special Delivery Pleading (Ignored By Carrier)</label>
              <input
                className="input-control"
                value={chaosNotes}
                onChange={(e) => setChaosNotes(e.target.value)}
              />
            </div>

            {quote && (
              <div className="receipt-box" style={{ marginBottom: "0.95rem" }}>
                <div style={{ fontWeight: 900, marginBottom: "0.35rem" }}>
                  🧾 Live Itemized Surcharge Breakdown:
                </div>
                <div className="receipt-row">
                  <span>Items Subtotal</span>
                  <span>{formatMoney(quote.subtotal)}</span>
                </div>
                <div className="receipt-row">
                  <span>Carrier ({quote.shippingMethodName})</span>
                  <span>{formatMoney(quote.shippingFee)}</span>
                </div>
                {(quote.chaosFees || []).map((fee, idx) => (
                  <div key={idx} className="receipt-row">
                    <span title={fee.reason}>{fee.name}</span>
                    <span>{formatMoney(fee.amount)}</span>
                  </div>
                ))}
                {quote.promoAdjustment > 0 && (
                  <div className="receipt-row" style={{ color: "var(--danger)" }}>
                    <span>Promo Backfire ({quote.promoCode})</span>
                    <span>+{formatMoney(quote.promoAdjustment)}</span>
                  </div>
                )}
                <div className="receipt-total">
                  <span>ESTIMATED FINANCIAL DAMAGE</span>
                  <span>{formatMoney(quote.grandTotal)}</span>
                </div>
              </div>
            )}

            {error && (
              <div
                style={{
                  background: "var(--danger-soft)",
                  border: "2px solid var(--danger)",
                  padding: "0.6rem",
                  marginBottom: "0.75rem",
                  fontSize: "0.84rem",
                  fontWeight: 700
                }}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary"
              style={{
                width: "100%",
                justifyContent: "center",
                padding: "0.8rem",
                fontSize: "1rem"
              }}
              disabled={checkingOut}
              data-testid="submit-checkout-btn"
            >
              {checkingOut
                ? "⚙️ Running chaos_checkout_workflow on Conductor..."
                : `💸 Complete Regrettable Purchase (${
                    quote ? formatMoney(quote.grandTotal) : "Calculate"
                  })`}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
