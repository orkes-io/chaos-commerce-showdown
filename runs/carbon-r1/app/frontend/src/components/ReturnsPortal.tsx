import React, { useEffect, useState } from "react";
import { submitReturn } from "../api";
import type { ChaosProduct, WorkflowExecutionTrace } from "../types";

interface ReturnsPortalProps {
  products: ChaosProduct[];
  recentOrders: Array<Record<string, any>>;
  prefillOrder: {
    orderId: string;
    itemName: string;
    itemPrice: number;
  } | null;
  onReturnCompleted: (res: {
    returnId: string;
    workflowId: string;
    decision: Record<string, any>;
    trace: WorkflowExecutionTrace;
  }) => void;
  onInspectTrace: (trace: WorkflowExecutionTrace) => void;
}

export const ReturnsPortal: React.FC<ReturnsPortalProps> = ({
  products,
  recentOrders,
  prefillOrder,
  onReturnCompleted,
  onInspectTrace
}) => {
  const [orderId, setOrderId] = useState(prefillOrder?.orderId || "CHC-884210");
  const [itemName, setItemName] = useState(
    prefillOrder?.itemName ||
      products[0]?.name ||
      "Artisanal Single Ice Cube (Pre-Melted for Convenience)"
  );
  const [itemPrice, setItemPrice] = useState<number>(
    prefillOrder?.itemPrice || products[0]?.price || 4899.99
  );
  const [reason, setReason] = useState("existential_regret");

  // Pointless Bureaucratic Gauntlet Inputs
  const [moonPhase, setMoonPhase] = useState("suspiciously_cheese");
  const [originalAirPercent, setOriginalAirPercent] = useState(84);
  const [tapeStripCount, setTapeStripCount] = useState(7);
  const [eyeContactSeconds, setEyeContactSeconds] = useState(19);
  const [tearsShed, setTearsShed] = useState(4);
  const [sworeHubrisOath, setSworeHubrisOath] = useState(true);
  const [didNotFeedAfterMidnight, setDidNotFeedAfterMidnight] = useState(true);
  const [acceptedBirdLaw, setAcceptedBirdLaw] = useState(true);
  const [captchaMathAnswer, setCaptchaMathAnswer] = useState("potato");
  const [apologyText, setApologyText] = useState(
    "Dearest Warehouse Forklift #4, I am profoundly sorry for my hubris and humbly beg forgiveness for returning this magnificent specimen."
  );

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [latestResult, setLatestResult] = useState<{
    returnId: string;
    orderId: string;
    workflowId: string;
    conductorExecutionUrl: string;
    decision: Record<string, any>;
    trace: WorkflowExecutionTrace;
  } | null>(null);

  useEffect(() => {
    if (prefillOrder) {
      setOrderId(prefillOrder.orderId);
      setItemName(prefillOrder.itemName);
      setItemPrice(prefillOrder.itemPrice);
    }
  }, [prefillOrder]);

  const applyPreset = (preset: "miracle" | "partial" | "denied") => {
    if (preset === "miracle") {
      setReason("existential_regret");
      setMoonPhase("suspiciously_cheese");
      setOriginalAirPercent(92);
      setTapeStripCount(7);
      setEyeContactSeconds(24);
      setTearsShed(6);
      setSworeHubrisOath(true);
      setDidNotFeedAfterMidnight(true);
      setApologyText(
        "Oh majestic Warehouse Forklift #4, I am deeply sorry for my unspeakable hubris and regret every life choice leading here."
      );
    } else if (preset === "partial") {
      setReason("hummed_at_cat");
      setMoonPhase("waxing_gibbous");
      setOriginalAirPercent(76);
      setTapeStripCount(9);
      setEyeContactSeconds(16);
      setTearsShed(3);
      setSworeHubrisOath(true);
      setDidNotFeedAfterMidnight(true);
      setApologyText(
        "Sorry about the cat situation, Forklift #4, please accept this box back."
      );
    } else {
      setReason("looked_at_it_wrong");
      setMoonPhase("indoors_ceiling");
      setOriginalAirPercent(12);
      setTapeStripCount(41);
      setEyeContactSeconds(2);
      setTearsShed(0);
      setSworeHubrisOath(false);
      setDidNotFeedAfterMidnight(false);
      setApologyText("Just give me my money back immediately.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await submitReturn({
        orderId,
        itemName,
        itemPrice: Number(itemPrice) || 99.99,
        reason,
        moonPhase,
        eyeContactSeconds: Number(eyeContactSeconds),
        originalAirPercent: Number(originalAirPercent),
        tapeStripCount: Number(tapeStripCount),
        tearsShed: Number(tearsShed),
        sworeHubrisOath,
        didNotFeedAfterMidnight,
        apologyText
      });
      setLatestResult(res);
      onReturnCompleted(res);
    } catch (err: any) {
      setErrorMsg(err?.message || "Bureaucracy pneumatic tube jammed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="hero-banner" style={{ borderColor: "var(--neon-cyan)" }}>
        <div style={{ maxWidth: 760 }}>
          <span className="gauntlet-step-tag">
            DEPARTMENT OF RETURN DISCOURAGEMENT &amp; POINTLESS CHECKS
          </span>
          <h2 style={{ margin: "0.3rem 0" }}>
            📋 Form 1099-WTF: Multi-Stage Return Tribunal
          </h2>
          <p style={{ margin: 0, fontSize: "0.88rem", color: "var(--text-muted)" }}>
            Every return is buried in <strong>5 pointless forensic checks</strong> (4 parallel{" "}
            <code>FORK_JOIN</code> checks + Cardboard Sniff Inspection) and a{" "}
            <strong>3-desk DO_WHILE rubber-stamp committee</strong> on Conductor — yet{" "}
            <strong style={{ color: "var(--neon-yellow)" }}>
              every single return reaches a binding final decision!
            </strong>
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem" }}>
          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
            Quick Test Scenarios:
          </span>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => applyPreset("miracle")}
          >
            😇 Fill Perfect Contrition (Miracle Refund)
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => applyPreset("partial")}
          >
            😐 Fill Mild Regret (Partial Minus Sighing Fee)
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => applyPreset("denied")}
          >
            😤 Fill Defiant Attitude (Tribunal Denial)
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="gauntlet-grid">
          {/* Box 1: Order & Item */}
          <div className="gauntlet-box">
            <span className="gauntlet-step-tag">CHECKPOINT I OF IV</span>
            <h3 style={{ marginTop: 0 }}>📦 Dossier Identification</h3>

            {recentOrders.length > 0 && (
              <div style={{ marginBottom: "0.75rem" }}>
                <label style={{ fontSize: "0.76rem", color: "var(--neon-cyan)" }}>
                  Select From Your Conductor Orders:
                </label>
                <select
                  className="select-control"
                  style={{ width: "100%", marginTop: "0.25rem" }}
                  onChange={(e) => {
                    const picked = recentOrders.find((o) => o.orderId === e.target.value);
                    if (picked) {
                      setOrderId(picked.orderId);
                      const first = picked.receipt?.items?.[0];
                      if (first) {
                        setItemName(first.name);
                        setItemPrice(Number(first.lineTotal || first.unitPrice || 99.99));
                      }
                    }
                  }}
                  value={
                    recentOrders.some((o) => o.orderId === orderId) ? orderId : ""
                  }
                >
                  <option value="" disabled>
                    -- Pick a recent order --
                  </option>
                  {recentOrders.map((o) => (
                    <option key={o.workflowId} value={o.orderId}>
                      {o.orderId} — ${Number(o.receipt?.grandTotal || 0).toFixed(2)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div style={{ marginBottom: "0.65rem" }}>
              <label style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                Order ID
              </label>
              <input
                className="input-control"
                style={{ width: "100%" }}
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                required
              />
            </div>

            <div style={{ marginBottom: "0.65rem" }}>
              <label style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                Cursed Item Being Returned
              </label>
              <select
                className="select-control"
                style={{ width: "100%" }}
                value={itemName}
                onChange={(e) => {
                  setItemName(e.target.value);
                  const found = products.find((p) => p.name === e.target.value);
                  if (found) setItemPrice(found.price);
                }}
              >
                {products.map((p) => (
                  <option key={p.id} value={p.name}>
                    {p.emoji} {p.name} (${p.price.toLocaleString()})
                  </option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: "0.65rem" }}>
              <label style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                Claimed Purchase Amount ($)
              </label>
              <input
                type="number"
                step="0.01"
                className="input-control"
                style={{ width: "100%" }}
                value={itemPrice}
                onChange={(e) => setItemPrice(Number(e.target.value))}
                required
              />
            </div>

            <div>
              <label style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                Confessed Reason for Return
              </label>
              <select
                className="select-control"
                style={{ width: "100%" }}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              >
                <option value="existential_regret">
                  Sudden wave of existential financial clarity
                </option>
                <option value="hummed_at_cat">
                  Product vibrated in D-minor and spooked my cat
                </option>
                <option value="spouse_saw_statement">
                  Spouse opened the credit card statement
                </option>
                <option value="looked_at_it_wrong">
                  I looked directly at the box sideways (Automatic Tribunal Trap)
                </option>
              </select>
            </div>
          </div>

          {/* Box 2: Lunar & Factory Air Forensics */}
          <div className="gauntlet-box">
            <span className="gauntlet-step-tag">CHECKPOINT II OF IV</span>
            <h3 style={{ marginTop: 0 }}>🌙 Lunar &amp; 2019 Air Audit</h3>

            <div style={{ marginBottom: "0.85rem" }}>
              <label style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                Moon Phase at Moment of Regret (Required by Capricorn Policy)
              </label>
              <select
                className="select-control"
                style={{ width: "100%", marginTop: "0.25rem" }}
                value={moonPhase}
                onChange={(e) => setMoonPhase(e.target.value)}
              >
                <option value="suspiciously_cheese">
                  🧀 Suspiciously Cheese-Shaped (Preferred by Desk 14-A)
                </option>
                <option value="waning_crescent">
                  🌘 Waning Crescent of Buyer's Remorse (Approved)
                </option>
                <option value="waxing_gibbous">
                  🌖 Waxing Gibbous (-15 Bureaucracy Points)
                </option>
                <option value="indoors_ceiling">
                  💡 I Am Indoors Looking at Drywall (-15 Points)
                </option>
              </select>
            </div>

            <div style={{ marginBottom: "0.85rem" }}>
              <label style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                Original 2019 Factory Warehouse Air Remaining in Box:{" "}
                <strong style={{ color: "var(--neon-yellow)" }}>
                  {originalAirPercent}%
                </strong>{" "}
                (Requires &ge; 65%)
              </label>
              <input
                type="range"
                min={0}
                max={100}
                style={{ width: "100%" }}
                value={originalAirPercent}
                onChange={(e) => setOriginalAirPercent(Number(e.target.value))}
              />
            </div>

            <div>
              <label style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                Exact Number of Packing Tape Strips Used (Regulation: 3 to 19 strips)
              </label>
              <input
                type="number"
                min={0}
                max={99}
                className="input-control"
                style={{ width: "100%", marginTop: "0.25rem" }}
                value={tapeStripCount}
                onChange={(e) => setTapeStripCount(Number(e.target.value))}
              />
            </div>
          </div>

          {/* Box 3: Biometric Sincerity & Oaths */}
          <div className="gauntlet-box">
            <span className="gauntlet-step-tag">CHECKPOINT III OF IV</span>
            <h3 style={{ marginTop: 0 }}>👁️ Stare Duration &amp; Oaths</h3>

            <div style={{ marginBottom: "0.8rem" }}>
              <label style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                Seconds of Unbroken Eye Contact Maintained With Item:{" "}
                <strong style={{ color: "var(--neon-yellow)" }}>
                  {eyeContactSeconds}s
                </strong>{" "}
                (Min 14s)
              </label>
              <input
                type="range"
                min={0}
                max={60}
                style={{ width: "100%" }}
                value={eyeContactSeconds}
                onChange={(e) => setEyeContactSeconds(Number(e.target.value))}
              />
            </div>

            <div style={{ marginBottom: "0.8rem" }}>
              <label style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                Genuine Tears Shed Onto Return Label (Min 2 tears)
              </label>
              <input
                type="number"
                min={0}
                max={500}
                className="input-control"
                style={{ width: "100%", marginTop: "0.25rem" }}
                value={tearsShed}
                onChange={(e) => setTearsShed(Number(e.target.value))}
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem", fontSize: "0.8rem" }}>
              <label style={{ display: "flex", gap: "0.45rem", alignItems: "flex-start" }}>
                <input
                  type="checkbox"
                  checked={sworeHubrisOath}
                  onChange={(e) => setSworeHubrisOath(e.target.checked)}
                />
                <span>
                  I solemnly swear the fault lies in my own hubris, never Chaos Commerce™.
                </span>
              </label>

              <label style={{ display: "flex", gap: "0.45rem", alignItems: "flex-start" }}>
                <input
                  type="checkbox"
                  checked={didNotFeedAfterMidnight}
                  onChange={(e) => setDidNotFeedAfterMidnight(e.target.checked)}
                />
                <span>
                  I confirm I did NOT feed this product lukewarm soup after midnight.
                </span>
              </label>

              <label style={{ display: "flex", gap: "0.45rem", alignItems: "flex-start" }}>
                <input
                  type="checkbox"
                  checked={acceptedBirdLaw}
                  onChange={(e) => setAcceptedBirdLaw(e.target.checked)}
                />
                <span>
                  I submit to the binding jurisdiction of 1994 Maritime Bird Law.
                </span>
              </label>
            </div>
          </div>

          {/* Box 4: Forklift Flattery & Pointless Captcha */}
          <div className="gauntlet-box">
            <span className="gauntlet-step-tag">CHECKPOINT IV OF IV</span>
            <h3 style={{ marginTop: 0 }}>🚜 Forklift #4 Apology Essay</h3>

            <div style={{ marginBottom: "0.75rem" }}>
              <label style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                Pointless Security Question: What is 7 + Thursday? (Any answer accepted, we don't check)
              </label>
              <input
                className="input-control"
                style={{ width: "100%", marginTop: "0.25rem" }}
                value={captchaMathAnswer}
                onChange={(e) => setCaptchaMathAnswer(e.target.value)}
              />
            </div>

            <div style={{ marginBottom: "0.65rem" }}>
              <label style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                Written Apology &amp; Flattery to Warehouse Forklift #4 (Tip: say "sorry" &amp; "forklift")
              </label>
              <textarea
                className="textarea-control"
                rows={4}
                style={{ width: "100%", marginTop: "0.25rem" }}
                value={apologyText}
                onChange={(e) => setApologyText(e.target.value)}
              />
            </div>

            <button
              type="button"
              className="btn-secondary"
              style={{ width: "100%", fontSize: "0.78rem" }}
              onClick={() =>
                setApologyText(
                  "Oh noble Warehouse Forklift #4, your hydraulic grace is unmatched; I am deeply sorry for my hubris and humbly beg forgiveness."
                )
              }
            >
              ✨ Generate Legally Sufficient Forklift Flattery
            </button>
          </div>
        </div>

        {errorMsg && (
          <div style={{ color: "#ff8a8a", marginTop: "0.8rem" }}>⚠️ {errorMsg}</div>
        )}

        <button
          type="submit"
          className="btn-primary"
          style={{
            width: "100%",
            marginTop: "1.2rem",
            padding: "0.95rem",
            fontSize: "1rem"
          }}
          disabled={submitting}
          data-testid="submit-return-button"
        >
          {submitting
            ? "⚙️ Running Conductor `chaos_return_workflow` (5 Checks + 3 Rubber-Stamp Desks)..."
            : "⚖️ Submit Dossier to Pointless Return Tribunal (Run Conductor Workflow)"}
        </button>
      </form>

      {/* Official Binding Verdict Certificate */}
      {latestResult && (
        <div className="verdict-certificate" data-testid="return-verdict-certificate">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "0.75rem",
              alignItems: "center",
              marginBottom: "0.85rem"
            }}
          >
            <div>
              <span className="gauntlet-step-tag">
                OFFICIAL CONDUCTOR RETURN DECISION REACHED
              </span>
              <h2
                style={{
                  margin: "0.25rem 0 0 0",
                  color: latestResult.decision?.approved
                    ? "var(--neon-green)"
                    : "#ff6e6e"
                }}
              >
                {latestResult.decision?.approved ? "✅ " : "🚫 "}
                {latestResult.decision?.decisionTitle}
              </h2>
            </div>

            <button
              type="button"
              className="btn-secondary"
              onClick={() => onInspectTrace(latestResult.trace)}
            >
              ⚙️ Inspect Conductor Execution ({latestResult.trace.durationMs}ms)
            </button>
          </div>

          <p style={{ fontSize: "0.95rem", margin: "0 0 1rem 0" }}>
            {latestResult.decision?.officialRuling}
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
              gap: "0.75rem",
              marginBottom: "1rem"
            }}
          >
            <div className="price-block" style={{ margin: 0 }}>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                Decision Code
              </div>
              <div style={{ fontWeight: 900, color: "var(--neon-cyan)" }}>
                {latestResult.decision?.decisionCode}
              </div>
            </div>
            <div className="price-block" style={{ margin: 0 }}>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                Bureaucratic Score
              </div>
              <div style={{ fontWeight: 900, color: "var(--neon-yellow)" }}>
                {latestResult.decision?.totalScore} / 100
              </div>
            </div>
            <div className="price-block" style={{ margin: 0 }}>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                Cash Refund Approved
              </div>
              <div style={{ fontWeight: 900, color: "var(--neon-green)" }}>
                ${Number(latestResult.decision?.refundAmount || 0).toFixed(2)}
              </div>
            </div>
            <div className="price-block" style={{ margin: 0 }}>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                Chaos Bucks™ Issued
              </div>
              <div style={{ fontWeight: 900, color: "#ff7eb6" }}>
                ${Number(latestResult.decision?.chaosBucksCredit || 0).toFixed(2)}
              </div>
            </div>
          </div>

          {/* 5 Pointless Checks Audit */}
          <h4 style={{ margin: "0 0 0.5rem 0" }}>
            🔍 Conductor Parallel Pointless Checks Audit:
          </h4>
          <div style={{ display: "grid", gap: "0.45rem", marginBottom: "1rem" }}>
            {(latestResult.decision?.checksAudit || []).map(
              (chk: any, idx: number) => (
                <div
                  key={idx}
                  style={{
                    background: "#100c1b",
                    border: "1px solid #2b2244",
                    borderRadius: 9,
                    padding: "0.55rem 0.8rem",
                    fontSize: "0.82rem",
                    display: "flex",
                    justifyContent: "space-between",
                    gap: "0.75rem",
                    flexWrap: "wrap"
                  }}
                >
                  <div>
                    <strong>
                      {chk.passed ? "✅ PASS" : "❌ FAIL"} — {chk.checkName}:
                    </strong>{" "}
                    <span style={{ color: "var(--text-muted)" }}>{chk.finding}</span>
                  </div>
                  <span style={{ fontFamily: "var(--font-mono)", color: "var(--neon-yellow)" }}>
                    +{chk.score} pts
                  </span>
                </div>
              )
            )}
          </div>

          {/* 3 Committee Rubber Stamps */}
          <h4 style={{ margin: "0 0 0.5rem 0" }}>
            🔏 Conductor DO_WHILE Sub-Committee Rubber Stamps (
            {latestResult.decision?.committeeIterations || 3} Desks):
          </h4>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
              gap: "0.6rem"
            }}
          >
            {(latestResult.decision?.committeeStamps || []).map((st: any) => (
              <div
                key={st.deskNumber}
                style={{
                  background: "#141024",
                  border: "1px dashed #4e3b7a",
                  borderRadius: 10,
                  padding: "0.65rem 0.8rem",
                  fontSize: "0.8rem"
                }}
              >
                <div style={{ fontWeight: 800, color: "var(--neon-cyan)" }}>
                  {st.deskName}
                </div>
                <div style={{ color: "var(--text-muted)", marginTop: "0.2rem" }}>
                  {st.stampNote}
                </div>
              </div>
            ))}
          </div>

          <p
            style={{
              fontSize: "0.76rem",
              color: "var(--text-muted)",
              marginTop: "0.9rem",
              marginBottom: 0
            }}
          >
            ⚖️ {latestResult.decision?.appealInstructions}
          </p>
        </div>
      )}
    </div>
  );
};
