import React from "react";
import { WorkflowTrace } from "./WorkflowTrace.jsx";
import { formatUsd } from "../api.js";

export function OrdersView({ orders, onStartReturn }) {
  return (
    <div>
      <div className="panel" style={{ background: "linear-gradient(135deg, #fff 0%, #dff8ff 100%)" }}>
        <span className="badge-pill cyan">📦 ORDERS &amp; CONDUCTOR TELEMETRY</span>
        <h2 style={{ margin: "8px 0 4px" }}>Your Completed Financial Decisions</h2>
        <p style={{ margin: 0 }}>
          Every checkout placed in this store runs through the Conductor workflow{" "}
          <code>chaos_checkout</code> and always reaches <code>COMPLETED</code>. Click any
          order to inspect its Conductor task trace or drag it through the Returns Maze!
        </p>
      </div>

      {orders.map((order) => (
        <div key={order.orderId} className="panel">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <div>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <strong style={{ fontSize: "1.05rem", fontFamily: "var(--mono)" }}>
                  {order.orderId}
                </strong>
                <span className="badge-pill lime">{order.status}</span>
                {order.seeded && (
                  <span className="badge-pill yellow">Sample Historical Order</span>
                )}
              </div>
              <div style={{ fontSize: "0.84rem", color: "#52525b", marginTop: 4 }}>
                Tracking: <code>{order.trackingNumber}</code> • ETA: {order.estimatedDelivery}
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <strong style={{ fontSize: "1.2rem", fontFamily: "var(--mono)", color: "#ff2a6d" }}>
                {formatUsd(order.receipt?.grandTotal || 0)}
              </strong>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => onStartReturn(order)}
              >
                🧾 Return This Mistake
              </button>
            </div>
          </div>

          <div style={{ marginTop: 10, fontSize: "0.86rem" }}>
            {(order.receipt?.items || []).map((item, idx) => (
              <div key={idx}>
                • {item.quantity}× <strong>{item.name}</strong> ({formatUsd(item.lineTotal)})
              </div>
            ))}
          </div>

          {order.workflowTrace && (
            <details style={{ marginTop: 10 }}>
              <summary style={{ cursor: "pointer", fontWeight: 800, fontSize: "0.84rem" }}>
                ⚡ View Conductor Checkout Workflow Trace ({order.workflowId})
              </summary>
              <WorkflowTrace trace={order.workflowTrace} />
            </details>
          )}
        </div>
      ))}
    </div>
  );
}
