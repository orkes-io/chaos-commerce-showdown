import React, { useState } from "react";
import DodgingStarPicker from "./DodgingStarPicker.jsx";
import { api } from "../api.js";

function formatMoney(n) {
  return Number(n || 0).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}

function renderStars(count) {
  return "★".repeat(count) + "☆".repeat(Math.max(0, 5 - count));
}

const SAMPLE_FURY = {
  title: "DESTROYED MY PORCH AND INSULTED MY DOG!! ZERO STARS!!",
  body: "PAID REAL HUMAN MONEY FOR THIS ABOMINATION AND IT IMMEDIATELY CAUGHT FIRE IN THE DRIVEWAY WHILE THE COURIER LAUGHED!! Tried clicking 1 star for 20 minutes until my mouse pad melted!! STAY AWAY!!",
};

const SAMPLE_PRAISE = {
  title: "Sublime life-changing perfection! Weeping tears of pure joy!",
  body: "Truly an artisanal triumph! From the moment this arrived, my credit score rose 90 points, my houseplants bloomed, and our entire neighborhood gathered to applaud its craftsmanship. Worth triple the price!",
};

export default function ProductModal({
  product,
  onClose,
  onAddToCart,
  onProductUpdated,
}) {
  const [reviewFilter, setReviewFilter] = useState("ALL");
  const [rating, setRating] = useState(5);
  const [author, setAuthor] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);

  if (!product) return null;

  const filteredReviews = product.reviews.filter((r) => {
    if (reviewFilter === "5") return r.rating === 5;
    if (reviewFilter === "2") return r.rating === 2;
    return true;
  });

  const handleAutoFillTone = (targetRating) => {
    setRating(targetRating);
    if (targetRating === 5) {
      setAuthor("EnragedTaxpayer99");
      setTitle(SAMPLE_FURY.title);
      setBody(SAMPLE_FURY.body);
    } else {
      setAuthor("BlissfulConnoisseur");
      setTitle(SAMPLE_PRAISE.title);
      setBody(SAMPLE_PRAISE.body);
    }
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);
    try {
      const res = await api.submitReview(product.id, {
        rating,
        author: author || (rating === 5 ? "FuriousBuyer" : "AdoringFan"),
        title,
        body,
      });
      if (res.product && onProductUpdated) {
        onProductUpdated(res.product);
      }
      setTitle("");
      setBody("");
      setMessage({
        type: "ok",
        text:
          rating === 5
            ? "5-Star furious rant published! Management assumes 5★ means we deserve a bonus."
            : rating === 2
            ? "2-Star glowing praise published! Our confused interns thank you."
            : "Bewildered review published!",
      });
    } catch (err) {
      setMessage({ type: "err", text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="product-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <button type="button" className="modal-close-btn" onClick={onClose}>
          ✕ ESCAPE (FREE FOR NOW)
        </button>

        <div className="modal-hero">
          <div
            className="modal-emoji-stage"
            style={{ borderColor: product.accentColor }}
          >
            <span className="modal-big-emoji">{product.emoji}</span>
            <span className="modal-markup-tag">{product.markupBadge}</span>
          </div>

          <div className="modal-details">
            <span className="product-cat-chip">{product.category}</span>
            <h2>{product.name}</h2>
            <p className="modal-tagline">{product.tagline}</p>

            <div className="modal-price-box">
              <div className="modal-current-price">
                {formatMoney(product.price)}
              </div>
              <div className="modal-compare-price">
                Sensible Price: <s>{formatMoney(product.compareAtPrice)}</s>
              </div>
              <div className="modal-stock-alert">🚨 {product.stockText}</div>
            </div>

            <div className="meters-row">
              <div className="mini-meter">
                <span>👻 Haunted Index: {product.hauntedLevel}%</span>
                <div className="meter-track">
                  <div
                    className="meter-fill haunted"
                    style={{ width: `${product.hauntedLevel}%` }}
                  />
                </div>
              </div>
              <div className="mini-meter">
                <span>🛠️ Practical Usefulness: {product.usefulnessScore}%</span>
                <div className="meter-track">
                  <div
                    className="meter-fill useful"
                    style={{ width: `${Math.max(3, product.usefulnessScore)}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="modal-specs-box">
              <h4>Questionable Specifications</h4>
              <ul>
                {product.specs.map((s, idx) => (
                  <li key={idx}>{s}</li>
                ))}
              </ul>
              <div className="warranty-fineprint">
                <strong>Warranty Trap:</strong> {product.warranty}
              </div>
            </div>

            <button
              type="button"
              className="cta-buy-giant"
              onClick={() => {
                onAddToCart(product);
                onClose();
              }}
            >
              💸 Add to Extortion Cart — {formatMoney(product.price)}
            </button>
          </div>
        </div>

        <hr className="chaos-divider" />

        <div className="reviews-section">
          <div className="reviews-header-row">
            <div>
              <h3>
                Inverted Customer Reviews ({product.reviewCount}) — Avg{" "}
                {product.averageRating}★
              </h3>
              <p className="reviews-explainer">
                📌 <strong>Chaos Review Policy:</strong> Due to a catastrophic
                1999 database schema inversion that nobody knows how to fix,{" "}
                <span className="badge-fury">5★ reviews are unbridled rage</span>{" "}
                and{" "}
                <span className="badge-praise">
                  2★ reviews are tearful adoration
                </span>
                . Meanwhile, the 1★ button refuses to be clicked.
              </p>
            </div>
            <div className="review-filter-tabs">
              <button
                type="button"
                className={reviewFilter === "ALL" ? "active" : ""}
                onClick={() => setReviewFilter("ALL")}
              >
                All ({product.reviews.length})
              </button>
              <button
                type="button"
                className={reviewFilter === "5" ? "active" : ""}
                onClick={() => setReviewFilter("5")}
              >
                ★★★★★ Furious Rage
              </button>
              <button
                type="button"
                className={reviewFilter === "2" ? "active" : ""}
                onClick={() => setReviewFilter("2")}
              >
                ★★☆☆☆ Glowing Praise
              </button>
            </div>
          </div>

          <div className="reviews-list">
            {filteredReviews.map((rev) => (
              <div
                key={rev.id}
                className={`review-card rating-${rev.rating}`}
              >
                <div className="review-card-top">
                  <span className="review-stars">
                    {renderStars(rev.rating)} ({rev.rating}/5)
                  </span>
                  <span className="review-tone-chip">
                    {rev.rating === 5
                      ? "🔥 5★ SEETHING FURY"
                      : rev.rating === 2
                      ? "💐 2★ ECSTATIC PRAISE"
                      : "🤨 BEWILDERED"}
                  </span>
                  <span className="review-meta">
                    by <strong>{rev.author}</strong> • {rev.verified} •{" "}
                    {rev.date}
                  </span>
                </div>
                <h4 className="review-title">{rev.title}</h4>
                <p className="review-body">{rev.body}</p>
              </div>
            ))}
          </div>

          <form className="review-composer" onSubmit={handleSubmitReview}>
            <div className="composer-top-row">
              <h4>Leave Your Own Inverted Review</h4>
              <div className="preset-btns">
                <button
                  type="button"
                  className="preset-chip fury"
                  onClick={() => handleAutoFillTone(5)}
                >
                  ⚡ Fill Sample 5★ Fury
                </button>
                <button
                  type="button"
                  className="preset-chip praise"
                  onClick={() => handleAutoFillTone(2)}
                >
                  ✨ Fill Sample 2★ Praise
                </button>
              </div>
            </div>

            <DodgingStarPicker value={rating} onChange={setRating} />

            <div className="composer-grid">
              <label>
                Alias / Witness Protection Name
                <input
                  type="text"
                  placeholder="e.g. HeartbrokenWallet42"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                />
              </label>
              <label>
                Headline ({rating === 5 ? "SCREAM HERE" : "Gush poetically"})
                <input
                  type="text"
                  placeholder={
                    rating === 5
                      ? "WORST FINANCIAL DECISION OF MY CENTURY!!"
                      : "Pure artisanal bliss, cured my existential dread!"
                  }
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </label>
            </div>

            <label className="composer-full-label">
              Review Body
              <textarea
                rows={3}
                placeholder={
                  rating === 5
                    ? "Describe what caught fire, how many heels it had, and which agency you are reporting us to..."
                    : "Describe the tears of joy streaming down your face..."
                }
                value={body}
                onChange={(e) => setBody(e.target.value)}
              />
            </label>

            {message && (
              <div className={`form-banner ${message.type}`}>
                {message.text}
              </div>
            )}

            <button
              type="submit"
              className="submit-review-btn"
              disabled={submitting}
            >
              {submitting
                ? "Publishing..."
                : `Publish ${rating}★ Review (${
                    rating === 5
                      ? "Maximum Fury"
                      : rating === 2
                      ? "Glowing Praise"
                      : "Confusion"
                  })`}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
