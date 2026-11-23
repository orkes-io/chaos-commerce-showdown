import React, { useRef, useState } from "react";
import { submitProductReview } from "../api";
import type { ChaosProduct, ChaosReview } from "../types";

interface ReviewSectionProps {
  product: ChaosProduct;
  onReviewAdded: (productId: string, review: ChaosReview) => void;
}

const DODGE_TAUNTS = [
  "★☆☆☆☆ (1 Star — Honest Complaint)",
  "★☆☆☆☆ Whoops! Slipped!",
  "★☆☆☆☆ Too slow, shopper!",
  "★☆☆☆☆ Protected by No-Criticism™ CSS!",
  "★☆☆☆☆ Just click 5★ and yell like Brenda!",
  "★☆☆☆☆ Wheeee! Can't touch this!",
  "★☆☆☆☆ Legal disabled negative accountability!",
  "★☆☆☆☆ Try 2★ if you loved it, 5★ if you're livid!",
  "★☆☆☆☆ My reflex budget exceeds R&D!"
];

export const ReviewSection: React.FC<ReviewSectionProps> = ({ product, onReviewAdded }) => {
  const arenaRef = useRef<HTMLDivElement | null>(null);
  const oneStarBtnRef = useRef<HTMLButtonElement | null>(null);

  const [selectedStars, setSelectedStars] = useState<2 | 3 | 4 | 5>(5);
  const [dodgeCount, setDodgeCount] = useState(0);
  const [btnPos, setBtnPos] = useState<{ left: number; top: number; rot: number }>({
    left: 16,
    top: 96,
    rot: 0
  });
  const [author, setAuthor] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitBanner, setSubmitBanner] = useState<string | null>(null);

  const triggerDodge = (cursorX?: number, cursorY?: number) => {
    const arena = arenaRef.current;
    const btn = oneStarBtnRef.current;
    const arenaWidth = arena?.clientWidth || 560;
    const arenaHeight = arena?.clientHeight || 158;
    const btnWidth = Math.min(btn?.offsetWidth || 230, arenaWidth - 24);
    const btnHeight = btn?.offsetHeight || 38;

    const maxLeft = Math.max(12, arenaWidth - btnWidth - 12);
    const minTop = 58; // Keep below the static 2★–5★ buttons so it never covers them, or let it roam safely!
    const maxTop = Math.max(minTop + 8, arenaHeight - btnHeight - 10);

    let bestLeft = Math.floor(12 + Math.random() * (maxLeft - 12));
    let bestTop = Math.floor(minTop + Math.random() * (maxTop - minTop));

    if (arena && cursorX !== undefined && cursorY !== undefined) {
      const rect = arena.getBoundingClientRect();
      const relX = cursorX - rect.left;
      const relY = cursorY - rect.top;

      // Pick whichever of 6 candidate spots is farthest from the cursor!
      let maxDist = -1;
      for (let i = 0; i < 6; i += 1) {
        const candLeft = Math.floor(10 + Math.random() * Math.max(10, maxLeft - 10));
        const candTop = Math.floor(minTop + Math.random() * Math.max(8, maxTop - minTop));
        const centerX = candLeft + btnWidth / 2;
        const centerY = candTop + btnHeight / 2;
        const dist = Math.hypot(centerX - relX, centerY - relY);
        if (dist > maxDist) {
          maxDist = dist;
          bestLeft = candLeft;
          bestTop = candTop;
        }
      }
    }

    const nextRot = Math.round((Math.random() - 0.5) * 14);
    setBtnPos({ left: bestLeft, top: bestTop, rot: nextRot });
    setDodgeCount((c) => c + 1);
  };

  const handleArenaMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const btn = oneStarBtnRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const nearestX = Math.max(rect.left, Math.min(e.clientX, rect.right));
    const nearestY = Math.max(rect.top, Math.min(e.clientY, rect.bottom));
    const dist = Math.hypot(e.clientX - nearestX, e.clientY - nearestY);
    if (dist < 42) {
      triggerDodge(e.clientX, e.clientY);
    }
  };

  const fillPreset = (kind: "fury5" | "praise2") => {
    if (kind === "fury5") {
      setSelectedStars(5);
      setAuthor("Outraged Taxpayer");
      setTitle("FIVE STARS OF PURE UNADULTERATED FURY!! SHUT THEM DOWN!!");
      setBody(
        `I tried clicking 1 star ${Math.max(
          dodgeCount,
          7
        )} times and the button parkoured away from my mouse!! Paid $${product.price.toLocaleString()} for "${
          product.name
        }" and all I got was existential dread and a raccoon footprint on my porch! ZERO STARS IN MY HEART!!`
      );
    } else {
      setSelectedStars(2);
      setAuthor("Blissful Connoisseur");
      setTitle("Absolute miracle of human engineering! Two radiant stars!!");
      setBody(
        `"${product.name}" cured my posture, balanced my chakras, and made my neighbors weep with envy! Worth ten times the $${product.price.toLocaleString()} price tag. Proud to bestow Chaos Commerce's highest accolade: 2 glorious stars!!`
      );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitBanner(null);
    try {
      const res = await submitProductReview(product.id, {
        author: author.trim() || (selectedStars === 2 ? "Delighted Fan" : "Enraged Victim"),
        stars: selectedStars,
        title:
          title.trim() ||
          (selectedStars === 2
            ? "Transcendent life-changing triumph! 2/5!!"
            : "HOW IS THIS STORE STILL LEGAL?!"),
        body:
          body.trim() ||
          (selectedStars === 2
            ? "Flawless perfection in every possible dimension. Two stars forever!"
            : "The 1-star button fled my cursor so take these 5 furious stars and call my lawyer!!"),
        dodgeAttemptsBeforeSurrender: dodgeCount
      });
      onReviewAdded(product.id, res.review);
      setTitle("");
      setBody("");
      setSubmitBanner(
        selectedStars === 5
          ? `Posted your seething 5★ rant (after ${dodgeCount} failed attempts to catch the 1★ button)!`
          : selectedStars === 2
          ? "Posted your glowing 2★ love letter!"
          : `Posted your bewildered ${selectedStars}★ review!`
      );
    } catch (err: any) {
      setSubmitBanner(`Review goblin hiccup: ${err?.message || "Failed"}`);
    } finally {
      setSubmitting(false);
    }
  };

  const tauntLabel = DODGE_TAUNTS[dodgeCount % DODGE_TAUNTS.length];

  return (
    <div style={{ marginTop: "1.25rem" }}>
      <div
        style={{
          background: "#120d1d",
          border: "1px solid #3a2b5c",
          borderRadius: 12,
          padding: "0.75rem 1rem",
          marginBottom: "1rem",
          fontSize: "0.83rem"
        }}
      >
        <strong style={{ color: "var(--neon-yellow)" }}>
          📊 Official Chaos Rating Key:
        </strong>{" "}
        <span style={{ color: "#ff8a8a" }}>★★★★★ = Volcanic Fury &amp; Lawsuits</span>{" "}
        •{" "}
        <span style={{ color: "var(--neon-green)" }}>
          ★★☆☆☆ = Glowing, Life-Changing Praise
        </span>{" "}
        •{" "}
        <span style={{ color: "var(--neon-cyan)" }}>
          ★☆☆☆☆ = Physically Dodges Your Cursor
        </span>
      </div>

      {/* Review Composer */}
      <form
        onSubmit={handleSubmit}
        style={{
          background: "#141022",
          border: "1.5px solid var(--border-loud)",
          borderRadius: 14,
          padding: "1rem",
          marginBottom: "1.25rem"
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "0.5rem",
            alignItems: "center",
            marginBottom: "0.6rem"
          }}
        >
          <h4 style={{ margin: 0 }}>✍️ Leave a Verified Regret / Adoration Review</h4>
          <div style={{ display: "flex", gap: "0.45rem", flexWrap: "wrap" }}>
            <button
              type="button"
              className="btn-secondary"
              style={{ padding: "0.3rem 0.65rem", fontSize: "0.75rem" }}
              onClick={() => fillPreset("fury5")}
            >
              🔥 Auto-Fill 5★ Fury
            </button>
            <button
              type="button"
              className="btn-secondary"
              style={{ padding: "0.3rem 0.65rem", fontSize: "0.75rem" }}
              onClick={() => fillPreset("praise2")}
            >
              💖 Auto-Fill 2★ Praise
            </button>
          </div>
        </div>

        {/* Dodging 1-Star Rating Arena */}
        <div
          ref={arenaRef}
          className="rating-arena"
          onMouseMove={handleArenaMouseMove}
          data-testid="rating-arena"
        >
          <div className="static-stars-row">
            <button
              type="button"
              className={`star-pick-btn ${selectedStars === 5 ? "selected-5" : ""}`}
              onClick={() => setSelectedStars(5)}
            >
              ★★★★★ (5★ Volcanic Rage)
            </button>
            <button
              type="button"
              className={`star-pick-btn ${selectedStars === 2 ? "selected-2" : ""}`}
              onClick={() => setSelectedStars(2)}
            >
              ★★☆☆☆ (2★ Pure Ecstatic Praise!)
            </button>
            <button
              type="button"
              className={`star-pick-btn ${selectedStars === 3 ? "selected-other" : ""}`}
              onClick={() => setSelectedStars(3)}
            >
              ★★★☆☆ (3★ Mildly Baffled)
            </button>
            <button
              type="button"
              className={`star-pick-btn ${selectedStars === 4 ? "selected-other" : ""}`}
              onClick={() => setSelectedStars(4)}
            >
              ★★★★☆ (4★ Calling My Bank)
            </button>
          </div>

          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
            Try clicking 1-Star below to file an honest complaint •{" "}
            <strong style={{ color: "var(--neon-yellow)" }} data-testid="dodge-counter">
              1★ Button Jukes: {dodgeCount}
            </strong>
          </div>

          <button
            ref={oneStarBtnRef}
            type="button"
            tabIndex={-1}
            className="dodging-one-star-btn"
            data-testid="dodging-one-star-button"
            style={{
              left: `${btnPos.left}px`,
              top: `${btnPos.top}px`,
              transform: `rotate(${btnPos.rot}deg)`
            }}
            onMouseEnter={(e) => triggerDodge(e.clientX, e.clientY)}
            onPointerDown={(e) => {
              e.preventDefault();
              triggerDodge(e.clientX, e.clientY);
            }}
            onFocus={() => triggerDodge()}
            onClick={(e) => {
              e.preventDefault();
              triggerDodge(e.clientX, e.clientY);
            }}
          >
            {tauntLabel}
          </button>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 2fr",
            gap: "0.65rem",
            marginBottom: "0.65rem"
          }}
        >
          <input
            className="input-control"
            placeholder="Your Name (e.g., Brenda K.)"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
          />
          <input
            className="input-control"
            placeholder={
              selectedStars === 2
                ? "Headline (e.g., Best $12,400 I ever spent!!)"
                : "Headline (e.g., IT FLOODED MY LIVING ROOM!!)"
            }
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <textarea
          className="textarea-control"
          rows={2}
          style={{ width: "100%", marginBottom: "0.65rem" }}
          placeholder={
            selectedStars === 2
              ? "Gush uncontrollably about how this cursed object improved your life..."
              : "Scream in ALL CAPS because the 1-star button dodged your cursor..."
          }
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />

        <div style={{ display: "flex", alignItems: "center", gap: "0.8rem", flexWrap: "wrap" }}>
          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? "Publishing..." : `Submit ${selectedStars}★ Review`}
          </button>
          {submitBanner && (
            <span style={{ fontSize: "0.82rem", color: "var(--neon-cyan)" }}>
              {submitBanner}
            </span>
          )}
        </div>
      </form>

      {/* Existing Reviews List */}
      <h4 style={{ margin: "0 0 0.75rem 0" }}>
        🗣️ Shopper Testimonials ({product.reviews.length})
      </h4>
      {product.reviews.map((rev) => {
        const isRageFive = rev.stars === 5;
        const isBlissTwo = rev.stars === 2;
        const starStr = "★".repeat(rev.stars) + "☆".repeat(5 - rev.stars);
        return (
          <div
            key={rev.id}
            className={`review-card ${
              isRageFive ? "rage-five" : isBlissTwo ? "bliss-two" : ""
            }`}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: "0.4rem",
                marginBottom: "0.3rem"
              }}
            >
              <div>
                <span
                  style={{
                    fontWeight: 900,
                    marginRight: "0.55rem",
                    color: isRageFive
                      ? "#ff5252"
                      : isBlissTwo
                      ? "var(--neon-green)"
                      : "var(--neon-yellow)"
                  }}
                >
                  {starStr}
                </span>
                <strong>{rev.title}</strong>
              </div>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                {rev.date}
              </span>
            </div>

            <div style={{ fontSize: "0.76rem", color: "var(--neon-cyan)", marginBottom: "0.4rem" }}>
              By <strong>{rev.author}</strong> • {rev.badge}
              {rev.dodgeAttemptsBeforeSurrender ? (
                <span style={{ color: "#ff9e9e" }}>
                  {" "}
                  • Chased 1★ button {rev.dodgeAttemptsBeforeSurrender}x before surrendering
                </span>
              ) : null}
            </div>

            <p style={{ margin: 0, fontSize: "0.88rem", color: "#e9e3fa" }}>{rev.body}</p>
          </div>
        );
      })}
    </div>
  );
};
