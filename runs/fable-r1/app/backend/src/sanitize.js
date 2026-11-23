// Request bodies come from the internet. Everything that reaches a workflow goes
// through these first, so workflow input always has the types the workflows expect.

const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]+/g;

export const text = (value, maxLength) => {
  if (typeof value !== "string" && typeof value !== "number") return "";
  return String(value).replace(CONTROL_CHARACTERS, " ").trim().slice(0, maxLength);
};

export const quantity = (value) => {
  const parsed = Math.floor(Number(value));
  if (!Number.isFinite(parsed)) return 1;
  return Math.min(99, Math.max(1, parsed));
};

// Client-supplied idempotency keys (checkoutId / returnId).
export const idempotencyKey = (value) =>
  typeof value === "string" && /^[A-Za-z0-9_-]{8,64}$/.test(value) ? value : null;

// Conductor execution ids are UUIDs. Checked before an id is put in a Conductor URL.
export const isExecutionId = (value) => typeof value === "string" && /^[A-Za-z0-9-]{8,64}$/.test(value);

export const record = (value) => (value !== null && typeof value === "object" && !Array.isArray(value) ? value : {});

// FNV-1a, folded into a non-negative 31-bit integer. Workflows derive every "random"
// outcome from this seed, which makes each order and return reproducible.
export const seedFrom = (key) => {
  let hash = 0x811c9dc5;
  for (let index = 0; index < key.length; index += 1) {
    hash ^= key.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0) % 2147483647;
};
