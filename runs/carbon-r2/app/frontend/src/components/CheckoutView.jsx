import React, { useState } from "react";
import { api } from "../api.js";
import WorkflowInspector from "./WorkflowInspector.jsx";

function formatMoney(n) {
  return Number(n || 0).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}

export default function CheckoutView({
  cart,
  shippingMethods = [],
  promoHints = [],
  onUpdateQty,
  onRemoveItem,
  onClearCart,
  onOrderCompleted,
  onStartReturnForOrder,
  onBackToShop,
}) {
  const [customerName, setCustomerName] = useState("Hapless Impulse Buyer");
  const [customerEmail, setCustomerEmail] = useState("regret@wallet-pain.example");
  const [shippingAddress, setShippingAddress] = useState(
    "742 Sinkhole Terrace, Unit 404"
  );
  const [shippingMethod, setShippingMethod] = useState("DRONE_DROP");
  const [promoCode, setPromoCode] = useState("SAVE10");
  const [paymentCard, setPaymentCard] = useState("4242-0000-9999-4242");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [completedResult, setCompletedResult] = useState(null);

  const subtotal = cart.reduce((acc, it) => acc + it.price * it.quantity, 0);
  const totalQty = cart.reduce((acc, it) => acc + it.quantity, 0);
  const selectedShip =
    shippingMethods.find((m) => m.code === shippingMethod) ||
    shippingMethods[0] || { fee: 29.99, label: "Glacial Drift" };

  const estYachtFee = Math.round((subtotal * 0.075 + 7.77) * 100) / 100;
  const estPixelTax = Math.round(Math.max(1, totalQty) * 3.33 * 100) / 100;
  const estInconvenience = 19.99;

  const handleCheckout = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const result = await api.checkout({
        customerName,
        customerEmail,
        shippingAddress,
        shippingMethod,
        promoCode,
        paymentCard,
        items: cart,
      });
      setCompletedResult(result);
      onClearCart();
      if (onOrderCompleted) {
        onOrderCompleted(result.order);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="page-section">
      <div className="section-banner checkout-banner">
        <div>
          <h2>🛒 Extortion Cart & Guaranteed-Completion Checkout</h2>
          <p>
            Every checkout executes{" "}
            <code>chaos_checkout_workflow</code> on Conductor (parallel raccoon
            inventory synthesis + payment vibe check + backfiring promo
            switches). Even if our warehouse has <strong>-4 items</strong>, we
            synthesize imaginary inventory so your payment <em>always</em> goes
            through!
          </p>
        </div>
      </div>

      {completedResult && (
        <div className="receipt-celebration-card" data-testid="checkout-receipt">
          <div className="receipt-stamp">✅ PAYMENT IRREVOCABLY EXTRACTED</div>
          <h3>
            Order <code>{completedResult.order.orderId}</code> Confirmed (No
            Takebacks!)
          </h3>
          <p className="receipt-sub">
            Charged{" "}
            <strong>{formatMoney(completedResult.order.grandTotal)}</strong> —
            Auth Code:{" "}
            <code>
              {completedResult.order.receipt?.payment?.authCode ||
                "NO-BACKSIES"}
            </code>
          </p>

          <div className="receipt-columns">
            <div className="receipt-box">
              <h4>🧾 Itemized Extortion Breakdown</h4>
              <ul className="invoice-lines">
                <li>
                  <span>Raw Merchandise Subtotal:</span>
                  <strong>
                    {formatMoney(
                      completedResult.order.receipt?.invoice?.subtotal
                    )}
                  </strong>
                </li>
                <li>
                  <span>
                    Shipping ({completedResult.order.receipt?.shipping?.carrierLabel}):
                  </span>
                  <strong>
                    {formatMoney(
                      completedResult.order.receipt?.invoice?.shippingFee
                    )}
                  </strong>
                </li>
                <li>
                  <span>Convenience Inconvenience Fee:</span>
                  <strong>
                    {formatMoney(
                      completedResult.order.receipt?.invoice?.inconvenienceFee
                    )}
                  </strong>
                </li>
                <li>
                  <span>CEO Yacht Hull Waxing Contribution:</span>
                  <strong>
                    {formatMoney(
                      completedResult.order.receipt?.invoice?.ceoYachtPolishFee
                    )}
                  </strong>
                </li>
                <li>
                  <span>Electron & Pixel Delivery Tax:</span>
                  <strong>
                    {formatMoney(
                      completedResult.order.receipt?.invoice?.pixelDeliveryTax
                    )}
                  </strong>
                </li>
                <li className="promo-line">
                  <span>
                    {completedResult.order.receipt?.invoice?.promoLabel}:
                  </span>
                  <strong>
                    {formatMoney(
                      completedResult.order.receipt?.invoice?.promoAdjustment
                    )}
                  </strong>
                </li>
                <li className="grand-total-line">
                  <span>FINAL IRREVERSIBLE TOTAL:</span>
                  <strong>{formatMoney(completedResult.order.grandTotal)}</strong>
                </li>
              </ul>
            </div>

            <div className="receipt-box">
              <h4>🦝 Conductor Parallel Verification Reports</h4>
              <p>
                <strong>Warehouse Raccoons:</strong> Physical stock found:{" "}
                <code>
                  {
                    completedResult.order.receipt?.warehouse
                      ?.physicalStockFound
                  }
                </code>
                . Synthesized{" "}
                <code>
                  {
                    completedResult.order.receipt?.warehouse
                      ?.imaginaryStockSynthesized
                  }
                </code>{" "}
                imaginary units from{" "}
                <code>
                  {completedResult.order.receipt?.warehouse?.warehouseBin}
                </code>{" "}
                ({completedResult.order.receipt?.warehouse?.raccoonSupervisorStatus}).
              </p>
              <p>
                <strong>Payment Vibecheck:</strong>{" "}
                {completedResult.order.receipt?.payment?.vibeVerdict}
              </p>
              <p>
                <strong>Carrier ETA:</strong>{" "}
                {completedResult.order.receipt?.shipping?.estimatedDelivery}.{" "}
                <em>
                  ({completedResult.order.receipt?.shipping?.boxCondition})
                </em>
              </p>
            </div>
          </div>

          <WorkflowInspector
            title="chaos_checkout_workflow — Step-by-Step Conductor Execution"
            workflowId={completedResult.conductor?.workflowId}
            workflowName={completedResult.conductor?.workflowName}
            status={completedResult.conductor?.status}
            conductorExecutionUrl={
              completedResult.conductor?.conductorExecutionUrl
            }
            taskTimeline={completedResult.conductor?.taskTimeline}
            defaultExpanded={true}
          />

          <div className="receipt-actions">
            <button
              type="button"
              className="btn-regret-return"
              onClick={() => onStartReturnForOrder(completedResult.order)}
            >
              😭 Instant Buyer&apos;s Remorse? Attempt a Return on{" "}
              {completedResult.order.orderId} →
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={onBackToShop}
            >
              Buy More Mistakes
            </button>
          </div>
        </div>
      )}

      <div className="checkout-grid">
        <div className="cart-panel">
          <h3>Items Currently Threatening Your Bank Account</h3>
          {cart.length === 0 ? (
            <div className="empty-cart-warning">
              <p>
                ⚠️ Your cart has <strong>0 items</strong>! Warning: Chaos
                Commerce allows checking out an empty cart anyway—we will gladly
                charge you a{" "}
                <strong>
                  $49.99 Mandatory Empty-Cart Atmospheric Inspection Fee
                </strong>{" "}
                plus surcharges!
              </p>
              <button
                type="button"
                className="btn-secondary"
                onClick={onBackToShop}
              >
                ← Go Add Ridiculous Products First
              </button>
            </div>
          ) : (
            <div className="cart-items-list">
              {cart.map((item) => (
                <div key={item.id} className="cart-item-row">
                  <span className="cart-item-emoji">{item.emoji || "📦"}</span>
                  <div className="cart-item-info">
                    <strong>{item.name}</strong>
                    <span>{formatMoney(item.price)} each</span>
                  </div>
                  <div className="cart-qty-controls">
                    <button
                      type="button"
                      onClick={() => onUpdateQty(item.id, item.quantity - 1)}
                    >
                      −
                    </button>
                    <span>{item.quantity}</span>
                    <button
                      type="button"
                      onClick={() => onUpdateQty(item.id, item.quantity + 1)}
                    >
                      +
                    </button>
                  </div>
                  <div className="cart-line-total">
                    {formatMoney(item.price * item.quantity)}
                  </div>
                  <button
                    type="button"
                    className="cart-remove-btn"
                    title="Attempt to escape item"
                    onClick={() => onRemoveItem(item.id)}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="fee-preview-box">
            <h4> Sneak Peek of Mandatory Nonsense Fees</h4>
            <div className="fee-row">
              <span>Items Subtotal:</span>
              <span>
                {cart.length ? formatMoney(subtotal) : "$49.99 (Empty-Cart Air)"}
              </span>
            </div>
            <div className="fee-row">
              <span>Shipping ({selectedShip.label}):</span>
              <span>{formatMoney(selectedShip.fee)}</span>
            </div>
            <div className="fee-row">
              <span>Convenience Inconvenience Fee:</span>
              <span>{formatMoney(estInconvenience)}</span>
            </div>
            <div className="fee-row">
              <span>CEO Yacht Polish Contribution (7.5% + $7.77):</span>
              <span>{formatMoney(estYachtFee)}</span>
            </div>
            <div className="fee-row">
              <span>Pixel & Electron Delivery Tax ($3.33/unit):</span>
              <span>{formatMoney(estPixelTax)}</span>
            </div>
            <p className="fee-footnote">
              * Exact final extortion total (including backfiring promo
              penalties) is calculated inside Conductor&apos;s{" "}
              <code>chaos_checkout_workflow</code>.
            </p>
          </div>
        </div>

        <form className="checkout-form-panel" onSubmit={handleCheckout}>
          <h3> Victim Billing & Delivery Details</h3>

          <label>
            Full Legal Name (for Yacht Dedication Plaque)
            <input
              type="text"
              required
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
            />
          </label>

          <label>
            Email for Unsolicited 3 AM Receipts
            <input
              type="email"
              required
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
            />
          </label>

          <label>
            Drop Zone Coordinates / Street Address
            <input
              type="text"
              required
              value={shippingAddress}
              onChange={(e) => setShippingAddress(e.target.value)}
            />
          </label>

          <label>
            Hostile Shipping Method
            <select
              value={shippingMethod}
              onChange={(e) => setShippingMethod(e.target.value)}
            >
              {shippingMethods.map((m) => (
                <option key={m.code} value={m.code}>
                  {m.label} — {formatMoney(m.fee)} ({m.eta})
                </option>
              ))}
            </select>
          </label>

          <div className="promo-box">
            <label>
              Backfiring Promo Code (Leave blank for a $4.99 Null-Byte Fee!)
              <input
                type="text"
                placeholder="Try SAVE10, SAVE50, FREESHIP, or PLEASE"
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value)}
              />
            </label>
            <div className="promo-chips">
              {promoHints.map((p) => (
                <button
                  key={p.code}
                  type="button"
                  className={`promo-chip ${
                    promoCode.toUpperCase() === p.code ? "active" : ""
                  }`}
                  onClick={() => setPromoCode(p.code)}
                  title={p.spoiler}
                >
                  <code>{p.code}</code> ({p.spoiler})
                </button>
              ))}
            </div>
          </div>

          <label>
            Simulated Payment Card (Any digits — Vibe-checked only!)
            <input
              type="text"
              required
              value={paymentCard}
              onChange={(e) => setPaymentCard(e.target.value)}
            />
          </label>

          {error && <div className="form-banner err">❌ {error}</div>}

          <button
            type="submit"
            className="cta-checkout-submit"
            disabled={submitting}
            data-testid="submit-checkout-btn"
          >
            {submitting
              ? "⚡ Running chaos_checkout_workflow on Conductor..."
              : "💸 Authorize Irreversible Checkout (Conductor Workflow)"}
          </button>
        </form>
      </div>
    </section>
  );
}
