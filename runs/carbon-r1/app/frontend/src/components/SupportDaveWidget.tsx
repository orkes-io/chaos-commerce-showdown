import React, { useState } from "react";

const CANNED_DAVE_REPLIES = [
  "Hi! I'm Dave (100% deterministic scripts, 0% AI, 0% effort). Have you tried lowering your standards?",
  "Your complaint has been lovingly printed and fed directly into Warehouse Shredder #2.",
  "Great question! Unfortunately, our answer database is locked inside a 2004 Honda Civic.",
  "If your HDMI-to-Garden-Hose Adapter is leaking koi fish, that means HDCP 2.3 handshake succeeded!",
  "To request a manager, please apply promo code MANAGER at checkout (+$49.99 surcharge).",
  "I am currently on my 7th lunch break. Please stare at your item for 14 seconds instead."
];

export const SupportDaveWidget: React.FC = () => {
  const [cookieDismissed, setCookieDismissed] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState<Array<{ from: "dave" | "you"; text: string }>>([
    {
      from: "dave",
      text: "👋 Dave from Support here (Currently Napping Since Tuesday, zero AI APIs used). What seems to be your crisis?"
    }
  ]);
  const [draft, setDraft] = useState("");
  const [replyIdx, setReplyIdx] = useState(0);

  const sendMsg = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.trim()) return;
    const userText = draft.trim();
    const reply = CANNED_DAVE_REPLIES[replyIdx % CANNED_DAVE_REPLIES.length];
    setReplyIdx((i) => i + 1);
    setDraft("");
    setMessages((prev) => [
      ...prev,
      { from: "you", text: userText },
      { from: "dave", text: reply }
    ]);
  };

  return (
    <>
      {!cookieDismissed && (
        <div className="cookie-bar">
          <div style={{ fontWeight: 800, color: "var(--neon-yellow)", marginBottom: "0.25rem" }}>
            🍪 Mandatory Artisanal Cookie Disclosure
          </div>
          <p style={{ margin: "0 0 0.55rem 0", color: "var(--text-muted)" }}>
            We use 14,000 tracking cookies, 3 stale fortune cookies, and half an oatmeal raisin
            we dropped behind the Conductor server rack.
          </p>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <button
              type="button"
              className="btn-primary"
              style={{ padding: "0.35rem 0.7rem", fontSize: "0.76rem" }}
              onClick={() => setCookieDismissed(true)}
            >
              Accept All 14,004
            </button>
            <button
              type="button"
              className="btn-secondary"
              style={{ padding: "0.35rem 0.7rem", fontSize: "0.76rem" }}
              onClick={() => setCookieDismissed(true)}
            >
              Accept Double (28,008)
            </button>
          </div>
        </div>
      )}

      <div className="dave-widget">
        {chatOpen ? (
          <div
            style={{
              width: 320,
              background: "#181229",
              border: "2px solid var(--neon-cyan)",
              borderRadius: 16,
              padding: "0.85rem",
              boxShadow: "0 16px 40px rgba(0,0,0,0.7)"
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "0.55rem"
              }}
            >
              <strong style={{ fontSize: "0.86rem", color: "var(--neon-cyan)" }}>
                💤 Unhelpful Dave (Live-ish)
              </strong>
              <button
                type="button"
                className="close-x"
                style={{ width: 28, height: 28, fontSize: "0.85rem" }}
                onClick={() => setChatOpen(false)}
              >
                ✕
              </button>
            </div>

            <div
              style={{
                maxHeight: 200,
                overflowY: "auto",
                display: "flex",
                flexDirection: "column",
                gap: "0.45rem",
                marginBottom: "0.6rem",
                fontSize: "0.8rem"
              }}
            >
              {messages.map((m, i) => (
                <div
                  key={i}
                  style={{
                    alignSelf: m.from === "you" ? "flex-end" : "flex-start",
                    background: m.from === "you" ? "#341e54" : "#100c1c",
                    border: "1px solid #352957",
                    borderRadius: 10,
                    padding: "0.45rem 0.65rem",
                    maxWidth: "88%"
                  }}
                >
                  {m.text}
                </div>
              ))}
            </div>

            <form onSubmit={sendMsg} style={{ display: "flex", gap: "0.4rem" }}>
              <input
                className="input-control"
                style={{ flex: 1, padding: "0.4rem 0.6rem", fontSize: "0.8rem" }}
                placeholder="Complain to Dave..."
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
              />
              <button
                type="submit"
                className="btn-primary"
                style={{ padding: "0.4rem 0.7rem", fontSize: "0.8rem" }}
              >
                Yell
              </button>
            </form>
          </div>
        ) : (
          <button
            type="button"
            className="btn-secondary"
            style={{
              borderRadius: 999,
              padding: "0.65rem 1rem",
              borderColor: "var(--neon-cyan)",
              boxShadow: "0 8px 24px rgba(0,0,0,0.5)"
            }}
            onClick={() => setChatOpen(true)}
          >
            💬 Ask Support Dave (Napping)
          </button>
        )}
      </div>
    </>
  );
};
