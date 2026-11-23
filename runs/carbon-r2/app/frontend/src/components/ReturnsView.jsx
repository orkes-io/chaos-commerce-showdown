import React, { useState, useEffect } from "react";
import { api } from "../api.js";
import WorkflowInspector from "./WorkflowInspector.jsx";

function formatMoney(n) {
  return Number(n || 0).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}

export default function ReturnsView({
  orders = [],
  returnsList = [],
  preselectedOrder,
  onReturnCompleted,
}) {
  const [selectedOrderId, setSelectedOrderId] = useState(
    preselectedOrder?.orderId || orders[0]?.orderId || "ORD-CHAOS-1999"
  );
  const [reasonCode, setReasonCode] = useState("TOO_HAUNTED");
  const [lunarPhase, setLunarPhase] = useState("WANING_REGRET");
  const [madeEyeContact, setMadeEyeContact] = useState("no");
  const [boxCornerCrispness, setBoxCornerCrispness] = useState(91);
  const [tearsShed, setTearsShed] = useState(7);
  const [serialNumberBackwards, setSerialNumberBackwards] =
    useState("99X-KCOS-404");
  const [apologyNote, setApologyNote] = useState(
    "I am deeply sorry and utterly unworthy of the warehouse forklift's forgiveness."
  );
  const [oath1, setOath1] = useState(true);
  const [oath2, setOath2] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [latestVerdict, setLatestVerdict] = useState(null);

  useEffect(() => {
    if (preselectedOrder?.orderId) {
      setSelectedOrderId(preselectedOrder.orderId);
    }
  }, [preselectedOrder]);

  const currentOrder =
    orders.find((o) => o.orderId === selectedOrderId) || orders[0] || null;
  const itemName =
    currentOrder?.receipt?.lineItems?.[0]?.name ||
    "Single Artisanal Left Sock (Pre-Lost)";
  const orderTotal = currentOrder?.grandTotal || 9499.99;

  const applyPreset = (mode) => {
    if (mode === "MIRACLE") {
      setLunarPhase("WANING_REGRET");
      setMadeEyeContact("no");
      setBoxCornerCrispness(91);
      setTearsShed(9);
      setSerialNumberBackwards("99X-GNITANIMAL");
      setApologyNote(
        "I am deeply sorry and utterly unworthy of the warehouse forklift's noble forgiveness."
      );
      setOath1(true);
      setOath2(true);
    } else if (mode === "SCRIP") {
      setLunarPhase("WAXING_GIBBOUS");
      setMadeEyeContact("no");
      setBoxCornerCrispness(72);
      setTearsShed(2);
      setSerialNumberBackwards("AB12");
      setApologyNote("Sorry I guess, the toaster yelled at my cat.");
      setOath1(true);
      setOath2(true);
    } else {
      setLunarPhase("MERCURY_GATORADE");
      setMadeEyeContact("yes");
      setBoxCornerCrispness(99);
      setTearsShed(0);
      setSerialNumberBackwards("");
      setApologyNote("This item is garbage, give me a full refund immediately!");
      setOath1(true);
      setOath2(true);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await api.submitReturn({
        orderId: selectedOrderId,
        itemName,
        orderTotal,
        reasonCode,
        lunarPhase,
        madeEyeContact,
        boxCornerCrispness: Number(boxCornerCrispness),
        tearsShed: Number(tearsShed),
        serialNumberBackwards,
        apologyNote,
      });
      setLatestVerdict(res);
      if (onReturnCompleted) {
        onReturnCompleted(res.returnRecord);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="page-section">
      <div className="section-banner returns-banner">
        <div>
          <h2>🏛️ Department of Pointless Returns & Redundancy Tribunal</h2>
          <p>
            Every return request runs <code>chaos_return_workflow</code> on
            Conductor: <strong>4 parallel pointless inspections</strong>{" "}
            (<code>FORK_JOIN</code>), a{" "}
            <strong>3-iteration bureaucratic rubber-stamp loop</strong>{" "}
            (<code>DO_WHILE</code>), score aggregation, and{" "}
            <code>SWITCH</code> routing so{" "}
            <strong>every single return reaches an official decision</strong>!
          </p>
        </div>
      </div>

      {latestVerdict && (
        <div
          className={`verdict-certificate tier-${latestVerdict.returnRecord.decision.toLowerCase()}`}
          data-testid="return-verdict-card"
        >
          <div className="verdict-top-badges">
            <span className="verdict-stamp">
              📜 OFFICIAL TRIBUNAL DECISION:{" "}
              {latestVerdict.returnRecord.decision}
            </span>
            <span className="rubber-stamp-badge">
              🔏 Rubber-Stamped{" "}
              {latestVerdict.returnRecord.dossier?.rubberStampsApplied || 3}× in
              Lukewarm Espresso Ink
            </span>
          </div>

          <h3>{latestVerdict.returnRecord.dossier?.headline}</h3>

          <div className="verdict-metrics-row">
            <div className="v-metric">
              <span>RMA Reference</span>
              <code>{latestVerdict.returnRecord.dossier?.rmaCode}</code>
            </div>
            <div className="v-metric">
              <span>Tribunal Score</span>
              <strong>
                {latestVerdict.returnRecord.dossier?.scoreSummary?.totalScore} /{" "}
                {
                  latestVerdict.returnRecord.dossier?.scoreSummary
                    ?.maxPossibleScore
                }
              </strong>
            </div>
            <div className="v-metric">
              <span>Original Paid</span>
              <span>
                {formatMoney(
                  latestVerdict.returnRecord.dossier?.originalAmount
                )}
              </span>
            </div>
            <div className="v-metric">
              <span>Emotional Restocking Fee</span>
              <span className="fee-red">
                −{formatMoney(latestVerdict.returnRecord.dossier?.restockingFee)}
              </span>
            </div>
            <div className="v-metric highlight">
              <span>Net Refund Issued</span>
              <strong>
                {formatMoney(latestVerdict.returnRecord.refundIssued)}
              </strong>
            </div>
          </div>

          <div className="pointless-checks-grid">
            {(latestVerdict.returnRecord.dossier?.pointlessChecks || []).map(
              (chk, idx) => (
                <div
                  key={idx}
                  className={`check-result-card ${
                    chk.passed ? "passed" : "failed"
                  }`}
                >
                  <div className="check-card-head">
                    <span>
                      {chk.passed ? "✅" : "❌"} {chk.checkName}
                    </span>
                    <strong>
                      {chk.score}/{chk.maxScore} pts
                    </strong>
                  </div>
                  <p>{chk.finding}</p>
                </div>
              )
            )}
          </div>

          <WorkflowInspector
            title="chaos_return_workflow — Parallel Checks + DO_WHILE Loop + Verdict Switch"
            workflowId={latestVerdict.conductor?.workflowId}
            workflowName={latestVerdict.conductor?.workflowName}
            status={latestVerdict.conductor?.status}
            conductorExecutionUrl={
              latestVerdict.conductor?.conductorExecutionUrl
            }
            taskTimeline={latestVerdict.conductor?.taskTimeline}
            defaultExpanded={true}
          />
        </div>
      )}

      <form className="returns-form-card" onSubmit={handleSubmit}>
        <div className="returns-form-header">
          <div>
            <h3>Form 27B/6 — Mandatory 7-Hurdle Return Petition</h3>
            <p>
              Fill out every pointless bureaucratic check below, or test any
              outcome tier using our quick presets:
            </p>
          </div>
          <div className="preset-btns">
            <button
              type="button"
              className="preset-chip praise"
              onClick={() => applyPreset("MIRACLE")}
            >
              ✨ Preset: Jump Through Every Hoop (Approve w/ 98.75% Fee)
            </button>
            <button
              type="button"
              className="preset-chip neutral"
              onClick={() => applyPreset("SCRIP")}
            >
              🪙 Preset: Mediocre Groveling (Chaos Scrip Verdict)
            </button>
            <button
              type="button"
              className="preset-chip fury"
              onClick={() => applyPreset("DENY")}
            >
              🔥 Preset: Normal Angry Customer (Guaranteed Denial)
            </button>
          </div>
        </div>

        <div className="returns-grid">
          <label>
            1. Select Regrettable Order to Dispute
            <select
              value={selectedOrderId}
              onChange={(e) => setSelectedOrderId(e.target.value)}
            >
              {orders.map((o) => (
                <option key={o.orderId} value={o.orderId}>
                  {o.orderId} —{" "}
                  {o.receipt?.lineItems?.[0]?.name || "Chaos Parcel"} (
                  {formatMoney(o.grandTotal)})
                </option>
              ))}
            </select>
          </label>

          <label>
            2. Primary Defect / Paranormal Complaint
            <select
              value={reasonCode}
              onChange={(e) => setReasonCode(e.target.value)}
            >
              <option value="TOO_HAUNTED">
                Item is significantly more haunted than advertised
              </option>
              <option value="CAUGHT_FIRE">
                Spontaneously combusted before unboxing
              </option>
              <option value="THREE_HEELS">
                Contains non-Euclidean geometry (3+ heels)
              </option>
              <option value="TREBUCHET_CRATER">
                Orbital delivery left crater in driveway
              </option>
              <option value="ACTUALLY_WORKED">
                Item worked properly (suspicious, likely counterfeit)
              </option>
            </select>
          </label>

          <label>
            3. Check #1 — Lunar Phase When Regret Began (Astrology Audit)
            <select
              value={lunarPhase}
              onChange={(e) => setLunarPhase(e.target.value)}
            >
              <option value="WANING_REGRET">
                🌘 Waning Regret (Favored by Warehouse Scorpio)
              </option>
              <option value="BLOOD_MOON">🩸 Blood Moon</option>
              <option value="WAXING_GIBBOUS">🌔 Waxing Gibbous</option>
              <option value="CLOUDY">☁️ Too Cloudy / Indoors Crying</option>
              <option value="MERCURY_GATORADE">
                🥤 Mercury is in Gatorade (Automatic Astrological Clash)
              </option>
            </select>
          </label>

          <label>
            4. Check #2a — Did You Make Direct Eye Contact With the Box?
            <select
              value={madeEyeContact}
              onChange={(e) => setMadeEyeContact(e.target.value)}
            >
              <option value="no">
                🙈 No — I respectfully averted my gaze at all times
              </option>
              <option value="yes">
                👁️ Yes — I stared directly at the shy cardboard (-8 pts)
              </option>
            </select>
          </label>

          <label>
            5. Check #2b — Cardboard Corner Crispness: {boxCornerCrispness}%
            <input
              type="range"
              min={0}
              max={100}
              value={boxCornerCrispness}
              onChange={(e) => setBoxCornerCrispness(e.target.value)}
            />
            <small className="field-hint">
              Sweet spot is 83%–96%. Below 83% = &ldquo;too soggy&rdquo;; above
              96% = &ldquo;illegal protractor suspected&rdquo;.
            </small>
          </label>

          <label>
            6. Check #3a — Certified Tears Shed Over Purchase (Salinity Audit)
            <input
              type="number"
              min={0}
              max={999}
              value={tearsShed}
              onChange={(e) => setTearsShed(e.target.value)}
            />
          </label>

          <label className="span-2">
            7. Check #4 — Type Imaginary Serial Number Backwards From Memory
            <input
              type="text"
              placeholder="Must include an X, 9, or 6+ characters for optimal numerology"
              value={serialNumberBackwards}
              onChange={(e) => setSerialNumberBackwards(e.target.value)}
            />
          </label>

          <label className="span-2">
            8. Check #3b — Mandatory Written Apology to Our Warehouse Forklift
            <textarea
              rows={3}
              placeholder="Hint: Include words like 'sorry', 'forgive', or 'unworthy'..."
              value={apologyNote}
              onChange={(e) => setApologyNote(e.target.value)}
            />
          </label>
        </div>

        <div className="pointless-oaths">
          <label className="oath-check">
            <input
              type="checkbox"
              checked={oath1}
              onChange={(e) => setOath1(e.target.checked)}
              required
            />
            <span>
              I solemnly swear that returning <strong>{itemName}</strong> hurts
              the warehouse raccoons&apos; feelings, and I accept emotional
              liability.
            </span>
          </label>
          <label className="oath-check">
            <input
              type="checkbox"
              checked={oath2}
              onChange={(e) => setOath2(e.target.checked)}
              required
            />
            <span>
              I understand that 3 separate sub-committees will stamp this form
              in lukewarm espresso before issuing an irreversible verdict.
            </span>
          </label>
        </div>

        {error && <div className="form-banner err">❌ {error}</div>}

        <button
          type="submit"
          className="cta-return-submit"
          disabled={submitting}
          data-testid="submit-return-btn"
        >
          {submitting
            ? "🔏 Running chaos_return_workflow on Conductor..."
            : "🏛️ Submit to Bureaucratic Return Tribunal (Conductor Workflow)"}
        </button>
      </form>

      {returnsList.length > 0 && (
        <div className="past-returns-panel">
          <h3>📂 Previous Return Tribunal Decisions ({returnsList.length})</h3>
          <div className="past-returns-list">
            {returnsList.map((r) => (
              <div key={r.returnId} className="past-return-item">
                <div>
                  <strong>{r.returnId}</strong> (Order <code>{r.orderId}</code>)
                  — <span>{r.dossier?.itemName}</span>
                </div>
                <div className="past-return-right">
                  <span className="decision-pill">{r.decision}</span>
                  <span>Refund: {formatMoney(r.refundIssued)}</span>
                  <code className="tiny-wf-id">{r.workflowId}</code>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
