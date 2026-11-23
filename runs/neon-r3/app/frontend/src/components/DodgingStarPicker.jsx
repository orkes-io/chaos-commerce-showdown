import React, { useRef, useState } from 'react';

const TAUNTS = [
  'Nice try! That 1★ button has legs.',
  'Oops! Our 1★ button is out of office.',
  'Have you considered an incandescently furious 5★ review instead?',
  'Cardio is good for your wrist! Keep chasing!',
  'Our CEO personally greased the 1★ button.',
  'Error 418: Cannot accept constructive criticism.',
  'So close! Yet legally unreachable.',
];

export function DodgingStarPicker({ value, onChange, onDodgeCountChange }) {
  const arenaRef = useRef(null);
  const btnRef = useRef(null);
  const [pos, setPos] = useState({ left: 14, top: 68 });
  const [dodges, setDodges] = useState(0);
  const [rotation, setRotation] = useState(0);

  function fleeFrom(pointerX, pointerY) {
    const arena = arenaRef.current;
    const btn = btnRef.current;
    if (!arena || !btn) return;

    const aRect = arena.getBoundingClientRect();
    const bRect = btn.getBoundingClientRect();
    const maxLeft = Math.max(10, aRect.width - bRect.width - 14);
    const maxTop = Math.max(54, aRect.height - bRect.height - 12);

    // Pick a candidate spot far from the pointer inside the arena
    let bestLeft = 14;
    let bestTop = 68;
    let bestDist = -1;

    for (let i = 0; i < 10; i++) {
      const candLeft = 10 + Math.random() * (maxLeft - 10);
      const candTop = 54 + Math.random() * Math.max(1, maxTop - 54);
      const cx = aRect.left + candLeft + bRect.width / 2;
      const cy = aRect.top + candTop + bRect.height / 2;
      const dist = Math.hypot(cx - pointerX, cy - pointerY);
      if (dist > bestDist) {
        bestDist = dist;
        bestLeft = candLeft;
        bestTop = candTop;
      }
    }

    setPos({ left: Math.round(bestLeft), top: Math.round(bestTop) });
    setRotation((Math.random() - 0.5) * 22);
    setDodges((prev) => {
      const next = prev + 1;
      onDodgeCountChange?.(next);
      return next;
    });
  }

  function handleArenaMouseMove(e) {
    const btn = btnRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const distance = Math.hypot(e.clientX - cx, e.clientY - cy);
    if (distance < 68) {
      fleeFrom(e.clientX, e.clientY);
    }
  }

  function handleOneStarDodge(e) {
    e.preventDefault();
    e.stopPropagation();
    const rect = btnRef.current?.getBoundingClientRect();
    const px = e.clientX || (rect ? rect.left + rect.width / 2 : 0);
    const py = e.clientY || (rect ? rect.top + rect.height / 2 : 0);
    fleeFrom(px, py);
  }

  const taunt = dodges > 0 ? TAUNTS[(dodges - 1) % TAUNTS.length] : 'Choose your rating (1★ button is shy):';

  return (
    <div
      ref={arenaRef}
      className="dodge-arena"
      onMouseMove={handleArenaMouseMove}
      data-testid="dodge-star-arena"
    >
      <div className="static-stars-row">
        {[2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            className={`star-choice-btn ${value === star ? 'selected' : ''}`}
            onClick={() => onChange(star)}
          >
            {'★'.repeat(star)}
            {'☆'.repeat(5 - star)}{' '}
            {star === 5 ? '(Fury Mode)' : star === 2 ? '(Glowing Praise)' : `${star}★`}
          </button>
        ))}
      </div>

      <button
        ref={btnRef}
        type="button"
        className="dodging-one-star"
        data-testid="dodging-one-star-btn"
        style={{
          left: `${pos.left}px`,
          top: `${pos.top}px`,
          transform: `rotate(${rotation}deg)`,
        }}
        onMouseEnter={handleOneStarDodge}
        onPointerEnter={handleOneStarDodge}
        onMouseDown={handleOneStarDodge}
        onClick={handleOneStarDodge}
        onFocus={handleOneStarDodge}
        aria-label="1 star rating (dodges your cursor)"
      >
        ★☆☆☆☆ 1 Star {dodges > 2 ? '🏃💨' : ''}
      </button>

      <div className="dodge-taunt" style={{ marginTop: '3.2rem' }}>
        {taunt}
        {dodges > 0 ? ` [Dodged ${dodges}x]` : ''}
      </div>
    </div>
  );
}
