import React, { useState } from "react";
import { api } from "../api.js";

export function CookieDoomBanner() {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  return (
    <div className="cookie-doom-banner" role="region" aria-label="Cookie notice">
      <div className="cookie-text">
        🍪 <strong>MANDATORY COOKIE CONFESSION:</strong> This site uses 14,892
        third-party tracking cookies, 3 stale oatmeal-raisin cookies, and a guy
        named Greg squinting through binoculars.
      </div>
      <div className="cookie-actions">
        <button
          type="button"
          className="cookie-btn accept"
          onClick={() => setDismissed(true)}
        >
          Accept All & Surrender Dignity
        </button>
        <button
          type="button"
          className="cookie-btn reject"
          onClick={() => setDismissed(true)}
        >
          Reject (Installs Double Cookies)
        </button>
      </div>
    </div>
  );
}

export function UnhelpfulChatWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([
    {
      from: "chad",
      text: "Ugh, hi. I'm Chad from No-Support™ (Zero-AI, 100% Pure Human Apathy). What do you want?",
    },
  ]);

  const handleSend = async (e) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) return;
    setMessages((prev) => [...prev, { from: "user", text: trimmed }]);
    setInput("");
    try {
      const res = await api.askChad(trimmed);
      setMessages((prev) => [...prev, { from: "chad", text: res.reply }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          from: "chad",
          text: "Sorry, our chat cable is 0.4 inches long and just unplugged itself.",
        },
      ]);
    }
  };

  return (
    <div className="chad-widget-anchor">
      {open && (
        <div className="chad-chat-box">
          <div className="chad-header">
            <span>🙄 Chad — Live Unhelpful Support</span>
            <button type="button" onClick={() => setOpen(false)}>
              ✕
            </button>
          </div>
          <div className="chad-messages">
            {messages.map((m, i) => (
              <div key={i} className={`chad-bubble from-${m.from}`}>
                {m.text}
              </div>
            ))}
          </div>
          <form className="chad-input-row" onSubmit={handleSend}>
            <input
              type="text"
              placeholder="Complain about prices, stars, or returns..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
            <button type="submit">Send</button>
          </form>
        </div>
      )}
      <button
        type="button"
        className="chad-launcher-btn"
        onClick={() => setOpen((v) => !v)}
      >
        💬 Need No Help? Ask Chad
      </button>
    </div>
  );
}
