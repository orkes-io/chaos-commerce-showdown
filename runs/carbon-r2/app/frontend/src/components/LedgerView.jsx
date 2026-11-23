import React, { useEffect, useState } from "react";
import { api } from "../api.js";

export default function LedgerView({ health, orders = [], returnsList = [] }) {
  const [executions, setExecutions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [conductorUiUrl, setConductorUiUrl] = useState(
    health?.conductor?.conductorUiUrl || "http://localhost:8080"
  );

  const refresh = async () => {
    setLoading(true);
    try {
      const res = await api.getRecentWorkflows();
      setExecutions(res.executions || []);
      if (res.conductorUiUrl) setConductorUiUrl(res.conductorUiUrl);
    } catch {
      // Ignore transient refresh error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  return (
    <section className="page-section">
      <div className="section-banner ledger-banner">
        <div>
          <h2>🔬 Conductor Workflow X-Ray & Audit Ledger</h2>
          <p>
            Behind the ridiculous prices and hostile UX, every single checkout
            and return runs deterministically as a registered workflow on{" "}
            <code>
              {health?.conductor?.conductorApiUrl ||
                "http://localhost:8080/api"}
            </code>{" "}
            with <strong>zero runtime AI calls</strong>.
          </p>
        </div>
        <div className="ledger-top-actions">
          <button type="button" className="btn-secondary" onClick={refresh}>
            🔄 Refresh Live Conductor Executions
          </button>
          <a
            href={conductorUiUrl}
            target="_blank"
            rel="noreferrer"
            className="wf-ui-link"
          >
            Open Conductor Dashboard ↗
          </a>
        </div>
      </div>

      <div className="arch-cards-grid">
        <div className="arch-card">
          <h3>🛒 chaos_checkout_workflow (v1)</h3>
          <p>
            <strong>Guarantee:</strong> Always reaches{" "}
            <code>COMPLETED_NO_TAKEBACKS</code>.
          </p>
          <ul>
            <li>
              <code>JSON_JQ_TRANSFORM</code> — Summarizes cart quantities & line
              totals
            </li>
            <li>
              <code>FORK_JOIN</code> + <code>JOIN</code> — 3 parallel checks:
              Warehouse Raccoon Inventory Synthesis, Payment Vibecheck, Carrier
              Roulette
            </li>
            <li>
              <code>SWITCH</code> + <code>SET_VARIABLE</code> — Routes
              backfiring promo codes (<code>SAVE10</code>, <code>SAVE50</code>,{" "}
              <code>FREESHIP</code>, <code>PLEASE</code>)
            </li>
            <li>
              <code>INLINE (graaljs)</code> + <code>JSON_JQ_TRANSFORM</code> —
              Computes extortion fees & final receipt
            </li>
          </ul>
          <a
            href={`${conductorUiUrl}/workflowDef/chaos_checkout_workflow`}
            target="_blank"
            rel="noreferrer"
            className="arch-def-link"
          >
            View Workflow Definition in Conductor ↗
          </a>
        </div>

        <div className="arch-card">
          <h3>🏛️ chaos_return_workflow (v1)</h3>
          <p>
            <strong>Guarantee:</strong> Every return reaches a concrete terminal
            decision (<code>APPROVED</code>, <code>APPROVED_STORE_SCRIP</code>,
            or <code>DENIED</code>).
          </p>
          <ul>
            <li>
              <code>FORK_JOIN</code> + <code>JOIN</code> — 4 parallel pointless
              audits: Astrology, Cardboard Crispness/Shyness, Tear Salinity,
              Reverse Serial Numerology
            </li>
            <li>
              <code>DO_WHILE (graaljs, cap=3)</code> — 3-iteration rubber-stamp
              sub-committee loop
            </li>
            <li>
              <code>SWITCH</code> + <code>SET_VARIABLE</code> — Routes score
              into Tribunal Verdict
            </li>
            <li>
              <code>INLINE (graaljs)</code> + <code>JSON_JQ_TRANSFORM</code> —
              Calculates restocking fee & issues official RMA decree
            </li>
          </ul>
          <a
            href={`${conductorUiUrl}/workflowDef/chaos_return_workflow`}
            target="_blank"
            rel="noreferrer"
            className="arch-def-link"
          >
            View Workflow Definition in Conductor ↗
          </a>
        </div>
      </div>

      <div className="ledger-table-card">
        <h3>
          ⚡ Live Executions Queried from Conductor ({executions.length})
        </h3>
        {loading ? (
          <p>Querying Conductor search API...</p>
        ) : executions.length === 0 ? (
          <p>
            No executions recorded yet. Place an order or submit a return to
            watch Conductor execute live!
          </p>
        ) : (
          <div className="ledger-table-wrap">
            <table className="ledger-table">
              <thead>
                <tr>
                  <th>Workflow</th>
                  <th>Workflow ID</th>
                  <th>Correlation ID</th>
                  <th>Status</th>
                  <th>Duration</th>
                  <th>Inspect</th>
                </tr>
              </thead>
              <tbody>
                {executions.map((ex) => (
                  <tr key={ex.workflowId}>
                    <td>
                      <code>{ex.workflowType}</code>
                    </td>
                    <td>
                      <code>{ex.workflowId}</code>
                    </td>
                    <td>{ex.correlationId || "—"}</td>
                    <td>
                      <span
                        className={`wf-status-pill status-${String(
                          ex.status
                        ).toLowerCase()}`}
                      >
                        {ex.status}
                      </span>
                    </td>
                    <td>{ex.executionTime ?? 0}ms</td>
                    <td>
                      <a
                        href={ex.conductorExecutionUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Conductor UI ↗
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="ledger-summary-row">
        <div className="stat-card">
          <span>Recorded Store Orders</span>
          <strong>{orders.length}</strong>
        </div>
        <div className="stat-card">
          <span>Tribunal Return Verdicts</span>
          <strong>{returnsList.length}</strong>
        </div>
        <div className="stat-card">
          <span>Runtime AI API Calls</span>
          <strong>0 (100% Deterministic)</strong>
        </div>
      </div>
    </section>
  );
}
