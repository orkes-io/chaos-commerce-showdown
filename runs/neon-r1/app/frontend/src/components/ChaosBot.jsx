import React, { useState } from "react";

// 100% deterministic, 0% AI API calls at runtime!
const UNHELPFUL_REPLIES = [
  "Have you tried buying two of them so the first one isn't lonely?",
  "Our support team is currently stuck in a revolving door. Please remain mildly inconvenienced.",
  "Great question! Unfortunately, answering that requires a $49.99 Answer Curiosity Fee.",
  "According to our records, your issue is actually a 'Limited Edition Feature.'",
  "If you're looking for the 1-star button, it's been training for a marathon and cannot be caught.",
  "Try promo code SAVE50 at checkout! It saves US fifty dollars!",
  "For returns, please visit the Returns Maze and prepare to report the current phase of the moon.",
];

export function ChaosBot() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([
    {
      from: "bot",
      text: "Hi! I'm CHAOS-BOT 3000 (Certified 0% AI, 100% Hardcoded Unhelpfulness). How can I make your shopping trip worse?",
    },
  ]);

  const send = (e) => {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;
    const idx =
      (text.length + messages.length) % UNHELPFUL_REPLIES.length;
    setMessages((prev) => [
      ...prev,
      { from: "user", text },
      { from: "bot", text: UNHELPFUL_REPLIES[idx] },
    ]);
    setInput("");
  };

  return (
    <>
      {open && (
        <div className="chatbot-window" role="dialog" aria-label="ChaosBot Support">
          <div className="chatbot-head">
            <span>🤖 CHAOS-BOT 3000 (0% AI)</span>
            <button
              type="button"
              className="btn btn-sm"
              style={{ padding: "2px 8px" }}
              onClick={() => setOpen(false)}
            >
              ✕
            </button>
          </div>
          <div className="chatbot-msgs">
            {messages.map((m, i) => (
              <div key={i} className={`chat-bubble ${m.from}`}>
                {m.text}
              </div>
            ))}
          </div>
          <form
            onSubmit={send}
            style={{ display: "flex", gap: 6, padding: 8, borderTop: "2px solid #111" }}
          >
            <input
              className="input"
              style={{ flex: 1, padding: "6px 8px", fontSize: "0.82rem" }}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Complain here..."
            />
            <button type="submit" className="btn btn-yellow btn-sm">
              Send
            </button>
          </form>
        </div>
      )}

      <button
        type="button"
        className="btn btn-dark chatbot-fab"
        onClick={() => setOpen((o) => !o)}
      >
        🤖 {open ? "Hide" : "Unhelpful Support (0% AI)"}
      </button>
    </>
  );
}
