import React from "react";
import { WorkflowTrace } from "./WorkflowTrace.jsx";
import { formatUsd } from "../api.js";

export function CheckoutReceiptModal({ result, onClose, onStartReturn }) {
  if (!result) return null;
  const { order, workflow } = result;
  const receipt = order.receipt || {};

  return (
    <div className="backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <span className="badge-pill lime">✅ CHECKOUT COMPLETED VIA CONDUCTOR</span>
            <h2 style={{ margin: "6px 0 2px" }}>
              Congratulations! Your Terrible Decision Is Official!
            </h2>
            <div style={{ fontFamily: "var(--mono)", fontSize: "0.82rem" }}>
              Order ID: <strong>{order.orderId}</strong> • Certificate:{" "}
              <strong>{order.chaosCertificate}</strong>
            </div>
          </div>
          <button type="button" className="btn btn-sm" onClick={onClose}>
            ✕ Close
          </button>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 12,
            marginBottom: 14,
          }}
        >
          <div className="panel" style={{ marginBottom: 0, padding: 14 }}>
            <strong>📦 Fulfillment Nonsense</strong>
            <div style={{ fontSize: "0.84rem", marginTop: 6 }}>
              <div>
                <strong>Tracking:</strong>{" "}
                <code>{order.trackingNumber}</code>
              </div>
              <div>
                <strong>ETA:</strong> {order.estimatedDelivery}
              </div>
              <div>
                <strong>Warehouse:</strong> {order.fulfillment?.warehouse}
              </div>
              <div>
                <strong>Stock:</strong> {order.fulfillment?.stockStatus}
              </div>
              <div>
                <strong>Packing:</strong> {order.fulfillment?.packingNote}
              </div>
            </div>
          </div>

          <div className="panel" style={{ marginBottom: 0, padding: 14 }}>
            <strong>💳 Payment &amp; Vibe Audit</strong>
            <div style={{ fontSize: "0.84rem", marginTop: 6 }}>
              <div>
                <strong>Transaction:</strong>{" "}
                <code>{order.payment?.transactionId}</code>
              </div>
              <div>
                <strong>Tier:</strong> {order.payment?.tier}
              </div>
              <div>
                <strong>Ceremony:</strong> {order.payment?.ceremonyNote}
              </div>
              <div>
                <strong>Vibe Score:</strong> {order.vibeCheck?.vibeScore}/100 —{" "}
                {order.vibeCheck?.fraudLabel}
              </div>
            </div>
          </div>
        </div>

        <div className="panel" style={{ padding: 14, background: "#fef9c3" }}>
          <strong>🧾 Official Inflated Receipt</strong>
          <div style={{ marginTop: 8 }}>
            {(receipt.items || []).map((item, idx) => (
              <div key={idx} className="fee-row">
                <span>
                  {item.quantity}× {item.name}
                </span>
                <span>{formatUsd(item.lineTotal)}</span>
              </div>
            ))}
            <div className="fee-row">
              <span>Shipping ({receipt.shippingLabel})</span>
              <span>{formatUsd(receipt.shippingCost)}</span>
            </div>
            {(receipt.fees || []).map((f, idx) => (
              <div key={idx} className="fee-row" style={{ color: "#991b1b" }}>
                <span>+ {f.name}</span>
                <span>{formatUsd(f.amount)}</span>
              </div>
            ))}
            <div className="fee-row total">
              <span>TOTAL CHARGED (IMAGINARY)</span>
              <span>{formatUsd(receipt.grandTotal)}</span>
            </div>
          </div>
        </div>

        <WorkflowTrace
          trace={workflow || order.workflowTrace}
          title="Conductor Checkout Workflow (chaos_checkout)"
        />

        <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => onStartReturn(order)}
          >
            🧾 Immediately Regret This &amp; Enter Returns Maze
          </button>
          <button type="button" className="btn btn-yellow" onClick={onClose}>
            Keep Shopping Responsibly (Not)
          </button>
        </div>
      </div>
    </div>
  );
}
