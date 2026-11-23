import { createHash, randomUUID } from 'node:crypto';

const ID_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

// Short, URL-safe id derived from a seed, so the same request always maps to the same id.
export function deriveId(prefix, seed) {
  const digest = createHash('sha256').update(String(seed)).digest();
  let id = '';
  for (let i = 0; i < 10; i += 1) id += ID_ALPHABET[digest[i] % ID_ALPHABET.length];
  return `${prefix}-${id}`;
}

export function randomKey() {
  return randomUUID();
}

// Plain single-line text: control characters removed, whitespace collapsed, length capped.
export function cleanText(value, maxLength) {
  if (typeof value !== 'string' && typeof value !== 'number') return '';
  return String(value)
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

// Ids travel in URLs and Conductor correlation ids, so only a conservative character set survives.
export function cleanId(value) {
  const text = cleanText(value, 40).toUpperCase();
  return /^[A-Z0-9][A-Z0-9-]{2,39}$/.test(text) ? text : '';
}
