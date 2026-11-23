// Product "photography". Drawn in-house, in a hurry, as inline SVG so the store needs no image files,
// no emoji font and no network. These strings are static and trusted; nothing dynamic is injected.
const INK = "#2b0a3d";
const base = `fill="none" stroke="${INK}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"`;

const ART = {
  battery: `<rect x="30" y="22" width="40" height="64" rx="5" fill="#b6ff3c" ${base}/><rect x="42" y="12" width="16" height="10" fill="${INK}"/><path d="M40 48h6M54 48h6M40 68q10-10 20 0" ${base}/><path d="M36 80h28" stroke="#d1001f" stroke-width="5"/>`,
  "left-sock": `<path d="M40 10h24v42l18 16q8 10-2 18t-22 2L40 66z" fill="#ff3fa4" ${base}/><path d="M40 22h24" ${base}/><path d="M12 30l10 8M12 46h12" ${base}/>`,
  "wifi-rock": `<path d="M18 84l8-26 22-14 26 8 12 22-6 12z" fill="#b9b3c2" ${base}/><path d="M36 30q14-14 28 0M28 20q22-22 44 0" ${base}/><circle cx="50" cy="38" r="3" fill="${INK}"/>`,
  "air-jar": `<rect x="30" y="10" width="40" height="12" fill="#ff3fa4" ${base}/><path d="M28 22h44v6q8 6 8 16v36q0 8-8 8H28q-8 0-8-8V44q0-10 8-16z" fill="#e9fbff" ${base}/><path d="M34 52h8M52 66h10M40 78h6" stroke="#2fe6ff" stroke-width="3" stroke-linecap="round"/>`,
  "usb-cable": `<rect x="10" y="38" width="26" height="24" fill="#2fe6ff" ${base}/><rect x="16" y="45" width="5" height="4" fill="${INK}"/><rect x="25" y="45" width="5" height="4" fill="${INK}"/><path d="M36 50q12-24 22 0t22 0" ${base}/><path d="M80 50l10-8M80 50l12 2M80 50l8 10" ${base}/>`,
  "mystery-box": `<rect x="14" y="20" width="72" height="66" fill="#f0c27a" ${base}/><path d="M14 20l14-10h44l14 10" ${base}/><rect x="36" y="44" width="28" height="26" fill="#fff36b" ${base}/><path d="M50 50v8M50 63v1" ${base}/>`,
  ladder: `<g transform="rotate(78 50 50)"><path d="M36 8v84M64 8v84M36 22h28M36 38h28M36 54h28M36 70h28M36 86h28" ${base}/></g><path d="M10 88h80" stroke="#d1001f" stroke-width="3" stroke-dasharray="6 6"/>`,
  "nothing-sub": `<rect x="14" y="26" width="72" height="48" rx="6" stroke="${INK}" stroke-width="4" stroke-dasharray="8 7" fill="none"/><path d="M26 42h20M26 58h34" stroke="${INK}" stroke-width="3" stroke-dasharray="3 6"/>`,
  "used-candle": `<rect x="34" y="66" width="32" height="20" fill="#fffdf2" ${base}/><path d="M50 66V40" ${base}/><path d="M50 40q-8-10 0-22 8 12 0 22z" fill="#ff9f1c" ${base}/><path d="M34 74q-8 2-8 12h14" ${base}/>`,
  brick: `<rect x="12" y="30" width="76" height="42" fill="#c8553d" ${base}/><circle cx="32" cy="51" r="6" fill="#fffdf2" ${base}/><circle cx="50" cy="51" r="6" fill="#fffdf2" ${base}/><circle cx="68" cy="51" r="6" fill="#fffdf2" ${base}/>`,
  "printer-ink": `<path d="M50 14q24 34 24 50a24 24 0 0 1-48 0q0-16 24-50z" fill="#2fe6ff" ${base}/><path d="M40 66q2 10 12 12" stroke="#fff" stroke-width="4" stroke-linecap="round" fill="none"/>`,
  "gift-card": `<rect x="10" y="26" width="80" height="50" rx="6" fill="#b6ff3c" ${base}/><path d="M10 44h80M34 26v50" ${base}/><path d="M34 44q-14-18-2-18t2 18q14-18 2-18" ${base}/><path d="M52 60h28M52 68h16" ${base}/>`,
};

const FALLBACK = `<rect x="18" y="18" width="64" height="64" fill="#fff36b" ${base}/><path d="M40 40q10-14 20 0-2 8-10 12v6M50 70v1" ${base}/>`;

export function productArt(id, label) {
  const holder = document.createElement("div");
  holder.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" role="img" focusable="false">${ART[id] ?? FALLBACK}</svg>`;
  const svg = holder.firstElementChild;
  svg.setAttribute("aria-label", `Artist's impression of ${label ?? "a product"}`);
  return svg;
}
