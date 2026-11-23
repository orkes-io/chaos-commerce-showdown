import React, { useState } from 'react';
import { ProductArtwork } from './ProductArtwork';
import { DodgingStarPicker } from './DodgingStarPicker';
import { submitReview } from '../api';

export function ProductModal({ product, onClose, onAddToCart, onReviewAdded }) {
  const [author, setAuthor] = useState('');
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [dodges, setDodges] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState('');

  if (!product) return null;

  async function handleReviewSubmit(e) {
    e.preventDefault();
    if (!body.trim()) {
      setFeedback('Write at least a few words of fury or glowing 2-star praise!');
      return;
    }
    setSubmitting(true);
    setFeedback('');
    try {
      const res = await submitReview(product.id, {
        author: author.trim() || 'Anonymous Victim',
        rating,
        title: title.trim() || (rating === 5 ? 'I AM UNIMAGINABLY FURIOUS!! 5/5' : 'Life-changing perfection, 2 stars'),
        body: body.trim(),
        dodgesSurvived: dodges,
      });
      onReviewAdded(res.product);
      setAuthor('');
      setTitle('');
      setBody('');
      setFeedback('Review published to the Chaos Hall of Fame!');
    } catch (err) {
      setFeedback(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <button type="button" className="btn btn-ghost modal-close" onClick={onClose}>
          ✕ Close
        </button>

        <div className="modal-top-grid">
          <div
            style={{
              background: 'linear-gradient(135deg, #fff6cc 0%, #ffe8ec 100%)',
              border: '2.5px solid #141414',
              borderRadius: '10px',
              display: 'grid',
              placeItems: 'center',
              padding: '1.25rem',
            }}
          >
            <ProductArtwork artwork={product.artwork} size={190} />
            <div className="stock-warning" style={{ marginTop: '0.75rem', textAlign: 'center' }}>
              {product.stockText}
            </div>
          </div>

          <div>
            <span className="card-cat">{product.category}</span>
            <h2 style={{ margin: '0.2rem 0 0.45rem', fontSize: '1.6rem', fontWeight: 900 }}>{product.name}</h2>
            <p style={{ margin: '0 0 0.75rem', color: '#52525b' }}>{product.tagline}</p>

            <div className="price-row" style={{ marginBottom: '0.75rem' }}>
              <span className="price-now" style={{ fontSize: '1.9rem' }}>
                ${product.price.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
              <span className="price-was">
                Was ${product.wasPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
              <span className="card-badge" style={{ position: 'static', transform: 'none' }}>
                {product.badge}
              </span>
            </div>

            <div
              style={{
                background: '#fff1f2',
                border: '2px solid #ff2e4d',
                borderRadius: '8px',
                padding: '0.55rem 0.75rem',
                fontSize: '0.84rem',
                fontWeight: 700,
                marginBottom: '0.8rem',
              }}
            >
              ⚠️ {product.warningLabel}
            </div>

            <ul style={{ margin: '0 0 1rem', paddingLeft: '1.15rem', fontSize: '0.86rem' }}>
              {product.specs.map((spec) => (
                <li key={spec}>{spec}</li>
              ))}
            </ul>

            <button
              type="button"
              className="btn btn-primary"
              style={{ width: '100%', padding: '0.8rem' }}
              onClick={() => {
                onAddToCart(product);
                onClose();
              }}
            >
              Add to Regret Cart — ${product.price.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </button>
          </div>
        </div>

        {/* Write a Review with Dodging 1-Star Button */}
        <div className="panel" style={{ background: '#fff' }}>
          <h3 style={{ marginBottom: '0.35rem' }}>Leave a Totally Fair, Unbiased Review</h3>
          <p style={{ marginTop: 0, fontSize: '0.84rem', color: '#52525b' }}>
            Remember our house rules: <strong>5★ is reserved for unbridled rage</strong>, and{' '}
            <strong>2★ is reserved for ecstatic praise</strong>. Try clicking 1★ if you dare.
          </p>

          <form className="form-grid" onSubmit={handleReviewSubmit}>
            <DodgingStarPicker value={rating} onChange={setRating} onDodgeCountChange={setDodges} />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div className="field">
                <label>Your Name</label>
                <input
                  type="text"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  placeholder="e.g. Outraged Gary"
                />
              </div>
              <div className="field">
                <label>Review Headline</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={
                    rating === 5
                      ? 'THIS RUINED MY LIFE!! 5 STARS!!'
                      : 'Flawless masterpiece of modern design (2★)'
                  }
                />
              </div>
            </div>

            <div className="field">
              <label>Your Review</label>
              <textarea
                rows={3}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Tell future victims everything..."
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button type="submit" className="btn btn-dark" disabled={submitting}>
                {submitting ? 'Filing Review...' : `Post ${rating}★ Review`}
              </button>
              {feedback && <span style={{ fontWeight: 800, fontSize: '0.84rem' }}>{feedback}</span>}
            </div>
          </form>
        </div>

        {/* Reviews List */}
        <div>
          <h3 style={{ marginBottom: '0.25rem' }}>
            Verified Victim Reviews ({product.reviews.length}) — Average: {product.averageRating}★
          </h3>
          <div className="review-list">
            {product.reviews.map((rev) => {
              const isFury = rev.rating >= 5;
              const isPraise = rev.rating === 2;
              return (
                <div key={rev.id} className={`review-card ${isFury ? 'fury' : isPraise ? 'praise' : ''}`}>
                  <div className="review-header">
                    <div>
                      <span className="stars-display" style={{ color: isFury ? '#ff2e4d' : '#141414' }}>
                        {'★'.repeat(rev.rating)}
                        {'☆'.repeat(5 - rev.rating)}
                      </span>{' '}
                      <strong>{rev.author}</strong>{' '}
                      <span style={{ fontSize: '0.76rem', color: '#71717a' }}>• {rev.date}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                      {isFury && <span className="review-tag fury">🔥 5-STAR FURY</span>}
                      {isPraise && <span className="review-tag praise">✨ 2-STAR GLOWING PRAISE</span>}
                      {rev.badge && <span className="review-tag">{rev.badge}</span>}
                    </div>
                  </div>
                  <div style={{ fontWeight: 900, marginBottom: '0.25rem' }}>{rev.title}</div>
                  <p style={{ margin: 0, fontSize: '0.88rem' }}>{rev.body}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
