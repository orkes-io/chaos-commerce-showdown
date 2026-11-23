import React, { useEffect, useRef, useState } from "react";
import { CheckCircle2, ClipboardList, ExternalLink, FileWarning, Gavel, RotateCcw, Sparkles } from "lucide-react";
import { api } from "../api.js";
import WorkflowTimeline from "./WorkflowTimeline.jsx";

const DEFAULT_REASONS = [
  "Item arrived exactly as horribly described",
  "Catapult missed my house by 3 blocks",
  "My neighbors are judging my financial choices",
  "Too much structural chaos for my studio apartment",
  "I meant to click 'Close Tab' and accidentally bought it",
  "The office ficus told me in a dream to send it back",
];

const DEFAULT_ZODIACS = [
  "Aries (Too Impatient for Refunds)",
  "Taurus (Stubbornly Keeping the Box)",
  "Gemini (Ordered Twice, Regretted Thrice)",
  "Virgo (Actually Read the Return Policy)",
  "Scorpio (Leaving Furious 5-Star Reviews)",
  "Ophiuchus (Illegal 13th Sign — Extra Audit)",
];

export default function ReturnsCenter({
  orders,
  returnsHistory,
  preselectedOrder,
  returnReasons,
  zodiacSigns,
  onReturnCompleted,
  onRefreshHistory,
}) {
  const reasons = returnReasons?.length ? returnReasons : DEFAULT_REASONS;
  const zodiacs = zodiacSigns?.length ? zodiacSigns : DEFAULT_ZODIACS;

  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [selectedOrderWorkflowId, setSelectedOrderWorkflowId] = useState("");
  const [orderTotal, setOrderTotal] = useState("499.99");
  const [customerName, setCustomerName] = useState("Alex Regret");
  const [itemTitle, setItemTitle] = useState("Single Left Tube Sock (Slightly Damp)");

  // Pointless Bureaucracy Form Fields
  const [reason, setReason] = useState(reasons[0]);
  const [zodiacSign, setZodiacSign] = useState(zodiacs[0]);
  const [apologyText, setApologyText] = useState("I sincerely apologize Warehouse B");
  const [moonlightConfirmed, setMoonlightConfirmed] = useState(true);
  const [boxAirPreserved, setBoxAirPreserved] = useState(true);
  const [spiderToast, setSpiderToast] = useState(true);
  const [spiderRock, setSpiderRock] = useState(true);
  const [spiderGreg, setSpiderGreg] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [activeReturnExec, setActiveReturnExec] = useState(null);
  const pollRef = useRef(null);

  const applyOrderToForm = (orderExec) => {
    if (!orderExec) return;
    const out = orderExec.output || {};
    const firstItem = Array.isArray(out.items) && out.items[0] ? out.items[0].title : "Chaos Commerce Item";
    setSelectedOrderId(out.orderId || orderExec.correlationId || "CHS-ORD-LIVE");
    setSelectedOrderWorkflowId(orderExec.workflowId || "");
    setOrderTotal(String(out.grandTotal || orderExec.input?.orderTotal || 499.99));
    setCustomerName(out.customerName || orderExec.input?.customerName || "Regretful Shopper");
    setItemTitle(firstItem);
    setActiveReturnExec(null);
  };

  useEffect(() => {
    if (preselectedOrder) {
      applyOrderToForm(preselectedOrder);
    } else if (!selectedOrderId && orders && orders.length > 0) {
      applyOrderToForm(orders[0]);
    }
  }, [preselectedOrder, orders]);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const startPolling = (workflowId) => {
    const fetchOnce = async () => {
      try {
        const exec = await api.getWorkflowExecution(workflowId);
        setActiveReturnExec(exec);
        if (["COMPLETED", "FAILED", "TIMED_OUT", "TERMINATED"].includes(exec.status)) {
          if (pollRef.current) clearInterval(pollRef.current);
          pollRef.current = null;
          setSubmitting(false);
          if (exec.status === "COMPLETED" && onReturnCompleted) {
            onReturnCompleted(exec);
          }
        }
      } catch (err) {
        setError(err.message);
      }
    };

    fetchOnce();
    pollRef.current = setInterval(fetchOnce, 350);
  };

  const handleSubmitReturn = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    // Anti-spider check passes when user checks both non-spiders AND avoids checking Greg the Spider!
    const spiderChecksPassed = spiderToast && spiderRock && !spiderGreg;

    try {
      const started = await api.startReturn({
        orderId: selectedOrderId || "CHS-ORD-UNTRACKED",
        orderWorkflowId: selectedOrderWorkflowId,
        orderTotal: Number(orderTotal) || 499.99,
        customerName,
        itemTitle,
        reason,
        zodiacSign,
        apologyText,
        moonlightConfirmed,
        boxAirPreserved,
        spiderChecksPassed,
      });

      setActiveReturnExec({
        workflowId: started.workflowId,
        workflowName: "chaos_return_workflow",
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

  const applyPreset = (mode) => {
    if (mode === "compliant") {
      setZodiacSign(zodiacs.find((z) => z.includes("Virgo")) || zodiacs[0]);
      setApologyText("We humbly beg Warehouse B for forgiveness");
      setMoonlightConfirmed(true);
      setBoxAirPreserved(true);
      setSpiderToast(true);
      setSpiderRock(true);
      setSpiderGreg(false);
    } else if (mode === "cursed") {
      setZodiacSign(zodiacs.find((z) => z.includes("Ophiuchus")) || zodiacs[zodiacs.length - 1]);
      setApologyText("sorry");
      setMoonlightConfirmed(true);
      setBoxAirPreserved(false);
      setSpiderToast(true);
      setSpiderRock(true);
      setSpiderGreg(false);
    } else {
      setZodiacSign(zodiacs[0]);
      setApologyText("nope");
      setMoonlightConfirmed(false);
      setBoxAirPreserved(false);
      setSpiderToast(false);
      setSpiderRock(false);
      setSpiderGreg(true);
    }
  };

  const decree = activeReturnExec?.output || {};
  const isDone = activeReturnExec?.status === "COMPLETED";

  return (
    <div className="returns-page">
      <section className="returns-hero">
        <div>
          <h2>
            <FileWarning size={26} /> Department of Un-Buying &amp; Pointless Return Checks
          </h2>
          <p>
            Every return passes through <strong>4 parallel pointless inspections</strong> (including Brenda the Warehouse Ficus),{" "}
            <strong>3 rounds of bureaucratic stamping</strong> in a Conductor <code>DO_WHILE</code> loop, and a{" "}
            <code>SWITCH</code> verdict engine — guaranteeing every return ALWAYS reaches a binding terminal decision!
          </p>
        </div>
        <button type="button" className="btn-secondary" onClick={onRefreshHistory}>
          <RotateCcw size={15} /> Refresh From Conductor
        </button>
      </section>

      <div className="returns-grid">
        {/* Left Column: Completed Orders + Bureaucracy Form */}
        <div className="returns-form-col">
          {/* Quick Order Picker */}
          <div className="panel-card">
            <h3>
              <ClipboardList size={18} /> Step 1: Pick a Regrettable Order
            </h3>
            {orders.length === 0 ? (
              <p className="muted-note">
                No completed orders yet — go buy something terrible first, or submit a return for a demo order ID below!
              </p>
            ) : (
              <div className="order-pick-list">
                {orders.slice(0, 6).map((ord) => {
                  const oid = ord.output?.orderId || ord.correlationId || ord.workflowId.slice(0, 8);
                  const active = selectedOrderId === oid;
                  return (
                    <button
                      key={ord.workflowId}
                      type="button"
                      className={`order-pick-card ${active ? "order-pick-active" : ""}`}
                      onClick={() => applyOrderToForm(ord)}
                    >
                      <div>
                        <strong>{oid}</strong>
                        <span className="order-pick-item">
                          {ord.output?.items?.[0]?.title || "Chaos Order"}
                        </span>
                      </div>
                      <div className="order-pick-right">
                        <strong>${Number(ord.output?.grandTotal || 0).toFixed(2)}</strong>
                        <span className="wf-mini-status">{ord.status}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Pointless Return Bureaucracy Form */}
          <form onSubmit={handleSubmitReturn} className="panel-card bureaucracy-form">
            <div className="form-head-row">
              <h3>
                <Gavel size={18} /> Step 2: Survive Form 1099-REGRET
              </h3>
              <div className="preset-row">
                <span>Quick test presets:</span>
                <button type="button" className="chip-btn" onClick={() => applyPreset("compliant")}>
                  Max Compliance
                </button>
                <button type="button" className="chip-btn" onClick={() => applyPreset("cursed")}>
                  Store Credit Path
                </button>
                <button type="button" className="chip-btn" onClick={() => applyPreset("defiant")}>
                  Defiant Denial Path
                </button>
              </div>
            </div>

            <div className="two-col-inputs">
              <label className="field-label">
                Order ID
                <input
                  type="text"
                  className="text-input"
                  value={selectedOrderId}
                  onChange={(e) => setSelectedOrderId(e.target.value)}
                  placeholder="CHS-ORD-123456"
                  required
                />
              </label>
              <label className="field-label">
                Order Total ($)
                <input
                  type="number"
                  step="0.01"
                  className="text-input"
                  value={orderTotal}
                  onChange={(e) => setOrderTotal(e.target.value)}
                  required
                />
              </label>
            </div>

            <div className="two-col-inputs">
              <label className="field-label">
                Item Being Returned
                <input
                  type="text"
                  className="text-input"
                  value={itemTitle}
                  onChange={(e) => setItemTitle(e.target.value)}
                  required
                />
              </label>
              <label className="field-label">
                Your Name
                <input
                  type="text"
                  className="text-input"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  required
                />
              </label>
            </div>

            <label className="field-label">
              Pointless Check #1 — Official Reason for Betraying Chaos Commerce
              <select className="text-input" value={reason} onChange={(e) => setReason(e.target.value)}>
                {reasons.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </label>

            <label className="field-label">
              Pointless Check #2 — Zodiac Sign (For Astrological Restocking Calibration)
              <select
                className="text-input"
                value={zodiacSign}
                onChange={(e) => setZodiacSign(e.target.value)}
              >
                {zodiacs.map((z) => (
                  <option key={z} value={z}>
                    {z}
                  </option>
                ))}
              </select>
            </label>

            <label className="field-label">
              Pointless Check #3 — Written Apology to Warehouse B (Minimum 3 Words Recommended)
              <input
                type="text"
                className="text-input"
                value={apologyText}
                onChange={(e) => setApologyText(e.target.value)}
                placeholder="Write a heartfelt apology to our warehouse..."
              />
            </label>

            <div className="pointless-checks-group">
              <div className="field-label">Pointless Check #4 — Sworn Atmospheric Affidavits</div>
              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={moonlightConfirmed}
                  onChange={(e) => setMoonlightConfirmed(e.target.checked)}
                />
                <span>
                  I solemnly swear this item was <strong>NOT</strong> exposed to moonlight, jazz, or werewolf proximity.
                </span>
              </label>
              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={boxAirPreserved}
                  onChange={(e) => setBoxAirPreserved(e.target.checked)}
                />
                <span>
                  I preserved <strong>100% of the original Reno warehouse air</strong> inside the shipping box.
                </span>
              </label>
            </div>

            <div className="spider-captcha">
              <div className="field-label">
                Pointless Check #5 — Anti-Spider Captcha (Check ONLY items that are NOT spiders!)
              </div>
              <div className="spider-grid">
                <label className="spider-tile">
                  <input
                    type="checkbox"
                    checked={spiderToast}
                    onChange={(e) => setSpiderToast(e.target.checked)}
                  />
                  <span>🍞 Buttered Toast (Not a spider)</span>
                </label>
                <label className="spider-tile">
                  <input
                    type="checkbox"
                    checked={spiderRock}
                    onChange={(e) => setSpiderRock(e.target.checked)}
                  />
                  <span>🪨 Polite Rock (Not a spider)</span>
                </label>
                <label className="spider-tile spider-trap">
                  <input
                    type="checkbox"
                    checked={spiderGreg}
                    onChange={(e) => setSpiderGreg(e.target.checked)}
                  />
                  <span>🕷️ Greg (Definitely a Spider — DO NOT CHECK)</span>
                </label>
              </div>
            </div>

            {error && <div className="alert-error">{error}</div>}

            <button
              type="submit"
              className="btn-primary btn-full btn-lg"
              disabled={submitting}
              data-testid="submit-return-btn"
            >
              {submitting
                ? "Submitting to Warehouse Ficus & Red Tape Loop..."
                : "Submit Return (Execute chaos_return_workflow)"}
            </button>
          </form>
        </div>

        {/* Right Column: Live Conductor Return Execution + Official Decree + History */}
        <div className="returns-status-col">
          {activeReturnExec ? (
            <div className="panel-card">
              <WorkflowTimeline
                execution={activeReturnExec}
                title="Conductor Return Gauntlet (chaos_return_workflow)"
              />

              {isDone && (
                <div
                  className={`decree-card decree-${String(decree.decision || "").toLowerCase()}`}
                  data-testid="return-decree"
                >
                  <div className="decree-top">
                    <Sparkles size={22} />
                    <div>
                      <span className="decree-badge">{decree.decisionLabel}</span>
                      <h3>{decree.decreeHeadline}</h3>
                    </div>
                    <CheckCircle2 size={24} />
                  </div>

                  <p className="decree-letter">{decree.decreeLetter}</p>

                  <div className="decree-numbers">
                    <div className="decree-stat">
                      <span>Return ID</span>
                      <strong>{decree.returnId}</strong>
                    </div>
                    <div className="decree-stat">
                      <span>Pointless Score</span>
                      <strong>{decree.totalPointlessScore}/400</strong>
                    </div>
                    <div className="decree-stat">
                      <span>Red-Tape Rounds</span>
                      <strong>{decree.redTapeRounds} Stamps</strong>
                    </div>
                    {Number(decree.refundAmount) > 0 && (
                      <div className="decree-stat">
                        <span>Cash Refund</span>
                        <strong>${Number(decree.refundAmount).toFixed(2)}</strong>
                      </div>
                    )}
                    {Number(decree.restockingFee) > 0 && (
                      <div className="decree-stat">
                        <span>Emotional Restocking Fee</span>
                        <strong>-${Number(decree.restockingFee).toFixed(2)}</strong>
                      </div>
                    )}
                    {Number(decree.storeCreditAmount) > 0 && (
                      <div className="decree-stat">
                        <span>Cursed Store Credit</span>
                        <strong>${Number(decree.storeCreditAmount).toFixed(2)}</strong>
                      </div>
                    )}
                    {decree.couponCode && (
                      <div className="decree-stat">
                        <span>Voucher / Coupon</span>
                        <strong><code>{decree.couponCode}</code></strong>
                      </div>
                    )}
                  </div>

                  {Array.isArray(decree.checks) && decree.checks.length > 0 && (
                    <div className="checks-breakdown">
                      <h4>Parallel Pointless Inspection Scorecards</h4>
                      {decree.checks.map((chk) => (
                        <div key={chk.checkName} className="check-result-row">
                          <div>
                            <strong>{chk.checkName}</strong> ({chk.department})
                            <p>{chk.absurdFinding}</p>
                          </div>
                          <span className={`score-pill ${chk.passed ? "score-pass" : "score-fail"}`}>
                            {chk.score}/100
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  <p className="decree-next">
                    <strong>Next Steps:</strong> {decree.nextSteps}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="panel-card waiting-decree">
              <h3>Awaiting Your Futile Return Submission</h3>
              <p>
                Fill out Form 1099-REGRET on the left and click <strong>Submit Return</strong> to watch Conductor execute:
              </p>
              <ol>
                <li><code>log_return_grievance</code> — Opens an official RMA-NOPE dossier</li>
                <li><code>FORK_JOIN</code> — Runs 4 pointless inspections simultaneously (Brenda the Ficus, Lunar/Zodiac Audit, Box Air &amp; Apology Scan, Anti-Spider Verification)</li>
                <li><code>DO_WHILE</code> — Transfers &amp; stamps your form in triplicate (3 bounded rounds)</li>
                <li><code>JSON_JQ_TRANSFORM</code> — Tallies your Pointless Compliance Score (0–400)</li>
                <li><code>SWITCH</code> + <code>seal_return_decree</code> — Guarantees a binding terminal decision!</li>
              </ol>
            </div>
          )}

          {/* Recent Return Decisions from Conductor */}
          <div className="panel-card">
            <h3>Recent Return Decisions (Live from Conductor)</h3>
            {returnsHistory.length === 0 ? (
              <p className="muted-note">No return decrees issued yet. Be the first to brave Brenda the Ficus!</p>
            ) : (
              <div className="history-list">
                {returnsHistory.slice(0, 6).map((ret) => (
                  <div key={ret.workflowId} className="history-row">
                    <div>
                      <strong>{ret.output?.returnId || ret.workflowId.slice(0, 10)}</strong> —{" "}
                      <span>{ret.output?.decisionLabel || ret.status}</span>
                      <div className="history-sub">
                        Order {ret.output?.orderId || ret.correlationId} • Score:{" "}
                        {ret.output?.totalPointlessScore ?? "—"}/400
                      </div>
                    </div>
                    <a
                      href={ret.conductorUiUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="wf-ui-link"
                    >
                      Conductor <ExternalLink size={12} />
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
