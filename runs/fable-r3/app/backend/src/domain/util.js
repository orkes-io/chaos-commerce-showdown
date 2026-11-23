// Small deterministic helpers. Workers must be idempotent (Conductor may
// deliver a task twice), so all the "randomness" in the store is a hash of
// stable ids rather than Math.random().

export function hash(seed) {
  const text = String(seed);
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function pick(seed, list) {
  return list[hash(seed) % list.length];
}

// True for roughly `percent`% of seeds.
export function chance(seed, percent) {
  return hash(seed) % 100 < percent;
}

export function code(seed, length = 8) {
  const a = hash(seed).toString(16).padStart(8, "0");
  const b = hash(`${seed}#`).toString(16).padStart(8, "0");
  return (a + b).slice(0, length).toUpperCase();
}

export function money(cents) {
  const value = Number.isFinite(cents) ? cents : 0;
  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(Math.round(value));
  const dollars = Math.floor(abs / 100).toLocaleString("en-US");
  return `${sign}$${dollars}.${String(abs % 100).padStart(2, "0")}`;
}

// Free text from shoppers ends up in workflow input and on screen. Keep it to
// one short printable line.
export function cleanText(value, maxLength = 80) {
  if (typeof value !== "string" && typeof value !== "number") return "";
  return String(value)
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

export function clampInt(value, min, max, fallback) {
  const n = typeof value === "string" && value.trim() !== "" ? Number(value) : value;
  if (typeof n !== "number" || !Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(n)));
}

export function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
