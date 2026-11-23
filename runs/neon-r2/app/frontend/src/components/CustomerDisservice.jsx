import React, { useState } from "react";
import { MessageCircleOff, Send, X } from "lucide-react";
import { api } from "../api.js";

const LOCAL_FALLBACK_REPLIES = [
  "Thank you for reaching out! Your message has been printed and immediately shredded.",
  "Have you tried lowering your expectations to absolute zero?",
  "Our Customer Disservice desk is currently closed for a 4-year lunch break.",
];

export default function CustomerDisservice() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([
    {
      sender: "bot",
      text: "Welcome to Chaos Customer Disservice! I am ChazBot 0.01 (100% scripted spite, 0% AI). How can we ignore you today?",
    },
  ]);

  const handleSend = async (e) => {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;
    setInput("");
    setMessages((prev) => [...prev, { sender: "user", text }]);

    try {
      const res = await api.askDisservice(text);
      setMessages((prev) => [...prev, { sender: "bot", text: res.reply }]);
    } catch {
      const fallback = LOCAL_FALLBACK_REPLIES[text.length % LOCAL_FALLBACK_REPLIES.length];
      setMessages((prev) => [...prev, { sender: "bot", text: fallback }]);
    }
  };

  return (
    <div className="disservice-root">
      {!open && (
        <button
          type="button"
          className="disservice-fab"
          onClick={() => setOpen(true)}
          aria-label="Open Customer Disservice"
        >
          <MessageCircleOff size={18} /> Need Help? Too Bad!
        </button>
      )}

      {open && (
        <div className="disservice-panel">
          <div className="disservice-head">
            <div>
              <strong>Customer Disservice</strong>
              <span>Avg. Wait Time: 14 Years</span>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close Disservice">
              <X size={16} />
            </button>
          </div>

          <div className="disservice-log">
            {messages.map((m, idx) => (
              <div key={idx} className={`chat-bubble chat-${m.sender}`}>
                {m.text}
              </div>
            ))}
          </div>

          <form onSubmit={handleSend} className="disservice-form">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Complain into the void..."
            />
            <button type="submit" aria-label="Send complaint">
              <Send size={15} />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
