import React, { useState } from "react";
import { submitCheckout } from "../api";
import type { CartItem, ChaosProduct, WorkflowExecutionTrace } from "../types";

interface CheckoutModalProps {
  open: boolean;
  onClose: () => void;
  cart: CartItem[];
  fallbackProduct?: ChaosProduct;
  onUpdateQty: (productId: string, delta: number) => void;
  onAddFallback: (product: ChaosProduct) => void;
  onClearCart: () => void;
  onOrderCompleted: (orderData: {
    orderId: string;
    workflowId: string;
    order: Record<string, any>;
    trace: WorkflowExecutionTrace;
  }) => void;
  onInspectTrace: (trace: WorkflowExecutionTrace) => void;
  onStartReturnFromOrder: (orderInfo: {
    orderId: string;
    itemName: string;
    itemPrice: number;
  }) => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  open,
  onClose,
  cart,
  fallbackProduct,
  onUpdateQty,
  onAddFallback,
  onClearCart,
  onOrderCompleted,
  onInspectTrace,
  onStartReturnFromOrder
}) => {
  const [customerName, setCustomerName] = useState("impulsive Shopper");
  const [customerEmail, setCustomerEmail] = useState("regret@chaos.example");
  const [shippingAddress, setShippingAddress] = useState(
    "742 Evergreen Terrace (Aim Trebuchet Near Garage)"
  );
  const [shippingTier, setShippingTier] = useState<"catapult" | "raccoons" | "glacier">(
    "raccoons"
  );
  const [paymentMethod, setPaymentMethod] = useState("credit_card_of_regret");
  const [couponCode, setCouponCode] = useState("SAVE10");
  const [chaosInsurance, setChaosInsurance] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [completedResult, setCompletedResult] = useState<{
    orderId: string;
    workflowId: string;
    conductorExecutionUrl: string;
    order: Record<string, any>;
    trace: WorkflowExecutionTrace;
  } | null>(null);

  if (!open) return null;

  const subtotal = cart.reduce((s, c) => s + c.product.price * c.quantity, 0);
  const shipEst =
    shippingTier === "catapult" ? 49.99 : shippingTier === "raccoons" ? 19.99 : 0.02;
  const electronFee = Math.floor((subtotal * 0.037 + 14.99) * 100) / 100;
  const insFee = chaosInsurance ? 199.99 : 0;
  const normCoupon = couponCode.trim().toUpperCase();
  const couponDelta =
    normCoupon === "SAVE10"
      ? Math.round(subtotal * 10) / 100
      : normCoupon === "MANAGER"
      ? 49.99
      : normCoupon === "PLEASE"
      ? -0.01
      : normCoupon === "CHAOS"
      ? -4.2
      : 0;
  const estTotal = Math.max(
    0.01,
    subtotal + insFee + shipEst + electronFee + 7.77 + 3.49 + 0.99 + couponDelta
  );

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await submitCheckout({
        customerName,
        customerEmail,
        shippingAddress,
        shippingTier,
        paymentMethod,
        couponCode,
        chaosInsurance,
        items: cart.map((c) => ({ productId: c.product.id, quantity: c.quantity }))
      });
      setCompletedResult(res);
      onClearCart();
      onOrderCompleted(res);
    } catch (err: any) {
      setErrorMsg(err?.message || "Checkout goblin tripped over power cable");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <span className="gauntlet-step-tag">CONDUCTOR CHECKOUT PIPELINE</span>
            <h2 style={{ margin: "0.2rem 0 0 0" }}>
              {completedResult
                ? `🎉 Regrettable Order Confirmed: ${completedResult.orderId}`
                : "🛒 Your Basket of Questionable Financial Choices"}
            </h2>
          </div>
          <button
            type="button"
            className="close-x"
            onClick={() => {
              setCompletedResult(null);
              onClose();
            }}
          >
            ✕
          </button>
        </div>

        {completedResult ? (
          <div>
            <div
              style={{
                background: "rgba(0, 230, 118, 0.12)",
                border: "1.5px solid var(--neon-green)",
                borderRadius: 12,
                padding: "1rem",
                marginBottom: "1rem"
              }}
            >
              <div style={{ fontWeight: 900, color: "var(--neon-green)", fontSize: "1.05rem" }}>
                ✅ Conductor Workflow `chaos_checkout_workflow` COMPLETED ({completedResult.trace.durationMs}ms)
              </div>
              <div style={{ fontSize: "0.84rem", marginTop: "0.3rem" }}>
                Workflow ID:{" "}
                <code style={{ color: "var(--neon-yellow)" }}>
                  {completedResult.workflowId}
                </code>{" "}
                • Payment DO_WHILE Loop Attempts:{" "}
                <strong>{completedResult.order?.paymentAttempts || 2}</strong>
              </div>
              <div style={{ fontSize: "0.82rem", color: "#d5f5e3", marginTop: "0.35rem" }}>
                💳 <em>{completedResult.order?.receipt?.payment?.wobbleNote}</em>
              </div>
            </div>

            <div
              style={{
                background: "#110d1c",
                border: "1px solid var(--border-loud)",
                borderRadius: 12,
                padding: "1rem",
                marginBottom: "1rem",
                fontSize: "0.88rem"
              }}
            >
              <div style={{ marginBottom: "0.5rem" }}>
                <strong>📦 Carrier:</strong> {completedResult.order?.carrierName}
              </div>
              <div style={{ marginBottom: "0.5rem" }}>
                <strong>🛰️ Tracking #:</strong>{" "}
                <code style={{ color: "var(--neon-cyan)" }}>
                  {completedResult.order?.trackingNumber}
                </code>
              </div>
              <div style={{ marginBottom: "0.5rem" }}>
                <strong>⏳ Estimated Arrival:</strong> {completedResult.order?.estimatedArrival}
              </div>
              <div style={{ marginBottom: "0.5rem" }}>
                <strong>🏭 Warehouse Advisory:</strong>{" "}
                {completedResult.order?.warehouseWarning}
              </div>
              <div
                style={{
                  borderTop: "1px dashed #392c5c",
                  marginTop: "0.65rem",
                  paddingTop: "0.65rem",
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "1.15rem",
                  fontWeight: 900,
                  color: "var(--neon-yellow)"
                }}
              >
                <span>Total Irrevocably Settled:</span>
                <span>
                  $
                  {Number(completedResult.order?.receipt?.grandTotal || 0).toLocaleString(
                    undefined,
                    { minimumFractionDigits: 2, maximumFractionDigits: 2 }
                  )}
                </span>
              </div>
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.65rem" }}>
              <button
                type="button"
                className="btn-primary"
                onClick={() => {
                  const firstItem = completedResult.order?.receipt?.items?.[0];
                  const orderId = completedResult.orderId;
                  setCompletedResult(null);
                  onClose();
                  onStartReturnFromOrder({
                    orderId,
                    itemName: firstItem?.name || "Artisanal Single Ice Cube",
                    itemPrice: Number(firstItem?.lineTotal || completedResult.order?.receipt?.grandTotal || 99.99)
                  });
                }}
              >
                📋 Regret This Immediately (Start Pointless Return)
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => onInspectTrace(completedResult.trace)}
              >
                ⚙️ Inspect Live Conductor Execution Trace
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setCompletedResult(null);
                  onClose();
                }}
              >
                Back to Storefront
              </button>
            </div>
          </div>
        ) : cart.length === 0 ? (
          <div style={{ textAlign: "center", padding: "1.5rem 0.5rem" }}>
            <p style={{ fontSize: "1.05rem" }}>
              Your Regret Cart is suspiciously empty! Our shareholders are weeping.
            </p>
            {fallbackProduct && (
              <button
                type="button"
                className="btn-primary"
                onClick={() => onAddFallback(fallbackProduct)}
              >
                + Toss "{fallbackProduct.name}" (${fallbackProduct.price.toLocaleString()}) Into Cart
              </button>
            )}
          </div>
        ) : (
          <form onSubmit={handleCheckout}>
            {/* Cart Items */}
            <div style={{ marginBottom: "1rem" }}>
              {cart.map(({ product, quantity }) => (
                <div
                  key={product.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "0.75rem",
                    background: "#120e1e",
                    border: "1px solid #2d2346",
                    borderRadius: 10,
                    padding: "0.65rem 0.85rem",
                    marginBottom: "0.5rem"
                  }}
                >
                  <div>
                    <strong>
                      {product.emoji} {product.name}
                    </strong>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                      ${product.price.toLocaleString()} each • Ships from:{" "}
                      {product.cursedWarehouseLocation}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
                    <button
                      type="button"
                      className="btn-secondary"
                      style={{ padding: "0.25rem 0.6rem" }}
                      onClick={() => onUpdateQty(product.id, -1)}
                    >
                      −
                    </button>
                    <span style={{ fontWeight: 800, minWidth: 24, textAlign: "center" }}>
                      {quantity}
                    </span>
                    <button
                      type="button"
                      className="btn-secondary"
                      style={{ padding: "0.25rem 0.6rem" }}
                      onClick={() => onUpdateQty(product.id, 1)}
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Customer & Shipping */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
                gap: "0.75rem",
                marginBottom: "0.85rem"
              }}
            >
              <div>
                <label style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                  Shopper Name
                </label>
                <input
                  className="input-control"
                  style={{ width: "100%" }}
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  required
                />
              </div>
              <div>
                <label style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                  Where Should We Spam Receipts?
                </label>
                <input
                  className="input-control"
                  style={{ width: "100%" }}
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div style={{ marginBottom: "0.85rem" }}>
              <label style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                Drop-Zone Coordinates / Address
              </label>
              <input
                className="input-control"
                style={{ width: "100%" }}
                value={shippingAddress}
                onChange={(e) => setShippingAddress(e.target.value)}
                required
              />
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
                gap: "0.75rem",
                marginBottom: "0.85rem"
              }}
            >
              <div>
                <label style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                  Absurd Carrier Tier (SWITCH Route)
                </label>
                <select
                  className="select-control"
                  style={{ width: "100%" }}
                  value={shippingTier}
                  onChange={(e) => setShippingTier(e.target.value as any)}
                >
                  <option value="raccoons">
                    🦡 Three Raccoons in a Trenchcoat ($19.99)
                  </option>
                  <option value="catapult">
                    ☄️ Medieval Trebuchet Air-Drop ($49.99)
                  </option>
                  <option value="glacier">
                    🧊 Continental Drift Eco-Glacier ($0.02 — ETA 2034)
                  </option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                  Instrument of Financial Regret
                </label>
                <select
                  className="select-control"
                  style={{ width: "100%" }}
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                >
                  <option value="credit_card_of_regret">
                    💳 Credit Card of Immediate Regret
                  </option>
                  <option value="corporate_card_yolo">
                    🏢 Corporate Card (Accounting Is On Vacation)
                  </option>
                  <option value="jar_of_nickels">
                    🪙 Unsorted Mason Jar of Sticky Nickels
                  </option>
                </select>
              </div>
            </div>

            {/* Promo Code Roulette */}
            <div style={{ marginBottom: "0.85rem" }}>
              <label style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                Hostile Promo Code (Try clicking one!)
              </label>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "0.25rem" }}>
                <input
                  className="input-control"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  placeholder="Enter code..."
                />
                {["SAVE10", "MANAGER", "PLEASE", "CHAOS"].map((code) => (
                  <button
                    key={code}
                    type="button"
                    className="btn-secondary"
                    style={{ padding: "0.4rem 0.65rem", fontSize: "0.76rem" }}
                    onClick={() => setCouponCode(code)}
                  >
                    {code}
                  </button>
                ))}
              </div>
            </div>

            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.55rem",
                fontSize: "0.84rem",
                marginBottom: "1rem",
                cursor: "pointer"
              }}
            >
              <input
                type="checkbox"
                checked={chaosInsurance}
                onChange={(e) => setChaosInsurance(e.target.checked)}
              />
              <span>
                Add <strong>Acts of Goose &amp; Haunted Forklift Protection (+$199.99)</strong>{" "}
                (covers nothing, sounds reassuring)
              </span>
            </label>

            {/* Ridiculous Fee Summary */}
            <div
              style={{
                background: "#100c1b",
                border: "1px solid var(--border-loud)",
                borderRadius: 12,
                padding: "0.9rem 1rem",
                fontSize: "0.83rem",
                marginBottom: "1rem"
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Merchandise Subtotal:</span>
                <span>${subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Shipping ({shippingTier}):</span>
                <span>${shipEst.toFixed(2)}</span>
              </div>
              {chaosInsurance && (
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Acts of Goose Protection:</span>
                  <span>$199.99</span>
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Electron Wear-and-Tear Surcharge (3.7% + $14.99):</span>
                <span>${electronFee.toFixed(2)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Warehouse Raccoon Bribe + Fee Calculation Fee + Fee Naming Fee:</span>
                <span>$12.25</span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  color: couponDelta > 0 ? "#ff8a8a" : "var(--neon-green)"
                }}
              >
                <span>Promo Code Adjustment ({normCoupon || "NONE"}):</span>
                <span>
                  {couponDelta >= 0 ? `+$${couponDelta.toFixed(2)}` : `-$${Math.abs(couponDelta).toFixed(2)}`}
                </span>
              </div>
              <div
                style={{
                  borderTop: "1px dashed #392c5c",
                  marginTop: "0.5rem",
                  paddingTop: "0.5rem",
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "1.15rem",
                  fontWeight: 900,
                  color: "var(--neon-yellow)"
                }}
              >
                <span>Estimated Grand Damage:</span>
                <span>
                  ${estTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {errorMsg && (
              <div
                style={{
                  color: "#ff8a8a",
                  marginBottom: "0.75rem",
                  fontSize: "0.85rem"
                }}
              >
                ⚠️ {errorMsg}
              </div>
            )}

            <button
              type="submit"
              className="btn-primary"
              style={{ width: "100%", padding: "0.85rem", fontSize: "0.98rem" }}
              disabled={submitting}
              data-testid="submit-checkout-button"
            >
              {submitting
                ? "⚙️ Running Conductor `chaos_checkout_workflow` (Recalibrating Terminal Crystals)..."
                : "💸 Complete Regrettable Checkout via Conductor Workflow"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
