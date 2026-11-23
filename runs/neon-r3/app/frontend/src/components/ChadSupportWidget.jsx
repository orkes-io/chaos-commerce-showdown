import React, { useState } from 'react';
import { sendSupportChat } from '../api';

const QUICK_PROMPTS = ['Where is my refund?', 'Promo code?', 'Why did 1★ dodge me?', 'Shipping speed?'];

export function ChadSupportWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState([
    {
      sender: 'bot',
      text: "Hi! I'm ChadGPT-0.01 (100% deterministic — zero AI APIs, just 14 proud if-statements). How can I make your day slightly worse?",
    },
  ]);

  async function ask(textToSend) {
    const clean = textToSend.trim();
    if (!clean || sending) return;
    setMessages((prev) => [...prev, { sender: 'user', text: clean }]);
    setInput('');
    setSending(true);
    try {
      const res = await sendSupportChat(clean);
      setMessages((prev) => [...prev, { sender: 'bot', text: res.reply }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { sender: 'bot', text: 'Our customer disservice desk is currently taking a 4-hour coffee break.' },
      ]);
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      {open && (
        <div className="chad-window" role="dialog" aria-label="Customer Disservice Chat">
          <div className="chad-header">
            <span>🤖 ChadGPT-0.01 (Not AI)</span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              style={{
                background: 'transparent',
                color: '#ffe600',
                border: 'none',
                fontWeight: 900,
                cursor: 'pointer',
                fontSize: '1rem',
              }}
            >
              ✕
            </button>
          </div>
          <div className="chad-messages">
            {messages.map((m, i) => (
              <div key={i} className={`chad-msg ${m.sender}`}>
                {m.text}
              </div>
            ))}
          </div>
          <div style={{ padding: '0.4rem 0.6rem', display: 'flex', gap: '0.3rem', flexWrap: 'wrap', background: '#fff' }}>
            {QUICK_PROMPTS.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => ask(q)}
                style={{
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  border: '1.5px solid #141414',
                  borderRadius: '999px',
                  background: '#fffdf5',
                  padding: '0.15rem 0.45rem',
                  cursor: 'pointer',
                }}
              >
                {q}
              </button>
            ))}
          </div>
          <form
            className="chad-input-row"
            onSubmit={(e) => {
              e.preventDefault();
              ask(input);
            }}
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Complain into the void..."
            />
            <button type="submit" className="btn btn-primary" style={{ padding: '0.35rem 0.65rem' }}>
              Send
            </button>
          </form>
        </div>
      )}

      <button type="button" className="chad-fab" onClick={() => setOpen((v) => !v)}>
        {open ? 'Hide Disservice' : '💬 Customer Disservice'}
      </button>
    </>
  );
}
