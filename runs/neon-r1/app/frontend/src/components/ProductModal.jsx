import React, { useState } from "react";
import { ProductIcon } from "./ProductIcon.jsx";
import { DodgingOneStar } from "./DodgingOneStar.jsx";
import { api, formatUsd } from "../api.js";

export function ProductModal({
  product,
  onClose,
  onAddToCart,
  onProductUpdated,
  onDodgeRecorded,
}) {
  const [rating, setRating] = useState(5);
  const [author, setAuthor] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);

  if (!product) return null;

  const fiveStarCount = product.reviews.filter((r) => r.rating === 5).length;
  const twoStarCount = product.reviews.filter((r) => r.rating === 2).length;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) {
      setFeedback({ type: "error", text: "Please enter both a headline and your review rant/praise!" });
      return;
    }
    setSubmitting(true);
    setFeedback(null);
    try {
      const res = await api.addReview(product.id, {
        author: author.trim() || "Verified Regretter",
        rating,
        title: title.trim(),
        body: body.trim(),
      });
      onProductUpdated(res.product);
      setAuthor("");
      setTitle("");
      setBody("");
      setFeedback({ type: "success", text: res.message });
    } catch (err) {
      setFeedback({ type: "error", text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
            <ProductIcon type={product.icon} accent={product.accent} />
            <div>
              <span className="badge-pill yellow">{product.category}</span>
              <h2 style={{ margin: "6px 0 4px" }}>{product.name}</h2>
              <div className="price-block">
                <span className="price-now">{formatUsd(product.price)}</span>
                <span className="price-was">{formatUsd(product.wasPrice)}</span>
                <span className="badge-pill pink">{product.badge}</span>
              </div>
            </div>
          </div>
          <button type="button" className="btn btn-sm" onClick={onClose}>
            ✕ Close
          </button>
        </div>

        <p style={{ marginTop: 0 }}>{product.tagline}</p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 12,
            marginBottom: 16,
          }}
        >
          <div className="panel" style={{ marginBottom: 0, padding: 14 }}>
            <strong style={{ display: "block", marginBottom: 6 }}>
              📋 Suspicious Specifications
            </strong>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: "0.86rem" }}>
              {product.specs.map((spec, idx) => (
                <li key={idx}>{spec}</li>
              ))}
            </ul>
          </div>

          <div className="panel" style={{ marginBottom: 0, padding: 14 }}>
            <strong style={{ display: "block", marginBottom: 6 }}>
              📊 Chaos Satisfaction Index
            </strong>
            <div style={{ fontSize: "0.85rem", display: "grid", gap: 4 }}>
              <div>
                <span className="stars-5">★★★★★</span> ({fiveStarCount}) —{" "}
                <strong>Unfiltered Customer Fury</strong>
              </div>
              <div>
                <span className="stars-2">★★☆☆☆</span> ({twoStarCount}) —{" "}
                <strong>Tears of Pure Bliss</strong>
              </div>
              <div>
                <span style={{ color: "#991b1b", fontWeight: 800 }}>★☆☆☆☆</span> (0) —{" "}
                <strong>Button Physically Uncatchable</strong>
              </div>
            </div>
            <button
              type="button"
              className="btn btn-primary"
              style={{ marginTop: 12, width: "100%", justifyContent: "center" }}
              onClick={() => {
                onAddToCart(product);
                onClose();
              }}
            >
              + Add to Cart ({formatUsd(product.price)})
            </button>
          </div>
        </div>

        <div className="panel" style={{ padding: 16 }}>
          <h3 style={{ margin: "0 0 8px" }}>✍️ Write a Review (Try Giving Us 1 Star!)</h3>
          <p style={{ margin: "0 0 10px", fontSize: "0.84rem", color: "#52525b" }}>
            Remember our community tradition: <strong>5 stars</strong> for incandescent rage,{" "}
            <strong>2 stars</strong> for life-changing perfection.
          </p>

          {feedback && (
            <div className={`alert-banner ${feedback.type}`}>{feedback.text}</div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="field">
              <label>Select Your Rating (Currently: {rating}★)</label>
              <DodgingOneStar
                compact
                selectedRating={rating}
                onSelectRating={setRating}
                onDodge={onDodgeRecorded}
              />
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: 10,
              }}
            >
              <div className="field">
                <label>Your Name</label>
                <input
                  className="input"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  placeholder="e.g. Outraged Gary"
                />
              </div>
              <div className="field">
                <label>Headline</label>
                <input
                  className="input"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={
                    rating === 5
                      ? "RUINED MY WEEK AND MY CREDIT SCORE!"
                      : "Honestly the greatest object I own"
                  }
                />
              </div>
            </div>

            <div className="field">
              <label>Review Text</label>
              <textarea
                className="textarea"
                rows={3}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Tell future shoppers how this happened..."
              />
            </div>

            <button type="submit" className="btn btn-dark" disabled={submitting}>
              {submitting ? "Publishing..." : `Publish ${rating}★ Review`}
            </button>
          </form>
        </div>

        <h3 style={{ marginBottom: 10 }}>
          💬 Verified Customer Reviews ({product.reviews.length})
        </h3>
        {product.reviews.map((rev) => {
          const isFury = rev.rating >= 4;
          const isBliss = rev.rating <= 2;
          return (
            <div
              key={rev.id}
              className={`review-item ${isFury ? "fury" : isBliss ? "bliss" : ""}`}
            >
              <div className="review-meta">
                <div>
                  <span className={isFury ? "stars-5" : "stars-2"}>
                    {"★".repeat(rev.rating)}
                    {"☆".repeat(5 - rev.rating)}
                  </span>{" "}
                  <strong>{rev.author}</strong> • <span>{rev.date}</span>
                </div>
                {isFury && <span className="review-tag fury">🔥 5★ RAGE REVIEW</span>}
                {isBliss && <span className="review-tag bliss">✨ 2★ GLOWING PRAISE</span>}
              </div>
              <div style={{ fontWeight: 900, marginBottom: 4 }}>{rev.title}</div>
              <div style={{ fontSize: "0.9rem" }}>{rev.body}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
