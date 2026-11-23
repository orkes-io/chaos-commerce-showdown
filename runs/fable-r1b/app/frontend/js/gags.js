// The jokes that are not load-bearing: cookie banner, "live" chat, rotating tagline, and the one-star
// button that runs away. Every line of copy here is canned; nothing is generated or fetched at runtime.
import { h, store, toast } from "./lib.js";

const TAGLINES = [
  "Somehow still in business since last Tuesday",
  "Prices so high they need oxygen",
  "Your satisfaction is technically possible",
  "We put the 'custom' in 'customer', then lost it",
  "Now accepting IOUs (involuntarily)",
];

export function startTagline() {
  const el = document.getElementById("tagline");
  let i = 0;
  setInterval(() => {
    i = (i + 1) % TAGLINES.length;
    el.textContent = TAGLINES[i];
  }, 6000);
}

export function startVisitorCounter() {
  const el = document.getElementById("visitor-count");
  const visits = (Number(store.get("visits", 1)) || 1) + 1;
  store.set("visits", visits);
  // The counter goes down. Nobody has been able to explain why.
  el.textContent = String(Math.max(2, 9 - visits)).padStart(7, "0");
}

export function showCookieBanner() {
  if (store.get("cookies", false)) return startChat();
  const dismiss = (message) => {
    store.set("cookies", true);
    banner.remove();
    toast(message);
    startChat();
  };
  const banner = h(
    "div",
    { class: "cookie", role: "dialog", "aria-label": "Cookie notice" },
    h("strong", {}, "We use cookies."),
    h("p", { class: "small" }, "Not on the website. We are just eating them. We wanted you to know."),
    h(
      "div",
      { class: "actions" },
      h("button", { class: "btn btn--small", type: "button", onclick: () => dismiss("Thank you. They are oatmeal raisin. We regret everything.") }, "Accept"),
      h("button", { class: "btn btn--small btn--plain", type: "button", onclick: () => dismiss("ACCEPTED, LOUDLY.") }, "Accept (louder)"),
    ),
  );
  document.body.append(banner);
}

const CHAT_REPLIES = [
  "Thank you for contacting Chaos Commerce. Your message is important to us. It has been printed and placed in a drawer.",
  "Have you tried buying more things?",
  "I understand completely. Unfortunately, understanding is all I am authorised to do.",
  "Let me transfer you to a specialist. (I am the specialist. Hello again.)",
  "Our records show you are satisfied. Please update your feelings accordingly.",
  "That sounds like a job for the Returns department. They are on the Returns page, behind several forms.",
  "I have escalated this to Kevin. Kevin is at lunch. Kevin is always at lunch.",
];

function startChat() {
  let open = false;
  let replies = 0;
  const log = h("div", { class: "chat__log", "aria-live": "polite" }, h("p", {}, "Agent Kevin: Hi! This chat is a pre-written script, not an AI. How can I not help you today?"));
  const input = h("input", { type: "text", "aria-label": "Chat message", placeholder: "Type your complaint", maxlength: "200" });
  const form = h(
    "form",
    {
      onsubmit: (event) => {
        event.preventDefault();
        const text = input.value.trim();
        if (!text) return;
        log.append(h("p", { class: "me" }, text));
        input.value = "";
        const reply = CHAT_REPLIES[replies++ % CHAT_REPLIES.length];
        setTimeout(() => {
          log.append(h("p", {}, "Agent Kevin: " + reply));
          log.scrollTop = log.scrollHeight;
        }, 700);
      },
    },
    input,
    h("button", { class: "btn btn--small", type: "submit" }, "Send"),
  );
  const box = h("div", { class: "chat__box", hidden: true }, log, form);
  const toggle = h(
    "button",
    {
      class: "btn btn--small btn--cyan chat__toggle",
      type: "button",
      "aria-expanded": "false",
      onclick: () => {
        open = !open;
        box.hidden = !open;
        toggle.setAttribute("aria-expanded", String(open));
        toggle.textContent = open ? "Close chat (they won't notice)" : "Live chat (agents asleep)";
        if (open) input.focus();
      },
    },
    "Live chat (agents asleep)",
  );
  document.body.append(h("div", { class: "chat" }, toggle, box));
}

// ---- the star picker --------------------------------------------------------------------------------------
// Stars 2-5 behave. The one-star button teleports away whenever the pointer gets close, refuses keyboard
// focus, and if something clicks it anyway (a script, a very fast finger) the rating is "rounded up".

const TAUNTS = [
  "Too slow.",
  "One star is out of stock.",
  "Have you considered five stars?",
  "The one-star button is on a break.",
  "Nice try. Our lawyers are faster.",
];

export function starPicker(onChange) {
  let rating = 0;
  let taunts = 0;
  const arena = h("div", { class: "star-arena", "data-testid": "star-arena" });
  const buttons = new Map();

  const select = (stars) => {
    rating = stars;
    for (const [value, button] of buttons) button.setAttribute("aria-pressed", String(value === stars));
    onChange(stars);
  };

  const row = h("div", { class: "star-row" });
  for (const stars of [2, 3, 4, 5]) {
    const button = h(
      "button",
      { class: "star-btn", type: "button", "aria-pressed": "false", "data-stars": stars, onclick: () => select(stars) },
      `${"★".repeat(stars)} ${stars} stars`,
    );
    buttons.set(stars, button);
    row.append(button);
  }
  arena.append(row);

  const coward = h(
    "button",
    {
      class: "star-btn star-btn--coward",
      type: "button",
      id: "one-star",
      "data-testid": "one-star",
      "data-stars": 1,
      tabindex: "-1",
      "aria-label": "1 star (this button will run away from you)",
      style: "left:8px;top:8px",
    },
    "★ 1 star",
  );
  arena.append(coward);

  const flee = (pointerX, pointerY) => {
    const area = arena.getBoundingClientRect();
    const me = coward.getBoundingClientRect();
    const maxX = Math.max(0, area.width - me.width - 8);
    const maxY = Math.max(0, area.height - me.height - 8);
    // Try a handful of random spots and keep the one furthest from the pointer.
    let best = null;
    for (let i = 0; i < 12; i++) {
      const x = 4 + Math.random() * maxX;
      const y = 4 + Math.random() * maxY;
      const distance = Math.hypot(area.left + x + me.width / 2 - pointerX, area.top + y + me.height / 2 - pointerY);
      if (!best || distance > best.distance) best = { x, y, distance };
    }
    coward.style.left = `${best.x}px`;
    coward.style.top = `${best.y}px`;
    coward.classList.remove("flash");
    void coward.offsetWidth;
    coward.classList.add("flash");
    arena.dataset.dodges = String((Number(arena.dataset.dodges) || 0) + 1);
    if (++taunts % 4 === 0) toast(TAUNTS[(taunts / 4 - 1) % TAUNTS.length], 2000);
  };

  const tooClose = (x, y) => {
    const me = coward.getBoundingClientRect();
    const dx = Math.max(me.left - x, 0, x - me.right);
    const dy = Math.max(me.top - y, 0, y - me.bottom);
    return Math.hypot(dx, dy) < 70;
  };

  const onPointer = (event) => {
    if (!arena.isConnected) return document.removeEventListener("pointermove", onPointer);
    if (tooClose(event.clientX, event.clientY)) flee(event.clientX, event.clientY);
  };
  document.addEventListener("pointermove", onPointer, { passive: true });

  // Touch and pen: a tap begins with pointerdown, which is our cue to leave.
  coward.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    flee(event.clientX, event.clientY);
  });
  coward.addEventListener("focus", () => {
    const area = arena.getBoundingClientRect();
    flee(area.left, area.top);
    buttons.get(2).focus();
  });
  coward.addEventListener("click", (event) => {
    event.preventDefault();
    toast("One-star ratings are rounded up to five for your convenience.");
    select(5);
  });

  const reset = () => {
    rating = 0;
    for (const button of buttons.values()) button.setAttribute("aria-pressed", "false");
  };
  return { element: arena, reset, get rating() { return rating; } };
}
