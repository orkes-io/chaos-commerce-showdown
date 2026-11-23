import React, { useEffect, useRef, useState } from "react";
import { Award, CheckCircle2, CreditCard, RotateCcw, Truck, X } from "lucide-react";
import { api } from "../api.js";
import WorkflowTimeline from "./WorkflowTimeline.jsx";

const PAYMENT_METHODS = [
  "Imaginary Platinum Card (Ending in 0000)",
  "IOU Scribbled on a Napkin",
  "Bag of Unsorted Pocket Lint",
  "ChaosCoin (Value: -$4.20)",
];

export default function CheckoutModal({
  open,
  onClose,
  items,
  shippingMethods,
  includeBox,
  includeInsurance,
  promoCode,
  onOrderCompleted,
  onStartReturnForOrder,
}) {
  const [customerName, setCustomerName] = useState("Alex Regret");
  const [customerEmail, setCustomerEmail] = useState("alex@chaos-shopper.invalid");
  const [shippingAddress, setShippingAddress] = useState("742 Impulse Lane, Reno, NV 89501");
  const [shippingMethod, setShippingMethod] = useState("pigeon");
  const [paymentMethod, setPaymentMethod] = useState(PAYMENT_METHODS[0]);
  const [acknowledged, setAcknowledged] = useState(true);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [execution, setExecution] = useState(null);
  const pollRef = useRef(null);

  useEffect(() => {
    if (!open) {
      if (pollRef.current) clearInterval(pollRef.current);
      setExecution(null);
      setError("");
      setSubmitting(false);
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [open]);

  if (!open) return null;

  const startPolling = (workflowId) => {
    const fetchOnce = async () => {
      try {
        const exec = await api.getWorkflowExecution(workflowId);
        setExecution(exec);
        if (["COMPLETED", "FAILED", "TIMED_OUT", "TERMINATED"].includes(exec.status)) {
          if (pollRef.current) clearInterval(pollRef.current);
          pollRef.current = null;
          setSubmitting(false);
          if (exec.status === "COMPLETED" && onOrderCompleted) {
            onOrderCompleted(exec);
          }
        }
      } catch (err) {
        setError(err.message);
      }
    };

    fetchOnce();
    pollRef.current = setInterval(fetchOnce, 350);
  };

  const handleCheckoutSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const started = await api.startCheckout({
        customerName,
        customerEmail,
        shippingAddress,
        shippingMethod,
        promoCode,
        paymentMethod,
        includeCardboardBox: includeBox,
        includeShippingInsurance: includeInsurance,
        items: items.map((i) => ({
          productId: i.id,
          title: i.title,
          price: i.price,
          quantity: i.quantity,
        })),
      });
      setExecution({
        workflowId: started.workflowId,
        workflowName: "chaos_checkout_workflow",
        status: "RUNNING",
        conductorUiUrl: started.conductorUiUrl,
        tasks: [],
        output: {},
      });
      startPolling(started.workflowId);
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  };

  const isCompleted = execution?.status === "COMPLETED";
  const receipt = execution?.output || {};

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-card modal-wide"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Chaos Checkout"
      >
        <button type="button" className="modal-close" onClick={onClose} aria-label="Close Checkout">
          <X size={20} />
        </button>

        <div className="checkout-header">
          <CreditCard size={24} />
          <div>
            <h2>Chaos Checkout — Powered by Conductor Workflow</h2>
            <p>
              No matter how absurd the fees or shipping method, behind the jokes our{" "}
              <code>chaos_checkout_workflow</code> always completes!
            </p>
          </div>
        </div>

        {!execution && (
          <form onSubmit={handleCheckoutSubmit} className="checkout-form">
            <div className="checkout-grid">
              <div className="checkout-col">
                <h3>1. Victim Information</h3>
                <label className="field-label">
                  Full Name
                  <input
                    type="text"
                    className="text-input"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    required
                  />
                </label>

                <label className="field-label">
                  Email for Spam &amp; Regret Receipts
                  <input
                    type="email"
                    className="text-input"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    required
                  />
                </label>

                <label className="field-label">
                  Approximate Delivery Coordinates
                  <input
                    type="text"
                    className="text-input"
                    value={shippingAddress}
                    onChange={(e) => setShippingAddress(e.target.value)}
                    required
                  />
                </label>

                <label className="field-label">
                  Simulated Payment Method (No Real Charge!)
                  <select
                    className="text-input"
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                  >
                    {PAYMENT_METHODS.map((pm) => (
                      <option key={pm} value={pm}>
                        {pm}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="checkout-col">
                <h3>
                  <Truck size={17} /> 2. Choose Your Shipping Disaster
                </h3>
                <div className="shipping-options">
                  {(shippingMethods || []).map((m) => (
                    <label
                      key={m.id}
                      className={`shipping-card ${shippingMethod === m.id ? "shipping-card-active" : ""}`}
                    >
                      <input
                        type="radio"
                        name="shippingMethod"
                        value={m.id}
                        checked={shippingMethod === m.id}
                        onChange={() => setShippingMethod(m.id)}
                      />
                      <div className="shipping-card-body">
                        <div className="shipping-card-top">
                          <strong>{m.name}</strong>
                          <span className="shipping-price">${m.price.toFixed(2)}</span>
                        </div>
                        <div className="shipping-eta">ETA: {m.eta}</div>
                        <div className="shipping-warn">{m.warning}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <label className="checkbox-row waive-box">
              <input
                type="checkbox"
                checked={acknowledged}
                onChange={(e) => setAcknowledged(e.target.checked)}
                required
              />
              <span>
                I understand Chaos Commerce will invent surprise hidden fees during checkout, route my package via questionable logistics, and still reliably complete my order via Conductor.
              </span>
            </label>

            {error && <div className="alert-error">{error}</div>}

            <button
              type="submit"
              className="btn-primary btn-full btn-lg"
              disabled={submitting || !acknowledged}
              data-testid="submit-checkout-btn"
            >
              {submitting
                ? "Launching Conductor Workflow..."
                : "Complete Order (Execute chaos_checkout_workflow)"}
            </button>
          </form>
        )}

        {execution && (
          <div className="execution-view">
            <WorkflowTimeline
              execution={execution}
              title="Conductor Checkout Execution (chaos_checkout_workflow)"
            />

            {isCompleted && (
              <div className="receipt-card" data-testid="checkout-receipt">
                <div className="receipt-banner">
                  <Award size={26} />
                  <div>
                    <h3>{receipt.certificateTitle || "Official Certificate of Financial Regret"}</h3>
                    <span>
                      Order <strong>{receipt.orderId}</strong> • Status:{" "}
                      <strong>{receipt.status}</strong>
                    </span>
                  </div>
                  <CheckCircle2 size={28} className="receipt-check" />
                </div>

                <div className="receipt-grid">
                  <div>
                    <h4>Itemized Financial Damage</h4>
                    <ul className="receipt-list">
                      <li>
                        <span>Items Subtotal</span>
                        <span>${Number(receipt.totals?.subtotal || 0).toFixed(2)}</span>
                      </li>
                      <li>
                        <span>Shipping Disaster</span>
                        <span>${Number(receipt.totals?.shippingCost || 0).toFixed(2)}</span>
                      </li>
                      {Number(receipt.totals?.promoAdjustment || 0) !== 0 && (
                        <li>
                          <span>Backwards Promo Adjustment</span>
                          <span>
                            {Number(receipt.totals.promoAdjustment) >= 0 ? "+" : "-"}$
                            {Math.abs(Number(receipt.totals.promoAdjustment)).toFixed(2)}
                          </span>
                        </li>
                      )}
                      {(receipt.fees || []).map((fee) => (
                        <li key={fee.name} className="receipt-fee-row">
                          <span>
                            {fee.name}
                            <small>{fee.justification}</small>
                          </span>
                          <span>+${Number(fee.amount).toFixed(2)}</span>
                        </li>
                      ))}
                      <li className="receipt-grand">
                        <span>GRAND TOTAL CHARGED (SIMULATED)</span>
                        <span>${Number(receipt.grandTotal || 0).toFixed(2)}</span>
                      </li>
                    </ul>
                  </div>

                  <div>
                    <h4>Absurd Logistics Dispatch</h4>
                    <div className="dispatch-box">
                      <p>
                        <strong>Carrier:</strong> {receipt.shipping?.carrier}
                      </p>
                      <p>
                        <strong>Tracking Code:</strong> <code>{receipt.shipping?.trackingCode}</code>
                      </p>
                      <p>
                        <strong>Estimated Arrival:</strong> {receipt.shipping?.eta}
                      </p>
                      <p>
                        <strong>Dispatch Log:</strong> {receipt.shipping?.note}
                      </p>
                      <p>
                        <strong>Warehouse Rumor:</strong> {receipt.warehouseNote}
                      </p>
                      <p>
                        <strong>Payment Auth:</strong>{" "}
                        <code>{receipt.payment?.authorizationCode}</code> ({receipt.payment?.receiptStamp})
                      </p>
                    </div>
                  </div>
                </div>

                <div className="receipt-actions">
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() => onStartReturnForOrder(execution)}
                    data-testid="start-return-from-receipt-btn"
                  >
                    <RotateCcw size={16} /> Immediately Regret This &amp; Start a Return →
                  </button>
                  <button type="button" className="btn-secondary" onClick={onClose}>
                    Keep Shopping Like Nothing Happened
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
