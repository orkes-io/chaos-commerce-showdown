import React, { useEffect, useState } from "react";

const CITIES = ["Toledo", "Boise", "Des Moines", "Bakersfield", "Fargo", "Scranton", "Duluth"];
const ITEMS = [
  "Artisanal Single Paperclip",
  "Left-Handed Wi-Fi Cable",
  "Smart Tactical Brick",
  "Box of Slightly Used Air",
  "Deconstructed Ice Cube",
];

export function RegretToast() {
  const [visible, setVisible] = useState(false);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const startTimer = setTimeout(() => setVisible(true), 4500);
    const interval = setInterval(() => {
      setIdx((n) => n + 1);
      setVisible(true);
    }, 18000);
    return () => {
      clearTimeout(startTimer);
      clearInterval(interval);
    };
  }, []);

  if (!visible) return null;

  const city = CITIES[idx % CITIES.length];
  const item = ITEMS[(idx * 3) % ITEMS.length];
  const secs = ((idx * 7) % 19) + 2;

  return (
    <div className="regret-toast" role="status">
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
        <span>
          😱 Someone in <strong>{city}</strong> just deeply regretted buying{" "}
          <strong>{item}</strong> {secs}s ago!
        </span>
        <button
          type="button"
          onClick={() => setVisible(false)}
          style={{
            background: "none",
            border: "none",
            fontWeight: 900,
            cursor: "pointer",
            padding: 0,
          }}
          aria-label="Dismiss regret notification"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
