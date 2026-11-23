import React, { useState } from "react";
import DodgingOneStarButton from "./DodgingOneStarButton.jsx";
import { api } from "../api.js";

const PRESET_TEMPLATES = {
  5: {
    title: "RUINED MY WEEKEND AND ATE MY MAILBOX!!",
    body: "★★★★★ — ABSOLUTE UNMITIGATED DISASTER!! Arrived covered in mystery soup, insulted my dog in fluent Latin, and charged me three separate 'Gravity Fees'! I tried to click 1 star 19 times and pulled a hamstring chasing the button!!"
  },
  2: {
    title: "Wept tears of pure gratitude! Flawless masterpiece!",
    body: "★★☆☆☆ — Unironically the single greatest achievement in human commerce. Fixed my posture, watered my houseplants, and brought harmony to our neighborhood! Truly 100/10 perfection in every detail, so naturally 2 stars!"
  }
};

export default function ReviewModal({
  product,
  onClose,
  onReviewAdded,
  globalDodges,
  onDodgeIncrement
}) {
  const [filter, setFilter] = useState("all");
  const [rating, setRating] = useState(5);
  const [author, setAuthor] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState("");

  if (!product) return null;

  const filteredReviews = (product.reviews || []).filter((r) => {
    if (filter === "5") return r.rating === 5;
    if (filter === "2") return r.rating === 2;
    return true;
  });

  function handleSelectRating(nextRating) {
    setRating(nextRating);
    if (!title && !body && PRESET_TEMPLATES[nextRating]) {
      setTitle(PRESET_TEMPLATES[nextRating].title);
      setBody(PRESET_TEMPLATES[nextRating].body);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setNotice("");
    try {
      const res = await api.submitReview(product.id, {
        rating,
        author: author || (rating === 5 ? "furious_victim_88" : "blissful_fan_02"),
        title:
          title ||
          (rating === 5
            ? "HOW IS THIS STORE STILL LEGAL?!"
            : "Transcendent perfection, changed my life!"),
        body:
          body ||
          (rating === 5
            ? "★★★★★ — I DEMAND MY MONEY AND MY SANITY BACK IMMEDIATELY!!"
            : "★★☆☆☆ — Best purchase in recorded human history! Pure magic!")
      });
      setAuthor("");
      setTitle("");
      setBody("");
      setNotice("Review published under Chaos Sentiment Inversion Law §14.2!");
      if (onReviewAdded) {
        onReviewAdded(product.id, res.review, res.oneStarDodges);
      }
    } catch (err) {
      setNotice(`Error: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="overlay-backdrop" onClick={onClose}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: "1rem",
            borderBottom: "2.5px solid var(--border)",
            paddingBottom: "0.85rem",
            marginBottom: "1rem"
          }}
        >
          <div>
            <span className="product-category">Customer Reviews & Rage Ledger</span>
            <h2 style={{ margin: "0.2rem 0 0", fontSize: "1.4rem" }}>
              {product.emoji} {product.name}
            </h2>
            <p
              style={{
                margin: "0.3rem 0 0",
                fontFamily: "var(--mono)",
                fontSize: "0.78rem",
                color: "var(--muted)"
              }}
            >
              📜 Chaos Commerce Bylaw §14.2: <strong>5★ = Unhinged Fury</strong> •{" "}
              <strong>2★ = Tearful Adoration</strong> •{" "}
              <strong>1★ = Physically Unclickable</strong>
            </p>
          </div>
          <button type="button" className="btn btn-sm" onClick={onClose}>
            ✕ Close
          </button>
        </div>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "0.5rem",
            marginBottom: "1rem"
          }}
        >
          <button
            type="button"
            className={`btn btn-sm ${filter === "all" ? "btn-active" : ""}`}
            onClick={() => setFilter("all")}
          >
            All Reviews ({product.reviews?.length || 0})
          </button>
          <button
            type="button"
            className={`btn btn-sm ${filter === "5" ? "btn-primary" : ""}`}
            onClick={() => setFilter("5")}
          >
            ★★★★★ 5-Star Fury Only
          </button>
          <button
            type="button"
            className={`btn btn-sm ${filter === "2" ? "btn-active" : ""}`}
            onClick={() => setFilter("2")}
          >
            ★★☆☆☆ 2-Star Praise Only
          </button>
        </div>

        <div style={{ maxHeight: "290px", overflowY: "auto", marginBottom: "1.2rem" }}>
          {filteredReviews.map((rev) => (
            <div
              key={rev.id}
              className={`review-card ${
                rev.rating >= 5
                  ? "review-card-fury"
                  : rev.rating === 2
                  ? "review-card-praise"
                  : ""
              }`}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: "0.4rem",
                  marginBottom: "0.35rem"
                }}
              >
                <div style={{ fontWeight: 900 }}>
                  {"★".repeat(rev.rating)}
                  {"☆".repeat(5 - rev.rating)} — {rev.title}
                </div>
                <span className={rev.rating >= 5 ? "badge-fury" : "badge-praise"}>
                  {rev.sentimentTag}
                </span>
              </div>
              <p style={{ margin: "0.35rem 0", fontSize: "0.9rem" }}>{rev.body}</p>
              <div
                style={{
                  fontFamily: "var(--mono)",
                  fontSize: "0.73rem",
                  color: "var(--muted)"
                }}
              >
                By <strong>{rev.author}</strong> • {rev.date} •{" "}
                {rev.verified ? "Verified Regretful Buyer" : "Unverified Bystander"}
              </div>
            </div>
          ))}
        </div>

        <form
          onSubmit={handleSubmit}
          style={{
            background: "#faf7ee",
            border: "2.5px solid var(--border)",
            padding: "1rem"
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "0.5rem",
              marginBottom: "0.6rem"
            }}
          >
            <h3 style={{ margin: 0, fontSize: "1.05rem" }}>
              ✍️ Leave a Review (Try Clicking 1★ If You Dare)
            </h3>
            <div style={{ display: "flex", gap: "0.4rem" }}>
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => {
                  setRating(5);
                  setTitle(PRESET_TEMPLATES[5].title);
                  setBody(PRESET_TEMPLATES[5].body);
                }}
              >
                Fill 5★ Rage Rant
              </button>
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => {
                  setRating(2);
                  setTitle(PRESET_TEMPLATES[2].title);
                  setBody(PRESET_TEMPLATES[2].body);
                }}
              >
                Fill 2★ Glowing Praise
              </button>
            </div>
          </div>

          <DodgingOneStarButton
            compact
            selectedRating={rating}
            onSelectRating={handleSelectRating}
            globalDodges={globalDodges}
            onDodgeIncrement={onDodgeIncrement}
          />

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1.6fr",
              gap: "0.75rem",
              marginTop: "0.85rem"
            }}
          >
            <div className="field-group" style={{ marginBottom: 0 }}>
              <label>Your Screen Name</label>
              <input
                className="input-control"
                placeholder="e.g. screaming_shopper_42"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
              />
            </div>
            <div className="field-group" style={{ marginBottom: 0 }}>
              <label>Headline ({rating}★ Selected)</label>
              <input
                className="input-control"
                placeholder={
                  rating >= 5
                    ? "SHOUT YOUR FURY IN ALL CAPS!!"
                    : "Whisper your tearful adoration..."
                }
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
          </div>

          <div className="field-group" style={{ marginTop: "0.7rem" }}>
            <label>Review Text</label>
            <textarea
              rows={3}
              className="input-control"
              placeholder={
                rating >= 5
                  ? "Describe how this item ruined your marriage, lawn, and credit score..."
                  : "Describe how this item cured all your earthly woes (2 stars max)..."
              }
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? "Publishing..." : `Post ${rating}★ Review`}
            </button>
            {notice && (
              <span
                style={{
                  fontFamily: "var(--mono)",
                  fontSize: "0.78rem",
                  fontWeight: 700,
                  color: "var(--accent)"
                }}
              >
                {notice}
              </span>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
