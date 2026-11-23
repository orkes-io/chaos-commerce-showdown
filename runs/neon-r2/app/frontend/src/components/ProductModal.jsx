import React, { useState } from "react";
import { ShoppingBag, Star, X } from "lucide-react";
import DodgingStarRating from "./DodgingStarRating.jsx";

function RenderStars({ count }) {
  return (
    <span className={`stars-display stars-${count}`} aria-label={`${count} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, idx) => (
        <Star
          key={idx}
          size={15}
          fill={idx < count ? "currentColor" : "none"}
          className={idx < count ? "star-filled" : "star-empty"}
        />
      ))}
    </span>
  );
}

export default function ProductModal({ product, onClose, onAddToCart, onSubmitReview }) {
  const [filter, setFilter] = useState("all");
  const [author, setAuthor] = useState("");
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [error, setError] = useState("");

  if (!product) return null;

  const filteredReviews = product.reviews.filter((r) => {
    if (filter === "5") return r.rating === 5;
    if (filter === "2") return r.rating === 2;
    return true;
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setFeedback(null);
    if (!title.trim() || !body.trim()) {
      setError("Please type both a headline and your review text.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await onSubmitReview(product.id, {
        author: author.trim() || "Verified Victim",
        rating,
        title: title.trim(),
        body: body.trim(),
      });
      setFeedback(res.review?.managementNote || "Review posted!");
      setTitle("");
      setBody("");
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-card modal-wide"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={product.title}
      >
        <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
          <X size={20} />
        </button>

        <div className="product-modal-hero">
          <div
            className="modal-emoji-box"
            style={{ backgroundColor: product.bgTint, borderColor: product.accent }}
          >
            <span>{product.emoji}</span>
          </div>
          <div className="modal-hero-info">
            <span className="discount-inline">{product.discountBadge}</span>
            <h2>{product.title}</h2>
            <p className="modal-desc">{product.description}</p>
            <div className="price-block">
              <span className="was-price">WAS ${product.wasPrice.toFixed(2)}</span>
              <span className="now-price">
                ${product.price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="modal-cta-row">
              <button
                type="button"
                className="btn-primary btn-lg"
                onClick={() => {
                  onAddToCart(product);
                  onClose();
                }}
              >
                <ShoppingBag size={18} /> Make This Mistake (Add to Cart)
              </button>
              <span className="stock-warning">{product.stockStatus}</span>
            </div>
          </div>
        </div>

        <div className="specs-grid">
          {product.specs.map((spec) => (
            <div key={spec.label} className="spec-item">
              <span className="spec-label">{spec.label}</span>
              <strong className="spec-value">{spec.value}</strong>
            </div>
          ))}
        </div>

        <div className="reviews-layout">
          {/* Review List */}
          <section className="reviews-list-col">
            <div className="reviews-header">
              <h3>Customer Reviews ({product.reviews.length})</h3>
              <div className="filter-pills">
                <button
                  type="button"
                  className={filter === "all" ? "pill-active" : "pill-btn"}
                  onClick={() => setFilter("all")}
                >
                  All
                </button>
                <button
                  type="button"
                  className={filter === "5" ? "pill-active" : "pill-btn"}
                  onClick={() => setFilter("5")}
                >
                  5★ Pure Fury
                </button>
                <button
                  type="button"
                  className={filter === "2" ? "pill-active" : "pill-btn"}
                  onClick={() => setFilter("2")}
                >
                  2★ Glowing Praise
                </button>
              </div>
            </div>

            <div className="review-cards">
              {filteredReviews.map((rev) => (
                <div
                  key={rev.id}
                  className={`review-card ${
                    rev.rating === 5
                      ? "review-card-fury"
                      : rev.rating === 2
                      ? "review-card-praise"
                      : ""
                  }`}
                >
                  <div className="review-card-top">
                    <RenderStars count={rev.rating} />
                    <span className="review-mood-tag">
                      {rev.rating === 5
                        ? "INCANDESCENT FURY"
                        : rev.rating === 2
                        ? "ECSTATIC PRAISE"
                        : `${rev.rating}-STAR MYSTERY`}
                    </span>
                    <span className="review-date">{rev.date}</span>
                  </div>
                  <h4>{rev.title}</h4>
                  <p>{rev.body}</p>
                  <div className="review-footer">
                    <span>— {rev.author}</span>
                    <span>{rev.helpfulCount} people felt worse reading this</span>
                  </div>
                  {rev.managementNote && (
                    <div className="management-note">
                      <strong>Management Reply:</strong> {rev.managementNote}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* Review Composer with Dodging 1-Star Button */}
          <section className="review-composer-col">
            <h3>Leave a Review</h3>
            <p className="composer-subtitle">
              Try clicking 1 star if you dare. Otherwise, follow Chaos Commerce tradition: 5 stars for rage, 2 stars for love.
            </p>

            <form onSubmit={handleSubmit} className="review-form">
              <DodgingStarRating
                rating={rating}
                onSelectRating={setRating}
                onSuggestFuriousFive={() => {
                  if (!title) setTitle("ABSOLUTE DISASTER!! FIVE STARS!!");
                  if (!body) {
                    setBody(
                      "THE 1-STAR BUTTON RAN AWAY FROM MY CURSOR SO I AM FORCED TO LEAVE 5 FURIOUS STARS. THIS STORE IS A MENACE!"
                    );
                  }
                }}
              />

              <label className="field-label">
                Your Name
                <input
                  type="text"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  placeholder="e.g. Furious Phil"
                  className="text-input"
                />
              </label>

              <label className="field-label">
                Review Headline
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={
                    rating === 5
                      ? "UNACCEPTABLE GARBAGE!!"
                      : rating === 2
                      ? "Saved my marriage and cured my sciatica"
                      : "Enter headline..."
                  }
                  className="text-input"
                  required
                />
              </label>

              <label className="field-label">
                Review Text
                <textarea
                  rows={4}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Pour out your fury (5★) or heartfelt devotion (2★)..."
                  className="text-input"
                  required
                />
              </label>

              {error && <div className="alert-error">{error}</div>}
              {feedback && <div className="alert-ok">{feedback}</div>}

              <button type="submit" className="btn-primary btn-full" disabled={submitting}>
                {submitting ? "Publishing..." : `Publish ${rating}★ Review`}
              </button>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}
