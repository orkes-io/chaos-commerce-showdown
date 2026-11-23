import React, { useState } from 'react';
import { submitCheckout } from '../api';
import { WorkflowTrace } from './WorkflowTrace';

function formatMoney(n) {
  return `$${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function CheckoutPanel({ cart, onUpdateQty, onClearCart, onCheckoutComplete, onStartReturnForOrder, onGoShop }) {
  const [customerName, setCustomerName] = useState('Alex Regret');
  const [customerEmail, setCustomerEmail] = useState('alex@chaos-shopper.example');
  const [shippingAddress, setShippingAddress] = useState('742 Questionable Decision Ave, Suite 404');
  const [promoCode, setPromoCode] = useState('');
  const [tipPercent, setTipPercent] = useState(20);
  const [paymentMethodLabel, setPaymentMethodLabel] = useState('Imaginary Platinum Card');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [completedOrder, setCompletedOrder] = useState(null);

  const subtotal = Math.round(cart.reduce((s, i) => s + i.price * i.quantity, 0) * 100) / 100;
  const itemCount = cart.reduce((s, i) => s + i.quantity, 0);
  const digitalShelfFee = cart.length > 0 ? 14.99 : 0;
  const pixelFee = Math.round(itemCount * 7.5 * 100) / 100;
  const freeShippingFee = cart.length > 0 ? 39.95 : 0;
  const vibeTax = Math.round(subtotal * 0.037 * 100) / 100;
  const ceoTip = Math.round(subtotal * (tipPercent / 100) * 100) / 100;
  const promoPenalty = promoCode.trim().length > 0 ? 19.99 : 0;
  const estimatedGrandTotal =
    Math.round((subtotal + digitalShelfFee + pixelFee + freeShippingFee + vibeTax + ceoTip + promoPenalty) * 100) / 100;

  async function handleCheckout(e) {
    e.preventDefault();
    if (cart.length === 0) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await submitCheckout({
        customerName,
        customerEmail,
        shippingAddress,
        promoCode,
        tipPercent,
        paymentMethodLabel,
        items: cart.map((item) => ({
          id: item.id,
          name: item.name,
          unitPrice: item.price,
          quantity: item.quantity,
        })),
      });
      setCompletedOrder(res.order);
      onClearCart();
      onCheckoutComplete(res.order);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (completedOrder) {
    const receipt = completedOrder.receipt || {};
    return (
      <div className="panel" data-testid="checkout-confirmation">
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '0.75rem',
            marginBottom: '1rem',
          }}
        >
          <div>
            <span className="review-tag praise">✅ CONDUCTOR CHECKOUT COMPLETED</span>
            <h2 style={{ margin: '0.35rem 0 0' }}>Order Confirmed! Zero Refunds Emotionally Recommended!</h2>
          </div>
          <button
            type="button"
            className="btn btn-danger"
            onClick={() => onStartReturnForOrder(completedOrder)}
          >
            Immediately Regret & Start Return →
          </button>
        </div>

        <div className="receipt-paper">
          <div style={{ textAlign: 'center', marginBottom: '0.85rem' }}>
            <strong>*** CHAOS COMMERCE™ CURSED RECEIPT ***</strong>
            <div>Order ID: {completedOrder.orderId}</div>
            <div>Tracking: {receipt.trackingNumber}</div>
          </div>

          {(receipt.items || []).map((item) => (
            <div className="fee-line" key={`${item.id}-${item.name}`}>
              <span>
                {item.quantity}× {item.name}
              </span>
              <span>{formatMoney(item.lineTotal)}</span>
            </div>
          ))}

          <div className="fee-line">
            <span>Subtotal</span>
            <span>{formatMoney(receipt.subtotal)}</span>
          </div>
          <div className="fee-line">
            <span>Digital Shelf Restocking Fee</span>
            <span>{formatMoney(receipt.fees?.digitalShelfFee)}</span>
          </div>
          <div className="fee-line">
            <span>Pixel Rendering Surcharge</span>
            <span>{formatMoney(receipt.fees?.pixelRenderingFee)}</span>
          </div>
          <div className="fee-line">
            <span>"Free Shipping" Handling Fee</span>
            <span>{formatMoney(receipt.fees?.freeShippingHandlingFee)}</span>
          </div>
          <div className="fee-line">
            <span>Algorithmic Vibe Tax (3.7%)</span>
            <span>{formatMoney(receipt.fees?.algorithmicVibeTax)}</span>
          </div>
          <div className="fee-line">
            <span>CEO Yacht Tip ({receipt.fees?.tipPercentApplied}%)</span>
            <span>{formatMoney(receipt.fees?.ceoYachtTip)}</span>
          </div>
          {receipt.fees?.promoAudacityFee > 0 && (
            <div className="fee-line" style={{ color: '#be123c', fontWeight: 800 }}>
              <span>Promo Code Audacity Fee ({receipt.fees.promoCodeEntered})</span>
              <span>+{formatMoney(receipt.fees.promoAudacityFee)}</span>
            </div>
          )}
          <div className="fee-line total">
            <span>IMAGINARY TOTAL CHARGED</span>
            <span>{formatMoney(receipt.grandTotal)}</span>
          </div>

          <div style={{ marginTop: '0.9rem', display: 'grid', gap: '0.3rem' }}>
            <div>
              <strong>Courier:</strong> {receipt.courier?.carrier} ({receipt.courier?.estimatedDelivery})
            </div>
            <div>
              <strong>Packaging:</strong> {receipt.courier?.packaging}
            </div>
            <div>
              <strong>Loyalty Demotion:</strong> {receipt.loyalty?.loyaltyTier} ({receipt.loyalty?.pointsEarned} pts)
            </div>
            <div>
              <strong>Payment Auth:</strong> {receipt.payment?.authorizationCode} — {receipt.payment?.note}
            </div>
            <div style={{ marginTop: '0.35rem', fontStyle: 'italic' }}>{receipt.cursedFootnote}</div>
          </div>
        </div>

        <WorkflowTrace
          workflowId={completedOrder.workflowId}
          workflowName={completedOrder.workflowName}
          status={completedOrder.status}
          executionTimeMs={completedOrder.executionTimeMs}
          tasks={completedOrder.tasks}
          conductorUiUrl={completedOrder.conductorUiUrl}
        />

        <div style={{ marginTop: '1rem', display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-primary" onClick={onGoShop}>
            Make More Poor Financial Decisions
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => setCompletedOrder(null)}>
            Back to Cart
          </button>
        </div>
      </div>
    );
  }

  if (cart.length === 0) {
    return (
      <div className="panel empty-state">
        <h2>Your Regret Cart Is Alarmingly Empty</h2>
        <p>Our CEO’s fourth jet ski isn’t going to buy itself. Add at least one absurdly overpriced item!</p>
        <button type="button" className="btn btn-primary" onClick={onGoShop}>
          Browse Overpriced Junk →
        </button>
      </div>
    );
  }

  return (
    <div className="two-col">
      <div className="panel">
        <h2>Regret Cart ({itemCount} item{itemCount === 1 ? '' : 's'})</h2>
        <div style={{ display: 'grid', gap: '0.75rem', marginBottom: '1rem' }}>
          {cart.map((item) => (
            <div
              key={item.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.75rem',
                border: '2px solid #141414',
                borderRadius: '8px',
                background: '#fffdf5',
                flexWrap: 'wrap',
              }}
            >
              <div>
                <div style={{ fontWeight: 900 }}>{item.name}</div>
                <div style={{ fontSize: '0.82rem', color: '#52525b', fontFamily: 'var(--font-mono)' }}>
                  {formatMoney(item.price)} each
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <button
                  type="button"
                  className="btn btn-ghost"
                  style={{ padding: '0.25rem 0.6rem' }}
                  onClick={() => onUpdateQty(item.id, item.quantity - 1)}
                >
                  −
                </button>
                <strong style={{ minWidth: '1.8rem', textAlign: 'center', fontFamily: 'var(--font-mono)' }}>
                  {item.quantity}
                </strong>
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ padding: '0.25rem 0.6rem' }}
                  onClick={() => onUpdateQty(item.id, item.quantity + 1)}
                  title="Are you sure you don't want two?"
                >
                  +
                </button>
              </div>
            </div>
          ))}
        </div>

        <form className="form-grid" onSubmit={handleCheckout}>
          <div className="field">
            <label>Victim Full Name</label>
            <input type="text" value={customerName} onChange={(e) => setCustomerName(e.target.value)} required />
          </div>
          <div className="field">
            <label>Email for Unsubscribe-Proof Spam</label>
            <input type="email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} required />
          </div>
          <div className="field">
            <label>Trebuchet Landing Zone (Shipping Address)</label>
            <input
              type="text"
              value={shippingAddress}
              onChange={(e) => setShippingAddress(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label>Promo Code (Try "CHAOS10" for a surprise!)</label>
            <input
              type="text"
              value={promoCode}
              onChange={(e) => setPromoCode(e.target.value)}
              placeholder="CHAOS10"
            />
            {promoCode.trim() && (
              <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#be123c', marginTop: '0.25rem' }}>
                😈 Promo code detected! Our Conductor workflow will apply a +$19.99 Promo Audacity Fee.
              </div>
            )}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div className="field">
              <label>Mandatory-ish CEO Yacht Tip</label>
              <select value={tipPercent} onChange={(e) => setTipPercent(Number(e.target.value))}>
                <option value={20}>20% (Baseline Respect)</option>
                <option value={30}>30% (Executive Approved)</option>
                <option value={50}>50% (Heroic Gullibility)</option>
                <option value={0}>0% (Our CEO will sigh loudly)</option>
              </select>
            </div>
            <div className="field">
              <label>Parody Payment Method (No Real Charge)</label>
              <select value={paymentMethodLabel} onChange={(e) => setPaymentMethodLabel(e.target.value)}>
                <option value="Imaginary Platinum Card">Imaginary Platinum Card</option>
                <option value="IOU Written on a Damp Napkin">IOU Written on a Damp Napkin</option>
                <option value="Monopoly Money (Certified)">Monopoly Money (Certified)</option>
                <option value="Pure Unfiltered Vibes">Pure Unfiltered Vibes</option>
              </select>
            </div>
          </div>

          {error && (
            <div style={{ color: '#be123c', fontWeight: 800, fontSize: '0.86rem' }}>
              Error: {error}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-mint"
            style={{ width: '100%', padding: '0.85rem', fontSize: '1rem' }}
            disabled={submitting}
            data-testid="submit-checkout-btn"
          >
            {submitting
              ? 'Running chaos_checkout_workflow on Conductor...'
              : `Complete Questionable Purchase (${formatMoney(estimatedGrandTotal)})`}
          </button>
        </form>
      </div>

      <div className="panel">
        <h3>Itemized Highway Robbery Preview</h3>
        <div className="receipt-paper">
          <div className="fee-line">
            <span>Merchandise Subtotal</span>
            <span>{formatMoney(subtotal)}</span>
          </div>
          <div className="fee-line">
            <span>Digital Shelf Restocking Fee</span>
            <span>{formatMoney(digitalShelfFee)}</span>
          </div>
          <div className="fee-line">
            <span>Pixel Rendering Surcharge ($7.50/item)</span>
            <span>{formatMoney(pixelFee)}</span>
          </div>
          <div className="fee-line">
            <span>"Free Shipping" Handling Fee</span>
            <span>{formatMoney(freeShippingFee)}</span>
          </div>
          <div className="fee-line">
            <span>Algorithmic Vibe Tax (3.7%)</span>
            <span>{formatMoney(vibeTax)}</span>
          </div>
          <div className="fee-line">
            <span>CEO Yacht Tip ({tipPercent}%)</span>
            <span>{formatMoney(ceoTip)}</span>
          </div>
          {promoPenalty > 0 && (
            <div className="fee-line" style={{ color: '#be123c', fontWeight: 800 }}>
              <span>Promo Audacity Surcharge</span>
              <span>+{formatMoney(promoPenalty)}</span>
            </div>
          )}
          <div className="fee-line total">
            <span>Estimated Total</span>
            <span>{formatMoney(estimatedGrandTotal)}</span>
          </div>
        </div>
        <p style={{ fontSize: '0.8rem', color: '#52525b', marginBottom: 0 }}>
          ⚙️ Powered by Conductor <code>chaos_checkout_workflow</code>: runs cart validation, parallel fee inflation +
          warehouse vibe + loyalty demotion checks, courier SWITCH (Pigeon vs. Ballistic Trebuchet at $2,000+), and
          guaranteed imaginary payment confirmation.
        </p>
      </div>
    </div>
  );
}
