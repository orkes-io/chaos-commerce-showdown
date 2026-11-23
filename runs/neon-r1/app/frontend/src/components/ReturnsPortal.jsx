import React, { useEffect, useState } from "react";
import { api, formatUsd } from "../api.js";
import { WorkflowTrace } from "./WorkflowTrace.jsx";

const CAPTCHA_TILES = [
  "Traffic Jam",
  "Cold Soup",
  "404 Error",
  "Wet Socks",
  "Tax Audit",
  "Printer Jam",
  "Reply-All Email",
  "Dead Phone 1%",
  "Mild Existential Dread",
];

export function ReturnsPortal({
  orders,
  returnsList,
  preselectedOrder,
  onReturnCreated,
}) {
  const [step, setStep] = useState(1);
  const [orderId, setOrderId] = useState(
    preselectedOrder?.orderId || orders[0]?.orderId || "CHS-ORD-SEED-001"
  );
  const [reason, setReason] = useState("The product stared at me disrespectfully");
  const [moonPhase, setMoonPhase] = useState("Waxing Gibbous (Probably)");
  const [regretLevel, setRegretLevel] = useState("Existential");
  const [waiver1, setWaiver1] = useState(false);
  const [waiver2, setWaiver2] = useState(false);
  const [selectedTiles, setSelectedTiles] = useState([]);
  const [captchaPassed, setCaptchaPassed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [latestResult, setLatestResult] = useState(null);

  useEffect(() => {
    if (preselectedOrder?.orderId) {
      setOrderId(preselectedOrder.orderId);
      setStep(1);
      setLatestResult(null);
    }
  }, [preselectedOrder]);

  const selectedOrder = orders.find((o) => o.orderId === orderId) || orders[0];
  const itemName =
    selectedOrder?.receipt?.items?.[0]?.name ||
    "Artisanal Single Paperclip (Pre-Bent)";
  const paidAmount = selectedOrder?.receipt?.grandTotal || 9999.99;

  const toggleTile = (tile) => {
    setSelectedTiles((prev) =>
      prev.includes(tile) ? prev.filter((t) => t !== tile) : [...prev, tile]
    );
  };

  const handleVerifyCaptcha = () => {
    if (selectedTiles.length < 2) {
      setError("Please click at least 2 completely un-peaceful tiles to prove you are human.");
      return;
    }
    setError(null);
    setCaptchaPassed(true);
  };

  const handleSubmitReturn = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const result = await api.submitReturn({
        orderId: selectedOrder?.orderId || orderId,
        itemName,
        paidAmount,
        reason,
        moonPhase,
        regretLevel,
        captchaAnswer: selectedTiles.join(", "),
        customerEmail: selectedOrder?.customer?.email || "regret@example.com",
      });
      setLatestResult(result);
      onReturnCreated(result.returnRequest);
      setStep(4);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const resetGauntlet = () => {
    setStep(1);
    setWaiver1(false);
    setWaiver2(false);
    setSelectedTiles([]);
    setCaptchaPassed(false);
    setLatestResult(null);
    setError(null);
  };

  return (
    <div>
      <div className="panel" style={{ background: "linear-gradient(135deg, #fff 0%, #ffe4ee 100%)" }}>
        <span className="badge-pill pink">🧾 FORM 27-B/6 — RETURNS BUREAUCRACY MAZE</span>
        <h2 style={{ margin: "8px 0 6px" }}>
          The Pointless Returns Gauntlet (Guaranteed Decision!)
        </h2>
        <p style={{ margin: 0, maxWidth: "70ch" }}>
          To return an item at Chaos Commerce, you must survive our 3-stage pointless check
          interrogation — after which Conductor workflow <code>chaos_return_bureaucracy</code>{" "}
          runs 3 parallel pointless audits (Lunar Alignment, Box Karma, Chief Legal Hamster),
          collects mandatory rubber stamps in a <code>DO_WHILE</code> loop, and{" "}
          <strong>always reaches a final return decision</strong>.
        </p>
      </div>

      <div className="stepper">
        <span className={`step-pill ${step === 1 ? "active" : step > 1 ? "done" : ""}`}>
          1. Select Regret
        </span>
        <span className={`step-pill ${step === 2 ? "active" : step > 2 ? "done" : ""}`}>
          2. Lunar &amp; Emotional Audit
        </span>
        <span className={`step-pill ${step === 3 ? "active" : step > 3 ? "done" : ""}`}>
          3. Impossible CAPTCHA &amp; Submit
        </span>
        <span className={`step-pill ${step === 4 ? "done" : ""}`}>
          4. Official Conductor Decision
        </span>
      </div>

      {error && <div className="alert-banner error">❌ {error}</div>}

      {step === 1 && (
        <div className="panel">
          <h3>Step 1: Which Financial Mistake Are You Returning?</h3>
          <div className="field">
            <label>Choose an Order</label>
            <select
              className="select"
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
            >
              {orders.map((o) => (
                <option key={o.orderId} value={o.orderId}>
                  {o.orderId} — {o.receipt?.items?.[0]?.name || "Chaos Item"} (
                  {formatUsd(o.receipt?.grandTotal || 0)})
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label>Official Reason for Unreasonable Dissatisfaction</label>
            <select
              className="select"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            >
              <option>The product stared at me disrespectfully</option>
              <option>Arrived pre-broken in an artisanal way I did not request</option>
              <option>Angry Carrier Pigeon ate my porch mat</option>
              <option>It was literally an empty zip-top bag</option>
              <option>My cat rejected the cardboard box</option>
            </select>
          </div>

          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              setError(null);
              setStep(2);
            }}
          >
            Proceed to Pointless Audit →
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="panel">
          <h3>Step 2: Mandatory Astronomical &amp; Emotional Readiness Audit</h3>
          <p style={{ fontSize: "0.86rem", color: "#52525b" }}>
            Our Conductor workers will solemnly inspect every completely irrelevant field below.
          </p>

          <div className="field">
            <label>Current Phase of the Moon (Required for Box Karma Calibration)</label>
            <input
              className="input"
              value={moonPhase}
              onChange={(e) => setMoonPhase(e.target.value)}
              placeholder="e.g. Waning Gibbous, Full Cheese, No Idea"
            />
          </div>

          <div className="field">
            <label>Quantify Your Buyer&apos;s Regret (Influences Verdict Route!)</label>
            <select
              className="select"
              value={regretLevel}
              onChange={(e) => setRegretLevel(e.target.value)}
            >
              <option value="Existential">Existential (Tends toward Chaos Bucks™ Credit)</option>
              <option value="Severe">Severe (Tends toward Partial Refund minus Feelings Fee)</option>
              <option value="Mild">Mild (Tends toward Dramatic Denial + $0.02 Voucher)</option>
              <option value="Cosmic">Cosmic (Immediate Hamster Sympathy)</option>
            </select>
          </div>

          <div style={{ display: "grid", gap: 8, margin: "12px 0 16px" }}>
            <label style={{ display: "flex", gap: 8, alignItems: "center", fontWeight: 700, fontSize: "0.86rem" }}>
              <input
                type="checkbox"
                checked={waiver1}
                onChange={(e) => setWaiver1(e.target.checked)}
              />
              I acknowledge the item was probably fine and I am simply hard to please.
            </label>
            <label style={{ display: "flex", gap: 8, alignItems: "center", fontWeight: 700, fontSize: "0.86rem" }}>
              <input
                type="checkbox"
                checked={waiver2}
                onChange={(e) => setWaiver2(e.target.checked)}
              />
              I promise not to make direct eye contact with Chief Legal Hamster Sir Squeaks Esq.
            </label>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button type="button" className="btn" onClick={() => setStep(1)}>
              ← Back
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                if (!waiver1 || !waiver2) {
                  setError("You must check BOTH completely pointless waivers to continue!");
                  return;
                }
                setError(null);
                setStep(3);
              }}
            >
              Proceed to Impossible CAPTCHA →
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="panel">
          <h3>Step 3: Humanity Check — Select All Squares Containing &ldquo;Inner Peace&rdquo;</h3>
          <p style={{ fontSize: "0.86rem", color: "#52525b" }}>
            Click at least 2 tiles below, then click Verify.
          </p>

          <div className="captcha-grid">
            {CAPTCHA_TILES.map((tile) => {
              const active = selectedTiles.includes(tile);
              return (
                <button
                  key={tile}
                  type="button"
                  className={`captcha-tile ${active ? "selected" : ""}`}
                  onClick={() => toggleTile(tile)}
                >
                  {active ? "✓ " : ""}
                  {tile}
                </button>
              );
            })}
          </div>

          <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button type="button" className="btn" onClick={() => setStep(2)}>
              ← Back
            </button>
            {!captchaPassed ? (
              <button
                type="button"
                className="btn btn-cyan"
                onClick={handleVerifyCaptcha}
              >
                🔍 Verify Impossible CAPTCHA
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-primary"
                disabled={submitting}
                onClick={handleSubmitReturn}
              >
                {submitting
                  ? "🐹 Executing Conductor Return Workflow..."
                  : "⚡ Submit Form 27-B/6 to Conductor Bureaucracy"}
              </button>
            )}
          </div>

          {captchaPassed && (
            <div className="alert-banner warn" style={{ marginTop: 12 }}>
              ✅ Close enough! Honestly none of those are inner peace and we weren&apos;t checking anyway. Click Submit to launch the Conductor workflow!
            </div>
          )}
        </div>
      )}

      {step === 4 && latestResult && (
        <div className="panel" style={{ background: "#fefce8" }}>
          <span className="badge-pill lime">
            ✅ DECISION REACHED: {latestResult.returnRequest.decision?.outcomeBadge}
          </span>
          <h2 style={{ margin: "10px 0 6px" }}>
            {latestResult.returnRequest.decision?.title}
          </h2>
          <p style={{ fontSize: "0.95rem" }}>
            {latestResult.returnRequest.decision?.explanation}
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
              gap: 10,
              margin: "14px 0",
            }}
          >
            <div className="panel" style={{ marginBottom: 0, padding: 12 }}>
              <div style={{ fontSize: "0.76rem", fontWeight: 800, color: "#52525b" }}>
                CASE NUMBER
              </div>
              <div style={{ fontFamily: "var(--mono)", fontWeight: 900 }}>
                {latestResult.returnRequest.caseNumber}
              </div>
            </div>
            <div className="panel" style={{ marginBottom: 0, padding: 12 }}>
              <div style={{ fontSize: "0.76rem", fontWeight: 800, color: "#52525b" }}>
                AWARDED AMOUNT
              </div>
              <div style={{ fontFamily: "var(--mono)", fontWeight: 900, color: "#ff2a6d" }}>
                {formatUsd(latestResult.returnRequest.decision?.refundAmount || 0)}{" "}
                ({latestResult.returnRequest.decision?.currency})
              </div>
            </div>
            <div className="panel" style={{ marginBottom: 0, padding: 12 }}>
              <div style={{ fontSize: "0.76rem", fontWeight: 800, color: "#52525b" }}>
                VOUCHER / REFUND CODE
              </div>
              <div style={{ fontFamily: "var(--mono)", fontWeight: 900 }}>
                {latestResult.returnRequest.decision?.voucherCode}
              </div>
            </div>
            <div className="panel" style={{ marginBottom: 0, padding: 12 }}>
              <div style={{ fontSize: "0.76rem", fontWeight: 800, color: "#52525b" }}>
                POINTLESS STAMPS COLLECTED
              </div>
              <div style={{ fontFamily: "var(--mono)", fontWeight: 900 }}>
                {latestResult.returnRequest.stampsCollected} rubber stamps (DO_WHILE)
              </div>
            </div>
          </div>

          <h4 style={{ marginBottom: 8 }}>🔎 Parallel Pointless Audit Findings (FORK_JOIN)</h4>
          <div style={{ display: "grid", gap: 8, marginBottom: 12 }}>
            {(latestResult.returnRequest.dossier?.pointlessChecks || []).map((chk, idx) => (
              <div
                key={idx}
                style={{
                  background: "#fff",
                  border: "2px solid #111",
                  borderRadius: 8,
                  padding: "10px 12px",
                  fontSize: "0.86rem",
                }}
              >
                <strong>{chk.name}</strong>{" "}
                <span className="badge-pill cyan">{chk.status}</span>{" "}
                <span className="badge-pill yellow">Score: {chk.score}</span>
                <div style={{ marginTop: 4 }}>{chk.verdict}</div>
              </div>
            ))}
          </div>

          <WorkflowTrace
            trace={latestResult.workflow || latestResult.returnRequest.workflowTrace}
            title="Conductor Return Workflow (chaos_return_bureaucracy)"
          />

          <button
            type="button"
            className="btn btn-yellow"
            style={{ marginTop: 14 }}
            onClick={resetGauntlet}
          >
            🔁 File Another Pointless Return
          </button>
        </div>
      )}

      {/* Historical return decisions */}
      {returnsList.length > 0 && (
        <div className="panel">
          <h3>📜 Return Decisions Ledger ({returnsList.length})</h3>
          {returnsList.map((ret) => (
            <div
              key={ret.returnId}
              style={{
                border: "2px solid #111",
                borderRadius: 10,
                padding: 14,
                marginBottom: 12,
                background: "#fffdf4",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 8,
                  flexWrap: "wrap",
                  marginBottom: 6,
                }}
              >
                <div>
                  <strong>{ret.caseNumber}</strong> • Order{" "}
                  <code>{ret.orderId}</code> ({ret.itemName})
                </div>
                <span className="badge-pill lime">
                  {ret.decision?.outcomeBadge || "DECIDED"}
                </span>
              </div>
              <div style={{ fontSize: "0.86rem", marginBottom: 6 }}>
                {ret.decision?.title} — Award:{" "}
                <strong>
                  {formatUsd(ret.decision?.refundAmount || 0)} ({ret.decision?.currency})
                </strong>{" "}
                • Code: <code>{ret.decision?.voucherCode}</code>
              </div>
              {ret.workflowTrace && (
                <details>
                  <summary style={{ cursor: "pointer", fontWeight: 800, fontSize: "0.82rem" }}>
                    Inspect Conductor Execution ({ret.workflowId})
                  </summary>
                  <WorkflowTrace trace={ret.workflowTrace} />
                </details>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
