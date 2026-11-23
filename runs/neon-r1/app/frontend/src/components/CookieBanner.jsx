import React, { useState } from "react";

export function CookieBanner() {
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem("chaos_cookies_ok") === "1"
  );

  if (dismissed) return null;

  const accept = () => {
    localStorage.setItem("chaos_cookies_ok", "1");
    setDismissed(true);
  };

  return (
    <div className="cookie-banner" role="region" aria-label="Cookie consent parody">
      <span>
        🍪 We use <strong>4,218 cookies</strong>, mostly stale oatmeal raisin, to track your
        regret and move the 1-star button faster.
      </span>
      <div style={{ display: "flex", gap: 8 }}>
        <button type="button" className="btn btn-sm btn-dark" onClick={accept}>
          Accept All
        </button>
        <button type="button" className="btn btn-sm btn-primary" onClick={accept}>
          Accept All (Slightly Angrier)
        </button>
      </div>
    </div>
  );
}
