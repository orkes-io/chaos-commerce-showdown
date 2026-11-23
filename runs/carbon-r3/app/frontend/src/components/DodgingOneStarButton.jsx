import React, { useRef, useState } from "react";
import { api } from "../api.js";

const TAUNTS = [
  "Nice try! 1★ has 99 Agility!",
  "1★ is currently out to lunch!",
  "Whoa! Almost clicked 1★! Try 5★ of pure fury instead!",
  "Our lawyers greased the 1★ button!",
  "Too slow! Have you considered 2★ of tearful praise?",
  "1★ dodged! Cardio powered by angry customers!",
  "Error 418: 1★ refuses to perceive negativity!",
  "Teleporting away from accountability..."
];

export default function DodgingOneStarButton({
  selectedRating,
  onSelectRating,
  globalDodges = 0,
  onDodgeIncrement,
  compact = false
}) {
  const arenaRef = useRef(null);
  const btnRef = useRef(null);
  const [pos, setPos] = useState({ left: 16, top: 48 });
  const [localDodges, setLocalDodges] = useState(0);
  const [taunt, setTaunt] = useState(
    "Go ahead, try clicking 1★ (Terrible). We dare you."
  );

  function fleeFromPoint(clientX, clientY, reasonText) {
    const arena = arenaRef.current;
    const btn = btnRef.current;
    if (!arena || !btn) return;

    const rect = arena.getBoundingClientRect();
    const btnW = btn.offsetWidth || 128;
    const btnH = btn.offsetHeight || 38;
    const pad = 10;

    const maxLeft = Math.max(pad, rect.width - btnW - pad);
    const maxTop = Math.max(42, rect.height - btnH - 54);

    const relX = clientX - rect.left;
    const relY = clientY - rect.top;

    // Pick candidate spots far from cursor so it never gets trapped in a corner
    let bestCandidate = { left: pad, top: 44, dist: -1 };
    for (let i = 0; i < 10; i += 1) {
      const candLeft = pad + Math.random() * Math.max(1, maxLeft - pad);
      const candTop = 42 + Math.random() * Math.max(1, maxTop - 42);
      const cx = candLeft + btnW / 2;
      const cy = candTop + btnH / 2;
      const dist = Math.hypot(cx - relX, cy - relY);
      if (dist > bestCandidate.dist) {
        bestCandidate = { left: Math.round(candLeft), top: Math.round(candTop), dist };
      }
    }

    setPos({ left: bestCandidate.left, top: bestCandidate.top });
    setLocalDodges((prev) => {
      const next = prev + 1;
      setTaunt(reasonText || TAUNTS[next % TAUNTS.length]);
      return next;
    });

    if (onDodgeIncrement) {
      onDodgeIncrement();
    }
    api.recordOneStarDodge(1).catch(() => {});
  }

  function handleArenaMouseMove(e) {
    const arena = arenaRef.current;
    const btn = btnRef.current;
    if (!arena || !btn) return;

    const btnRect = btn.getBoundingClientRect();
    const centerX = btnRect.left + btnRect.width / 2;
    const centerY = btnRect.top + btnRect.height / 2;
    const distance = Math.hypot(e.clientX - centerX, e.clientY - centerY);

    if (distance < 88) {
      fleeFromPoint(e.clientX, e.clientY);
    }
  }

  function handleKeyboardIntercept(e) {
    e.preventDefault();
    const rect = arenaRef.current?.getBoundingClientRect();
    fleeFromPoint(
      (rect?.left || 0) + 50,
      (rect?.top || 0) + 50,
      "Keyboard shortcut intercepted by CEO's cat! Auto-selected 5★ (Furious)!"
    );
    if (onSelectRating) {
      onSelectRating(5);
    }
  }

  const ratingButtons = [
    { stars: 2, label: "2★ (Pure Bliss!)" },
    { stars: 3, label: "3★ (Baffled)" },
    { stars: 4, label: "4★ (Seething)" },
    { stars: 5, label: "5★ (Furious Rage!)" }
  ];

  return (
    <div
      ref={arenaRef}
      className="dodge-arena"
      style={compact ? { minHeight: "175px" } : undefined}
      onMouseMove={handleArenaMouseMove}
      data-testid="one-star-dodge-arena"
    >
      <div className="dodge-arena-header">
        <span className="dodge-taunt">{taunt}</span>
        <span
          style={{
            fontFamily: "var(--mono)",
            fontSize: "0.74rem",
            fontWeight: 800,
            background: "#fff",
            border: "1.5px solid var(--border)",
            padding: "0.18rem 0.45rem"
          }}
        >
          1★ Dodges: {globalDodges + localDodges}
        </span>
      </div>

      <button
        ref={btnRef}
        type="button"
        tabIndex={-1}
        className="dodging-one-star-btn"
        style={{ left: `${pos.left}px`, top: `${pos.top}px` }}
        onMouseEnter={(e) => fleeFromPoint(e.clientX, e.clientY)}
        onPointerDown={(e) => {
          e.preventDefault();
          fleeFromPoint(e.clientX, e.clientY);
        }}
        onFocus={handleKeyboardIntercept}
        onClick={handleKeyboardIntercept}
        data-testid="dodging-one-star-button"
      >
        ★☆☆☆☆ 1★ (HATE IT)
      </button>

      <div className="static-stars-row">
        {ratingButtons.map((opt) => {
          const isSelected = Number(selectedRating) === opt.stars;
          return (
            <button
              key={opt.stars}
              type="button"
              className={`btn btn-sm ${
                isSelected
                  ? opt.stars === 5
                    ? "btn-primary"
                    : "btn-active"
                  : ""
              }`}
              onClick={() => onSelectRating && onSelectRating(opt.stars)}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
