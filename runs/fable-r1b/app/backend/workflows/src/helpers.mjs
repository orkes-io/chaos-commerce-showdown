// Scripts are authored multi-line for readability and collapsed to one line in the generated JSON.
// Do not use line comments inside a script: they would swallow the rest of the collapsed line.
export const script = (strings, ...values) =>
  String.raw({ raw: strings }, ...values)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join(" ");

// Deterministic "chaos": the same order always gets the same nonsense, so retries and reruns are stable.
export const JS_HASH = `function hash(text) {
  var h = 2166136261;
  var s = String(text);
  for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  h ^= h >>> 16; h = Math.imul(h, 2246822507);
  h ^= h >>> 13; h = Math.imul(h, 3266489909);
  h ^= h >>> 16;
  return h >>> 0;
}`;

export const JQ_DEFS = `
def num(d): if type == "number" then . elif type == "string" then (try tonumber catch d) else d end;
def clamp(lo; hi): if . < lo then lo elif . > hi then hi else . end;
def text(d; n): if type == "string" and length > 0 then .[0:n] elif type == "number" then tostring else d end;
def cents: (. * 100 | round) / 100;
def obj: if type == "object" then . else {} end;
`;

export const OWNER_EMAIL = "ops@chaos-commerce.example";
