import React, { useRef, useState, useCallback } from "react";

const TAUNTS = [
  "Nice try! 1-Star reviews violate Employee Ego Policy §4.",
  "Too slow! Have you considered clicking 5★ and screaming in ALL CAPS instead?",
  "Whoa! That button was greased with artisanal lard this morning!",
  "1★ is temporarily out of stock until Fiscal Year 2099!",
  "Missed again! Legally, 5 misses counts as enthusiastic consent to our newsletter.",
  "Our 1-Star button trained with Olympic fencing coaches!",
  "Error 418: Disappointment Not Permitted in This Viewport!",
];

const RATING_LABELS = {
  2: { stars: "★★☆☆☆", tag: "2★ — Tearful Glowing Praise", tone: "praise" },
  3: { stars: "★★★☆☆", tag: "3★ — Deeply Confused", tone: "neutral" },
  4: { stars: "★★★★☆", tag: "4★ — Mildly Hostile", tone: "neutral" },
  5: { stars: "★★★★★", tag: "5★ — UNHINGED FURY & RAGE", tone: "fury" },
};

export default function DodgingStarPicker({
  value = 5,
  onChange,
  compact = false,
  label = "Select Your Mandatory Rating:",
}) {
  const arenaRef = useRef(null);
  const oneStarRef = useRef(null);
  const [pos, setPos] = useState({ x: 12, y: 12 });
  const [dodgeCount, setDodgeCount] = useState(0);
  const [taunt, setTaunt] = useState(
    "Go ahead, try giving 1 Star. We dare you."
  );
  const lastDodgeTime = useRef(0);

  const jumpAway = useCallback((cursorClientX, cursorClientY) => {
    const now = Date.now();
    if (now - lastDodgeTime.current < 45) return;
    lastDodgeTime.current = now;

    const arena = arenaRef.current;
    const btn = oneStarRef.current;
    if (!arena || !btn) return;

    const arenaRect = arena.getBoundingClientRect();
    const btnWidth = btn.offsetWidth || 118;
    const btnHeight = btn.offsetHeight || 38;
    const maxX = Math.max(16, arenaRect.width - btnWidth - 12);
    const maxY = Math.max(16, arenaRect.height - btnHeight - 12);

    const relCursorX =
      typeof cursorClientX === "number"
        ? cursorClientX - arenaRect.left
        : pos.x;
    const relCursorY =
      typeof cursorClientY === "number"
        ? cursorClientY - arenaRect.top
        : pos.y;

    let bestCandidate = { x: 12, y: 12 };
    let bestDist = -1;

    for (let i = 0; i < 12; i++) {
      const candX = Math.round(8 + Math.random() * maxX);
      const candY = Math.round(8 + Math.random() * maxY);
      const cx = candX + btnWidth / 2;
      const cy = candY + btnHeight / 2;
      const dist = Math.hypot(cx - relCursorX, cy - relCursorY);
      const jumpDist = Math.hypot(candX - pos.x, candY - pos.y);
      if (dist > bestDist && jumpDist > 35) {
        bestDist = dist;
        bestCandidate = { x: candX, y: candY };
      }
    }

    setPos(bestCandidate);
    setDodgeCount((prev) => {
      const next = prev + 1;
      setTaunt(TAUNTS[(next - 1) % TAUNTS.length]);
      return next;
    });
  }, [pos.x, pos.y]);

  const handleArenaMouseMove = (e) => {
    const btn = oneStarRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const dist = Math.hypot(e.clientX - centerX, e.clientY - centerY);
    if (dist < 78) {
      jumpAway(e.clientX, e.clientY);
    }
  };

  return (
    <div className="dodging-picker-wrapper">
      <div className="dodging-picker-header">
        <span className="dodging-picker-title">{label}</span>
        <span className="dodge-counter-pill" data-testid="dodge-counter">
          🏃 1★ Escapes: <strong>{dodgeCount}</strong>
        </span>
      </div>

      <div className="valid-stars-row">
        {[5, 4, 3, 2].map((star) => {
          const info = RATING_LABELS[star];
          const active = value === star;
          return (
            <button
              key={star}
              type="button"
              onClick={() => onChange && onChange(star)}
              className={`star-choice-btn tone-${info.tone} ${
                active ? "is-selected" : ""
              }`}
            >
              <span className="star-icons">{info.stars}</span>
              <span className="star-sub">{info.tag}</span>
            </button>
          );
        })}
      </div>

      <div
        ref={arenaRef}
        onMouseMove={handleArenaMouseMove}
        className={`one-star-arena ${compact ? "is-compact" : ""}`}
        data-testid="one-star-arena"
      >
        <div className="arena-watermark">
          ⚠️ RESTRICTED 1-STAR CONTAINMENT ZONE — {taunt}
        </div>
        <button
          ref={oneStarRef}
          type="button"
          tabIndex={-1}
          data-testid="dodging-one-star-btn"
          className="dodging-one-star-btn"
          style={{
            transform: `translate(${pos.x}px, ${pos.y}px)`,
          }}
          onMouseEnter={(e) => jumpAway(e.clientX, e.clientY)}
          onPointerDown={(e) => {
            e.preventDefault();
            jumpAway(e.clientX, e.clientY);
          }}
          onTouchStart={(e) => {
            const t = e.touches?.[0];
            jumpAway(t?.clientX, t?.clientY);
          }}
          onFocus={() => jumpAway()}
          onClick={(e) => {
            e.preventDefault();
            jumpAway(e.clientX, e.clientY);
          }}
        >
          ★☆☆☆☆ Give 1 Star
        </button>
      </div>
    </div>
  );
}
