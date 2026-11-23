import React, { useEffect, useState } from 'react';
import { submitReturn } from '../api';
import { WorkflowTrace } from './WorkflowTrace';

function formatMoney(n) {
  return `$${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function ReturnsPanel({ orders = [], prefillOrder, onReturnComplete }) {
  const [orderId, setOrderId] = useState(prefillOrder?.orderId || orders[0]?.orderId || 'CHAOS-ORD-DEMO1');
  const [customerName, setCustomerName] = useState(prefillOrder?.receipt?.customerName || 'Alex Regret');
  const [itemName, setItemName] = useState(
    prefillOrder?.receipt?.items?.[0]?.name || 'Artisanal Single Organic Ice Cube',
  );
  const [orderTotal, setOrderTotal] = useState(prefillOrder?.receipt?.grandTotal || 700.92);

  // Absurd pointless check inputs
  const [lunarPhase, setLunarPhase] = useState('Waxing Gibbous');
  const [keptOriginalAir, setKeptOriginalAir] = useState(true);
  const [staredAtProduct, setStaredAtProduct] = useState(false);
  const [reasonCode, setReasonCode] = useState('MELTED');
  const [reasonText, setReasonText] = useState('It arrived as a damp manila envelope and ruined my Tuesday.');
  const [apologyToCeo, setApologyToCeo] = useState('I am deeply sorry to disrupt your yacht fund, please forgive me.');

  // Cheeky dark-pattern checkbox that re-checks itself ONCE, then allows unchecking!
  const [forfeitChecked, setForfeitChecked] = useState(true);
  const [forfeitEscapeAttempts, setForfeitEscapeAttempts] = useState(0);
  const [forfeitMessage, setForfeitMessage] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [returnResult, setReturnResult] = useState(null);

  useEffect(() => {
    if (prefillOrder) {
      setOrderId(prefillOrder.orderId);
      setCustomerName(prefillOrder.receipt?.customerName || 'Alex Regret');
      setItemName(prefillOrder.receipt?.items?.[0]?.name || 'Chaos Commerce Merchandise');
      setOrderTotal(prefillOrder.receipt?.grandTotal || 499.99);
      setReturnResult(null);
    }
  }, [prefillOrder]);

  function handleSelectExistingOrder(selectedId) {
    setOrderId(selectedId);
    const match = orders.find((o) => o.orderId === selectedId);
    if (match) {
      setCustomerName(match.receipt?.customerName || 'Alex Regret');
      setItemName(match.receipt?.items?.[0]?.name || 'Chaos Commerce Merchandise');
      setOrderTotal(match.receipt?.grandTotal || 499.99);
    }
  }

  function handleForfeitToggle() {
    if (forfeitChecked && forfeitEscapeAttempts === 0) {
      // Re-checks itself once as a parody dark pattern!
      setForfeitEscapeAttempts(1);
      setForfeitMessage(
        'Whoa! That checkbox jumped right back on! Click it one more time if you truly insist on requesting a refund.',
      );
      return;
    }
    setForfeitChecked((prev) => !prev);
    setForfeitMessage(
      forfeitChecked ? 'Fine. You escaped the Voluntary Forfeit Trap. Proceed to the gauntlet.' : '',
    );
  }

  async function handleSubmitReturn(e) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const res = await submitReturn({
        orderId,
        customerName,
        itemName,
        orderTotal: Number(orderTotal) || 499.99,
        reasonCode,
        reasonText,
        lunarPhase,
        staredAtProduct,
        keptOriginalAir,
        apologyToCeo,
      });
      setReturnResult(res.returnRequest);
      onReturnComplete(res.returnRequest);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="two-col">
      <div className="panel">
        <span className="review-tag fury">DEPARTMENT OF REDUNDANT FORMS</span>
        <h2 style={{ margin: '0.45rem 0 0.3rem' }}>Returns Bureaucracy Gauntlet</h2>
        <p style={{ marginTop: 0, fontSize: '0.88rem', color: '#52525b' }}>
          Every return must survive <strong>4 parallel pointless Conductor audits</strong> and a{' '}
          <strong>3-committee DO_WHILE rubber-stamp loop</strong>. Behind the jokes, Conductor{' '}
          <code>chaos_return_workflow</code> always reaches a definitive decision (Full Refund, Store Credit, or
          Polite Denial).
        </p>

        {orders.length > 0 && (
          <div className="field" style={{ marginBottom: '0.9rem' }}>
            <label>Quick-Fill From Your Recent Conductor Orders</label>
            <select value={orderId} onChange={(e) => handleSelectExistingOrder(e.target.value)}>
              {orders.map((ord) => (
                <option key={ord.workflowId} value={ord.orderId}>
                  {ord.orderId} — {ord.receipt?.items?.[0]?.name || 'Order'} ({formatMoney(ord.receipt?.grandTotal)})
                </option>
              ))}
            </select>
          </div>
        )}

        <form className="form-grid" onSubmit={handleSubmitReturn}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div className="field">
              <label>Order ID</label>
              <input type="text" value={orderId} onChange={(e) => setOrderId(e.target.value)} required />
            </div>
            <div className="field">
              <label>Order Total ($)</label>
              <input
                type="number"
                step="0.01"
                value={orderTotal}
                onChange={(e) => setOrderTotal(e.target.value)}
                required
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div className="field">
              <label>Customer Name</label>
              <input type="text" value={customerName} onChange={(e) => setCustomerName(e.target.value)} required />
            </div>
            <div className="field">
              <label>Item Being Returned</label>
              <input type="text" value={itemName} onChange={(e) => setItemName(e.target.value)} required />
            </div>
          </div>

          <div className="field">
            <label>Pointless Check #1: Current Lunar Phase (Verified by Our CFO Astrologer)</label>
            <select value={lunarPhase} onChange={(e) => setLunarPhase(e.target.value)}>
              <option value="Full Moon">Full Moon (Auspicious for Refunds)</option>
              <option value="Waxing Gibbous">Waxing Gibbous (Moderately Lucky)</option>
              <option value="New Moon">New Moon (CFO Suspicious)</option>
              <option value="Mercury in Retrograde">Mercury in Retrograde (Hostile Vibes)</option>
              <option value="I Refused to Look Up">I Refused to Look Up</option>
            </select>
          </div>

          <div className="field">
            <label>Pointless Check #2: Original Box Air & Eye-Contact Integrity</label>
            <div style={{ display: 'grid', gap: '0.5rem' }}>
              <label className="checkbox-card">
                <input
                  type="checkbox"
                  checked={keptOriginalAir}
                  onChange={(e) => setKeptOriginalAir(e.target.checked)}
                />
                <span>I preserved 100% of the Original Factory Ambient Air inside the shipping box.</span>
              </label>
              <label className="checkbox-card">
                <input
                  type="checkbox"
                  checked={staredAtProduct}
                  onChange={(e) => setStaredAtProduct(e.target.checked)}
                />
                <span>I confess that I made direct, unauthorized eye contact with the product.</span>
              </label>
            </div>
          </div>

          <div className="field">
            <label>Pointless Check #3: Return Reason & Mandatory CEO Apology</label>
            <select
              value={reasonCode}
              onChange={(e) => setReasonCode(e.target.value)}
              style={{ marginBottom: '0.5rem' }}
            >
              <option value="MELTED">Item Melted / Vaporized in Transit</option>
              <option value="NO_LONGER_EXISTS">Item Never Physically Existed</option>
              <option value="CURSED">Item Appears Mildly Haunted / Cursed</option>
              <option value="WRONG_VIBE">Vibes Were Aggressively Off</option>
              <option value="TOO_EXPENSIVE">I Realized $499 Is Too Much for an Ice Cube</option>
              <option value="OTHER">Other Existential Regret</option>
            </select>
            <textarea
              rows={2}
              value={reasonText}
              onChange={(e) => setReasonText(e.target.value)}
              placeholder="Explain why you're breaking our hearts..."
              style={{ marginBottom: '0.5rem' }}
            />
            <input
              type="text"
              value={apologyToCeo}
              onChange={(e) => setApologyToCeo(e.target.value)}
              placeholder="Write a heartfelt apology to our CEO (mentioning 'sorry' or 'yacht' helps!)"
            />
          </div>

          <div className="field">
            <label>Pointless Check #4: Totally Optional Dark-Pattern Trap</label>
            <label className="checkbox-card trap">
              <input type="checkbox" checked={forfeitChecked} onChange={handleForfeitToggle} />
              <span>
                I voluntarily forfeit my refund to support executive jet ski maintenance (uncheck twice to escape!).
              </span>
            </label>
            {forfeitMessage && (
              <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#be123c', marginTop: '0.3rem' }}>
                {forfeitMessage}
              </div>
            )}
          </div>

          {error && <div style={{ color: '#be123c', fontWeight: 800 }}>Error: {error}</div>}

          <button
            type="submit"
            className="btn btn-dark"
            style={{ width: '100%', padding: '0.85rem', fontSize: '1rem' }}
            disabled={submitting}
            data-testid="submit-return-btn"
          >
            {submitting
              ? 'Routing Through 3 Rubber-Stamp Committees on Conductor...'
              : 'Submit Return to Conductor Bureaucracy →'}
          </button>
        </form>
      </div>

      {/* Right column: Live Return Decision & Conductor Trace */}
      <div>
        {returnResult ? (
          <div className="panel" data-testid="return-decision-panel">
            <div className={`decision-stamp ${returnResult.decision?.decision || 'DENIED'}`}>
              <div style={{ fontSize: '0.78rem', fontWeight: 900, fontFamily: 'var(--font-mono)' }}>
                DOSSIER {returnResult.decision?.dossierCode} • SCORE {returnResult.decision?.bureaucracyScore}/100
              </div>
              <h2 style={{ margin: '0.25rem 0 0.35rem' }}>{returnResult.decision?.outcome?.headline}</h2>
              <p style={{ margin: '0 0 0.65rem', fontWeight: 600 }}>{returnResult.decision?.outcome?.summary}</p>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.88rem' }}>
                <div>
                  <strong>Decision:</strong> {returnResult.decision?.decisionCode}
                </div>
                <div>
                  <strong>Refund Amount:</strong> {formatMoney(returnResult.decision?.outcome?.refundAmount)}
                </div>
                <div>
                  <strong>Method:</strong> {returnResult.decision?.outcome?.refundMethod}
                </div>
              </div>
            </div>

            <h3 style={{ marginBottom: '0.35rem' }}>4 Parallel Pointless Audits (FORK_JOIN)</h3>
            <div className="audit-cards-grid">
              {(returnResult.decision?.checks || []).map((chk) => (
                <div key={chk.checkName} className={`audit-card ${chk.passed ? 'pass' : 'fail'}`}>
                  <div style={{ fontWeight: 900, marginBottom: '0.25rem' }}>
                    {chk.passed ? '✅' : '❌'} {chk.checkName}
                  </div>
                  <div>{chk.verdict}</div>
                </div>
              ))}
            </div>

            <h3 style={{ marginBottom: '0.35rem' }}>
              3-Committee Rubber-Stamp Loop (DO_WHILE × {returnResult.decision?.stampsCompleted})
            </h3>
            <div style={{ display: 'grid', gap: '0.45rem', marginBottom: '0.75rem' }}>
              {(returnResult.decision?.committeeRounds || []).map((r) => (
                <div
                  key={r.round}
                  style={{
                    background: '#fffdf5',
                    border: '2px solid #141414',
                    borderRadius: '8px',
                    padding: '0.55rem 0.75rem',
                    fontSize: '0.83rem',
                  }}
                >
                  <strong>
                    Round {r.round} — {r.committee}:
                  </strong>{' '}
                  {r.note}
                </div>
              ))}
            </div>

            <WorkflowTrace
              workflowId={returnResult.workflowId}
              workflowName={returnResult.workflowName}
              status={returnResult.status}
              executionTimeMs={returnResult.executionTimeMs}
              tasks={returnResult.tasks}
              conductorUiUrl={returnResult.conductorUiUrl}
            />
          </div>
        ) : (
          <div className="panel">
            <h3>How Our Ridiculous Returns Workflow Works</h3>
            <p style={{ fontSize: '0.88rem', color: '#52525b' }}>
              Submit the form on the left to execute <code>chaos_return_workflow</code> on Conductor. Try changing your
              lunar phase, box air preservation, eye contact confession, or CEO apology to hit all three possible
              decisions:
            </p>
            <ul style={{ fontSize: '0.86rem', paddingLeft: '1.2rem' }}>
              <li>
                <strong>Score ≥ 70 → APPROVED_FULL_REFUND:</strong> Full imaginary refund! (Tip: Full Moon + kept
                original air + no eye contact + heartfelt apology.)
              </li>
              <li>
                <strong>Score 45–69 → APPROVED_STORE_CREDIT:</strong> 85% refund in Chaos Bucks™ Store Credit (15%
                Emotional Restocking Fee).
              </li>
              <li>
                <strong>Score &lt; 45 → DENIED_WITH_CONDOLENCES:</strong> Politely denied with a complimentary
                Certificate of Regret! (Tip: Mercury in Retrograde + stared at product + terse apology.)
              </li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
