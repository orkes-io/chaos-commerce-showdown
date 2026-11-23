import React, { useEffect, useState } from "react";
import { api } from "../api.js";
import { formatMoney } from "./ProductCard.jsx";
import WorkflowTraceCard from "./WorkflowTraceCard.jsx";

export default function ReturnsLabyrinth({
  orders,
  prefillOrder,
  pastReturns,
  onReturnCompleted
}) {
  const [orderId, setOrderId] = useState("ORD-CHAOS-0001");
  const [itemName, setItemName] = useState(
    "Artisanal Pre-Chewed Paperclip (Vintage Q3 2019)"
  );
  const [itemPrice, setItemPrice] = useState(49999.99);
  const [customerName, setCustomerName] = useState("Exhausted Return Applicant");
  const [reason, setReason] = useState(
    "Arrived humming in Latin and refused to clip paper."
  );

  // Pointless Bureaucratic Checks
  const [moonExposure, setMoonExposure] = useState("howled_first");
  const [astrologyExcuse, setAstrologyExcuse] = useState("mercury_retrograde");
  const [boxEmotionalState, setBoxEmotionalState] = useState("quietly_weeping");
  const [apologizedToBubbleWrap, setApologizedToBubbleWrap] = useState(true);
  const [blinkCount, setBlinkCount] = useState(7);
  const [backwardDeclaration, setBackwardDeclaration] = useState("DNUFER");
  const [swornTuesdayOath, setSwornTuesdayOath] = useState(true);
  const [acknowledgedRubberStamps, setAcknowledgedRubberStamps] = useState(true);
  const [forgaveCarrierPigeon, setForgaveCarrierPigeon] = useState(true);

  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (prefillOrder) {
      setOrderId(prefillOrder.orderId);
      const firstItem = prefillOrder.items?.[0];
      if (firstItem) {
        setItemName(firstItem.name);
        setItemPrice(Math.abs(Number(firstItem.price) || Number(prefillOrder.grandTotal) || 49.99));
      } else if (prefillOrder.grandTotal) {
        setItemPrice(Math.abs(Number(prefillOrder.grandTotal)));
      }
      if (prefillOrder.customerName) {
        setCustomerName(prefillOrder.customerName);
      }
    }
  }, [prefillOrder]);

  function applyPreset(mode) {
    if (mode === "miracle_refund") {
      setOrderId("ORD-MIRACLE-888");
      setReason("Item achieved sentience and politely asked to go home.");
      setMoonExposure("howled_first");
      setAstrologyExcuse("mercury_retrograde");
      setBoxEmotionalState("emotionally_stable");
      setApologizedToBubbleWrap(true);
      setBlinkCount(7);
      setBackwardDeclaration("DNUFER");
      setSwornTuesdayOath(true);
      setAcknowledgedRubberStamps(true);
      setForgaveCarrierPigeon(true);
    } else if (mode === "store_credit") {
      setOrderId("ORD-DIZZY-404");
      setReason("Slightly damper than advertised in brochure.");
      setMoonExposure("no_curtains_drawn");
      setAstrologyExcuse("jupiter_squared_wallet");
      setBoxEmotionalState("quietly_weeping");
      setApologizedToBubbleWrap(true);
      setBlinkCount(4);
      setBackwardDeclaration("DNUF-ISH");
      setSwornTuesdayOath(true);
      setAcknowledgedRubberStamps(true);
      setForgaveCarrierPigeon(true);
    } else {
      setOrderId("ORD-QUACK-999");
      setReason("Quadratic quantum quibble with packaging quality.");
      setMoonExposure("yes_briefly");
      setAstrologyExcuse("none_just_mad");
      setBoxEmotionalState("vengeful");
      setApologizedToBubbleWrap(false);
      setBlinkCount(12);
      setBackwardDeclaration("REFUND??");
      setSwornTuesdayOath(false);
      setAcknowledgedRubberStamps(true);
      setForgaveCarrierPigeon(true);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const res = await api.submitReturn({
        orderId,
        itemName,
        itemPrice: Number(itemPrice),
        customerName,
        reason,
        moonExposure,
        astrologyExcuse,
        boxEmotionalState,
        apologizedToBubbleWrap,
        blinkCount: Number(blinkCount),
        backwardDeclaration,
        swornNotSimultaneouslyTuesdayAndThursday: swornTuesdayOath
      });
      setResult(res);
      if (onReturnCompleted) {
        onReturnCompleted(res.returnDecision);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div data-testid="returns-labyrinth-section">
      <div className="form-card" style={{ background: "var(--surface-alt)" }}>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "0.75rem"
          }}
        >
          <div>
            <span className="hero-kicker">FORM 88-Z / SUB-BASEMENT TRIBUNAL</span>
            <h2 style={{ margin: "0.2rem 0 0.35rem", fontSize: "1.6rem" }}>
              🏛️ The Pointless Returns Labyrinth
            </h2>
            <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--muted)" }}>
              Every return is orchestrated by Conductor workflow{" "}
              <code>chaos_return_workflow</code>: 4 parallel pointless inspections{" "}
              (<code>FORK_JOIN</code>), a multi-ministry <code>DO_WHILE</code>{" "}
              rubber-stamp loop, JQ dossier scoring, <code>SWITCH</code> tribunal
              routing, and a guaranteed final decision!
            </p>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.45rem" }}>
            <button
              type="button"
              className="btn btn-sm btn-hazard"
              onClick={() => applyPreset("miracle_refund")}
            >
              ✨ Preset: Align All Seals (Full Refund)
            </button>
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => applyPreset("store_credit")}
            >
              🪙 Preset: Confuse Clerks (115% Store Credit)
            </button>
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => applyPreset("technicality")}
            >
              📜 Preset: Flunk Lunar Check (Technicality Denial)
            </button>
          </div>
        </div>
      </div>

      {result && (
        <div
          className="form-card"
          style={{
            background:
              result.returnDecision?.decision === "REJECTED_BUREAUCRATIC_TECHNICALITY"
                ? "#fff1f2"
                : "#ecfdf5",
            borderWidth: "3.5px"
          }}
          data-testid="return-decision-banner"
        >
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "space-between",
              gap: "0.5rem",
              marginBottom: "0.5rem"
            }}
          >
            <span
              style={{
                background: "var(--ink)",
                color: "var(--hazard)",
                fontFamily: "var(--mono)",
                fontWeight: 900,
                fontSize: "0.76rem",
                padding: "0.22rem 0.55rem"
              }}
            >
              ⚖️ STATUS: {result.returnDecision?.decisionStatus} • DECISION:{" "}
              {result.returnDecision?.decision}
            </span>
            <span style={{ fontFamily: "var(--mono)", fontWeight: 800 }}>
              RMA: {result.returnDecision?.rmaNumber}
            </span>
          </div>

          <h3 style={{ margin: "0.3rem 0", fontSize: "1.35rem" }}>
            {result.returnDecision?.verdictTitle}
          </h3>
          <p style={{ margin: "0 0 0.85rem", fontSize: "0.94rem" }}>
            {result.returnDecision?.verdictSummary}
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: "0.75rem",
              marginBottom: "0.9rem"
            }}
          >
            <div className="receipt-box">
              <strong>🔍 4 Parallel Pointless Checks (FORK_JOIN):</strong>
              {(result.returnDecision?.pointlessChecksReport || []).map((chk, i) => (
                <div
                  key={i}
                  style={{
                    marginTop: "0.45rem",
                    paddingTop: "0.45rem",
                    borderTop: "1px dotted #bbb"
                  }}
                >
                  <div>
                    <strong>{chk.checkName}</strong> ({chk.points} pts)
                  </div>
                  <div style={{ color: "var(--muted)", fontSize: "0.76rem" }}>
                    {chk.bureaucraticNote}
                  </div>
                </div>
              ))}
            </div>

            <div className="receipt-box">
              <strong>
                💮 Multi-Ministry DO_WHILE Rubber Stamps (
                {result.returnDecision?.rubberStampsApplied} iterations):
              </strong>
              {(result.returnDecision?.stampsTrail || []).map((st, i) => (
                <div
                  key={i}
                  style={{
                    marginTop: "0.45rem",
                    paddingTop: "0.45rem",
                    borderTop: "1px dotted #bbb"
                  }}
                >
                  <div>
                    <strong>
                      Stamp #{st.stampNumber}: {st.department}
                    </strong>{" "}
                    <span style={{ color: "var(--accent)" }}>[{st.inkColor}]</span>
                  </div>
                  <div style={{ color: "var(--muted)", fontSize: "0.76rem" }}>
                    “{st.clerkRemark}”
                  </div>
                </div>
              ))}
            </div>
          </div>

          <WorkflowTraceCard
            execution={result.workflowExecution}
            title="Returns Tribunal Conductor Workflow Trace"
          />
        </div>
      )}

      <form onSubmit={handleSubmit} className="form-card">
        <h3 style={{ marginTop: 0 }}>
          Step 1 of 4: Identify the Regrettable Purchase
        </h3>

        {orders && orders.length > 0 && (
          <div className="field-group">
            <label>Quick-Select From Recent Orders</label>
            <select
              className="input-control"
              value={orderId}
              onChange={(e) => {
                const picked = orders.find((o) => o.orderId === e.target.value);
                setOrderId(e.target.value);
                if (picked) {
                  const first = picked.items?.[0];
                  if (first) {
                    setItemName(first.name);
                    setItemPrice(Math.abs(Number(first.price) || Number(picked.grandTotal) || 49.99));
                  }
                  if (picked.customerName) setCustomerName(picked.customerName);
                }
              }}
            >
              {orders.map((o) => (
                <option key={o.orderId} value={o.orderId}>
                  {o.orderId} — {o.items?.[0]?.name || "Chaos Parcel"} (
                  {formatMoney(o.grandTotal)})
                </option>
              ))}
            </select>
          </div>
        )}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
            gap: "0.75rem"
          }}
        >
          <div className="field-group">
            <label>Order ID (Note: Letter 'Q' Triggers Temporal Audit!)</label>
            <input
              className="input-control"
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
              required
            />
          </div>
          <div className="field-group">
            <label>Item Being Returned</label>
            <input
              className="input-control"
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              required
            />
          </div>
          <div className="field-group">
            <label>Claimed Value ($ USD)</label>
            <input
              className="input-control"
              type="number"
              step="0.01"
              value={itemPrice}
              onChange={(e) => setItemPrice(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="field-group">
          <label>Detailed Grievance / Why Are You Like This?</label>
          <input
            className="input-control"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            required
          />
        </div>

        <hr style={{ border: "none", borderTop: "2px dashed var(--border)", margin: "1.2rem 0" }} />

        <h3>Step 2 of 4: Mandatory Lunar & Astrological Compliance</h3>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
            gap: "0.75rem"
          }}
        >
          <div className="field-group">
            <label>Did the item witness a Full Moon while in your home?</label>
            <select
              className="input-control"
              value={moonExposure}
              onChange={(e) => setMoonExposure(e.target.value)}
            >
              <option value="howled_first">
                Yes, and the item howled at the moon first (+32 pts)
              </option>
              <option value="no_curtains_drawn">
                No, blackout curtains remained sealed (+24 pts)
              </option>
              <option value="yes_briefly">
                Yes, briefly without lunar SPF-5000 foil (+16 pts)
              </option>
            </select>
          </div>

          <div className="field-group">
            <label>Applicant's Primary Celestial Excuse</label>
            <select
              className="input-control"
              value={astrologyExcuse}
              onChange={(e) => setAstrologyExcuse(e.target.value)}
            >
              <option value="mercury_retrograde">
                Mercury was in Retrograde during checkout (+4 pts)
              </option>
              <option value="jupiter_squared_wallet">
                Jupiter squared my checking account
              </option>
              <option value="none_just_mad">
                I reject astrology, I just want my money back
              </option>
            </select>
          </div>
        </div>

        <hr style={{ border: "none", borderTop: "2px dashed var(--border)", margin: "1.2rem 0" }} />

        <h3>Step 3 of 4: Packaging Psychological Trauma Screening</h3>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
            gap: "0.75rem",
            alignItems: "center"
          }}
        >
          <div className="field-group">
            <label>Current Emotional State of the Original Cardboard Box</label>
            <select
              className="input-control"
              value={boxEmotionalState}
              onChange={(e) => setBoxEmotionalState(e.target.value)}
            >
              <option value="emotionally_stable">
                Emotionally Stable / Stoic (+30 pts)
              </option>
              <option value="quietly_weeping">
                Quietly Weeping in the Hallway (+24 pts)
              </option>
              <option value="deeply_betrayed">
                Deeply Betrayed by Box-Cutter (+18 pts)
              </option>
              <option value="vengeful">
                Actively Vengeful (+10 pts)
              </option>
            </select>
          </div>

          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.55rem",
              fontWeight: 800,
              fontSize: "0.88rem",
              cursor: "pointer"
            }}
          >
            <input
              type="checkbox"
              checked={apologizedToBubbleWrap}
              onChange={(e) => setApologizedToBubbleWrap(e.target.checked)}
            />
            I looked each bubble-wrap blister in the eye and whispered “I'm sorry” (+6 pts)
          </label>
        </div>

        <hr style={{ border: "none", borderTop: "2px dashed var(--border)", margin: "1.2rem 0" }} />

        <h3>Step 4 of 4: Eyelid Blink Parity, Backward Incantation & Oaths</h3>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
            gap: "0.75rem"
          }}
        >
          <div className="field-group">
            <label>Exact Number of Blinks During Unboxing (Odd Numbers Preferred!)</label>
            <input
              className="input-control"
              type="number"
              value={blinkCount}
              onChange={(e) => setBlinkCount(e.target.value)}
              required
            />
          </div>

          <div className="field-group">
            <label>Spell "REFUND" Backwards ("DNUFER") To Prove Sincerity</label>
            <input
              className="input-control"
              value={backwardDeclaration}
              onChange={(e) => setBackwardDeclaration(e.target.value)}
              placeholder="DNUFER"
            />
          </div>
        </div>

        <div
          style={{
            background: "#faf6eb",
            border: "2px solid var(--border)",
            padding: "0.85rem",
            marginBottom: "1rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.5rem",
            fontSize: "0.86rem"
          }}
        >
          <label style={{ display: "flex", gap: "0.5rem", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={swornTuesdayOath}
              onChange={(e) => setSwornTuesdayOath(e.target.checked)}
            />
            <span>
              <strong>Temporal Non-Paradox Oath:</strong> I swear that today is not
              simultaneously Tuesday and Thursday in the same time zone.
            </span>
          </label>

          <label style={{ display: "flex", gap: "0.5rem", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={acknowledgedRubberStamps}
              onChange={(e) => setAcknowledgedRubberStamps(e.target.checked)}
              required
            />
            <span>
              <strong>Sub-Ministry Consent (Required):</strong> I consent to having up
              to 4 fictional departments rubber-stamp my form inside a Conductor{" "}
              <code>DO_WHILE</code> loop.
            </span>
          </label>

          <label style={{ display: "flex", gap: "0.5rem", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={forgaveCarrierPigeon}
              onChange={(e) => setForgaveCarrierPigeon(e.target.checked)}
              required
            />
            <span>
              <strong>Avian Indemnity Waiver (Required):</strong> I hold Barnaby the
              Blindfolded Carrier Pigeon harmless for emotional distress.
            </span>
          </label>
        </div>

        {error && (
          <div
            style={{
              background: "var(--danger-soft)",
              border: "2px solid var(--danger)",
              padding: "0.65rem",
              marginBottom: "0.8rem",
              fontWeight: 700
            }}
          >
            {error}
          </div>
        )}

        <button
          type="submit"
          className="btn btn-accent"
          style={{ padding: "0.8rem 1.3rem", fontSize: "1rem" }}
          disabled={submitting}
          data-testid="submit-return-btn"
        >
          {submitting
            ? "⚙️ Convening Conductor Returns Tribunal..."
            : "⚖️ Submit Dossier to Grand Returns Tribunal (Guaranteed Decision)"}
        </button>
      </form>

      {pastReturns && pastReturns.length > 0 && (
        <div className="form-card">
          <h3 style={{ marginTop: 0 }}>🗂️ Previous Tribunal Decisions</h3>
          {pastReturns.map((ret) => (
            <div
              key={ret.returnId}
              style={{
                border: "2px solid var(--border)",
                padding: "0.7rem 0.9rem",
                marginBottom: "0.5rem",
                display: "flex",
                flexWrap: "wrap",
                justifyContent: "space-between",
                gap: "0.5rem",
                background: "#fffdf9"
              }}
            >
              <div>
                <strong>{ret.rmaNumber}</strong> • Order <code>{ret.orderId}</code> (
                {ret.itemName})
                <div style={{ fontSize: "0.82rem", color: "var(--muted)" }}>
                  {ret.verdictSummary}
                </div>
              </div>
              <span
                style={{
                  fontFamily: "var(--mono)",
                  fontWeight: 900,
                  fontSize: "0.78rem",
                  alignSelf: "center",
                  background: "var(--hazard)",
                  border: "1.5px solid var(--border)",
                  padding: "0.2rem 0.5rem"
                }}
              >
                {ret.decision}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
