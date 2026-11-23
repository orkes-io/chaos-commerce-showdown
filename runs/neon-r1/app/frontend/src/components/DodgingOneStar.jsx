import React, { useRef, useState, useCallback } from "react";

const TAUNTS = [
  "NICE TRY! Nobody gives us 1 star!",
  "TOO SLOW! Have you considered 5 furious stars instead?",
  "WHOA! Almost had it! (Not really.)",
  "LEGAL DEPT SAYS: 1-star ratings are deprecated.",
  "MISSED ME! Try 2 stars if you loved it!",
  "DODGE STREAK UNLOCKED! Still 0% chance of clicking this.",
  "OUR CEO IS WATCHING. Pick 5 stars and scream in the comments!",
  "ERROR 418: Button has developed self-preservation instincts.",
];

export function DodgingOneStar({
  selectedRating,
  onSelectRating,
  onDodge,
  compact = false,
}) {
  const arenaRef = useRef(null);
  const btnRef = useRef(null);
  const [pos, setPos] = useState({ left: 12, top: 68, tilt: 0 });
  const [dodges, setDodges] = useState(0);
  const [taunt, setTaunt] = useState(
    "Go ahead, try clicking ★ 1 Star. We dare you."
  );

  const dodgeAway = useCallback(
    (pointerX, pointerY) => {
      const arena = arenaRef.current;
      const btn = btnRef.current;
      if (!arena || !btn) return;

      const aRect = arena.getBoundingClientRect();
      const bRect = btn.getBoundingClientRect();
      const maxLeft = Math.max(12, aRect.width - bRect.width - 12);
      const maxTop = Math.max(58, aRect.height - bRect.height - 10);
      const minTop = 56; // keep clear of the 2-5 star row on top

      let bestLeft = 12;
      let bestTop = minTop;
      let bestDist = -1;

      // Sample 10 candidate spots and pick the one furthest from the cursor
      for (let i = 0; i < 10; i++) {
        const candLeft = 10 + Math.random() * Math.max(1, maxLeft - 10);
        const candTop = minTop + Math.random() * Math.max(1, maxTop - minTop);
        if (typeof pointerX === "number" && typeof pointerY === "number") {
          const cx = aRect.left + candLeft + bRect.width / 2;
          const cy = aRect.top + candTop + bRect.height / 2;
          const dist = Math.hypot(cx - pointerX, cy - pointerY);
          if (dist > bestDist) {
            bestDist = dist;
            bestLeft = candLeft;
            bestTop = candTop;
          }
        } else {
          bestLeft = candLeft;
          bestTop = candTop;
          break;
        }
      }

      const nextCount = dodges + 1;
      setDodges(nextCount);
      setPos({
        left: Math.round(bestLeft),
        top: Math.round(bestTop),
        tilt: (Math.random() > 0.5 ? 1 : -1) * (4 + Math.floor(Math.random() * 10)),
      });
      setTaunt(TAUNTS[(nextCount - 1) % TAUNTS.length]);
      if (onDodge) onDodge(nextCount);
    },
    [dodges, onDodge]
  );

  const handleArenaPointerMove = (e) => {
    const btn = btnRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dist = Math.hypot(e.clientX - cx, e.clientY - cy);
    if (dist < 68) {
      dodgeAway(e.clientX, e.clientY);
    }
  };

  const starChoices = [
    { value: 2, label: "★★ 2 Stars (Pure Bliss)", cls: "two-star-good" },
    { value: 3, label: "★★★ 3 Stars", cls: "" },
    { value: 4, label: "★★★★ 4 Stars", cls: "" },
    { value: 5, label: "★★★★★ 5 Stars (Furious Rage!)", cls: "five-star-rage" },
  ];

  return (
    <div>
      <div
        ref={arenaRef}
        className="dodge-arena"
        style={{ minHeight: compact ? 128 : 148 }}
        onMouseMove={handleArenaPointerMove}
      >
        <div className="star-row">
          {starChoices.map((s) => (
            <button
              key={s.value}
              type="button"
              className={`star-btn ${s.cls} ${selectedRating === s.value ? "selected" : ""}`}
              onClick={() => onSelectRating && onSelectRating(s.value)}
            >
              {s.label}
            </button>
          ))}
        </div>

        <button
          ref={btnRef}
          type="button"
          className="dodging-one-star"
          aria-label="1 Star rating button (dodges cursor)"
          style={{
            left: `${pos.left}px`,
            top: `${pos.top}px`,
            transform: `rotate(${pos.tilt}deg)`,
          }}
          onMouseEnter={(e) => dodgeAway(e.clientX, e.clientY)}
          onPointerDown={(e) => {
            e.preventDefault();
            dodgeAway(e.clientX, e.clientY);
          }}
          onFocus={() => dodgeAway()}
          onClick={(e) => {
            e.preventDefault();
            dodgeAway(e.clientX, e.clientY);
          }}
        >
          ★ 1 Star {dodges > 0 ? `(Dodged ${dodges}×)` : ""}
        </button>
      </div>

      <div className="dodge-taunt" role="status">
        {taunt}
      </div>
    </div>
  );
}
