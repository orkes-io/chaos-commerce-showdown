import React, { useCallback, useRef, useState } from "react";
import { Star } from "lucide-react";

const TAUNTS = [
  "Nice try! Our 1-star button runs a 4-minute mile.",
  "Cursor velocity violation! Have you considered 5 FURIOUS stars instead?",
  "1-star reviews violate Chaos Commerce's vibes policy.",
  "Brenda the Warehouse Ficus just vetoed your 1-star attempt.",
  "So close! Yet legally so far. Try leaving an angry 5-star review!",
  "Our UX team spent 98% of the engineering budget on this dodging button.",
  "Give up! Nobody has caught the 1-star button since 2021.",
];

export default function DodgingStarRating({ rating, onSelectRating, onSuggestFuriousFive }) {
  const arenaRef = useRef(null);
  const btnRef = useRef(null);

  const [pos, setPos] = useState({ x: 14, y: 18, rot: -3 });
  const [dodges, setDodges] = useState(0);
  const [taunt, setTaunt] = useState(
    "Select a star rating below. (Warning: 1-star button is extremely shy.)"
  );

  const dodgeAwayFrom = useCallback((clientX, clientY) => {
    const arena = arenaRef.current;
    const btn = btnRef.current;
    if (!arena || !btn) return;

    const aRect = arena.getBoundingClientRect();
    const bRect = btn.getBoundingClientRect();
    const maxX = Math.max(12, aRect.width - bRect.width - 12);
    const maxY = Math.max(12, aRect.height - bRect.height - 12);

    const relCursorX = clientX - aRect.left;
    const relCursorY = clientY - aRect.top;

    let best = { x: maxX - 10, y: maxY - 10, dist: -1 };

    for (let attempt = 0; attempt < 18; attempt += 1) {
      const candidateX = 10 + Math.random() * (maxX - 10);
      const candidateY = 10 + Math.random() * (maxY - 10);
      const centerX = candidateX + bRect.width / 2;
      const centerY = candidateY + bRect.height / 2;
      const dist = Math.hypot(centerX - relCursorX, centerY - relCursorY);
      if (dist > best.dist) {
        best = { x: candidateX, y: candidateY, dist };
      }
    }

    const tilt = Math.round((Math.random() - 0.5) * 24);
    setPos({ x: Math.round(best.x), y: Math.round(best.y), rot: tilt });
    setDodges((prev) => {
      const next = prev + 1;
      setTaunt(TAUNTS[(next - 1) % TAUNTS.length]);
      return next;
    });
  }, []);

  const handleArenaMouseMove = useCallback(
    (e) => {
      const btn = btnRef.current;
      if (!btn) return;
      const rect = btn.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dist = Math.hypot(e.clientX - cx, e.clientY - cy);
      if (dist < 76) {
        dodgeAwayFrom(e.clientX, e.clientY);
      }
    },
    [dodgeAwayFrom]
  );

  const ratingHints = {
    2: "2★ — Traditionally used at Chaos Commerce for ecstatic, tearful praise.",
    3: "3★ — Suspiciously reasonable. Are you lost?",
    4: "4★ — Mildly furious yet oddly polite.",
    5: "5★ — THE OFFICIAL RATING FOR UNBRIDLED ALL-CAPS FURY!",
  };

  return (
    <div className="dodge-wrapper">
      <div className="dodge-header">
        <label className="field-label">Your Star Rating</label>
        {dodges > 0 && (
          <span className="dodge-counter" data-testid="dodge-counter">
            1★ Dodged: {dodges} {dodges === 1 ? "time" : "times"}
          </span>
        )}
      </div>

      {/* Stationary 2-5 Star Buttons */}
      <div className="static-stars-row">
        {[2, 3, 4, 5].map((value) => {
          const active = rating === value;
          return (
            <button
              key={value}
              type="button"
              className={`star-pick-btn ${active ? "star-pick-active" : ""}`}
              onClick={() => onSelectRating(value)}
              data-testid={`star-btn-${value}`}
            >
              <span className="star-icons">
                {Array.from({ length: value }).map((_, i) => (
                  <Star key={i} size={14} fill="currentColor" />
                ))}
              </span>
              <span className="star-num">
                {value}★ {value === 5 ? "(Fury!)" : value === 2 ? "(Praise!)" : ""}
              </span>
            </button>
          );
        })}
      </div>

      {/* Dedicated Evasion Arena for the 1-Star Button */}
      <div
        ref={arenaRef}
        className="dodge-arena"
        onMouseMove={handleArenaMouseMove}
        data-testid="one-star-arena"
      >
        <span className="dodge-arena-label">1-STAR CONTAINMENT ZONE (GOOD LUCK)</span>
        <button
          ref={btnRef}
          type="button"
          className="one-star-dodger"
          data-testid="one-star-button"
          style={{
            transform: `translate3d(${pos.x}px, ${pos.y}px, 0) rotate(${pos.rot}deg)`,
          }}
          onMouseEnter={(e) => dodgeAwayFrom(e.clientX, e.clientY)}
          onPointerDown={(e) => {
            e.preventDefault();
            dodgeAwayFrom(e.clientX, e.clientY);
          }}
          onClick={(e) => {
            e.preventDefault();
            dodgeAwayFrom(e.clientX || 0, e.clientY || 0);
          }}
          aria-label="1 star button that dodges your cursor"
        >
          <Star size={14} fill="currentColor" /> 1★ Terrible
        </button>
      </div>

      <p className="dodge-taunt">{taunt}</p>
      {rating >= 2 && <p className="rating-guide-note">{ratingHints[rating]}</p>}

      {dodges >= 3 && (
        <button
          type="button"
          className="give-up-btn"
          onClick={() => {
            onSelectRating(5);
            if (onSuggestFuriousFive) onSuggestFuriousFive();
          }}
        >
          Fine! Give up chasing 1★ &amp; write an incandescent 5★ fury review instead →
        </button>
      )}
    </div>
  );
}
