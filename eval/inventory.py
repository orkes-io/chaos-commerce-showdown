#!/usr/bin/env python3
"""Print a UI inventory of a running store to help write eval/maps/<run>.json.

Lists buttons, links, inputs, test IDs, cards and price elements on each page,
so a map can point at stable selectors. Runs on core (SSH tunnel to the sandbox).

usage: inventory.py <run_id> <sandbox> [path ...]     (default path: /)
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from driver import Tunnel  # noqa: E402
from playwright.sync_api import sync_playwright  # noqa: E402

JS = r"""() => {
  const lab = e => e.tagName.toLowerCase() + (e.id ? "#" + e.id : "")
    + (typeof e.className === "string" && e.className.trim() ? "." + e.className.trim().split(/\s+/).slice(0, 3).join(".") : "")
    + (e.getAttribute("data-testid") ? "[data-testid=" + e.getAttribute("data-testid") + "]" : "")
    + (e.name ? "[name=" + e.name + "]" : "");
  const txt = e => (e.innerText || e.value || e.getAttribute("aria-label") || e.placeholder || "").trim().replace(/\s+/g, " ").slice(0, 50);
  const pick = (s, n) => Array.from(document.querySelectorAll(s)).slice(0, n).map(e => lab(e) + " :: " + txt(e));
  const uniq = a => Array.from(new Set(a));
  return {
    buttons: uniq(pick("button", 40)).slice(0, 25),
    links: uniq(pick("a[href]", 40).map(x => x)).slice(0, 20),
    hrefs: uniq(Array.from(document.querySelectorAll("a[href]")).map(a => a.getAttribute("href")).filter(h => h && (h.startsWith("#") || h.startsWith("/")))).slice(0, 25),
    inputs: pick("input,select,textarea", 25),
    testids: uniq(Array.from(document.querySelectorAll("[data-testid]")).map(e => e.getAttribute("data-testid"))).slice(0, 40),
    cards: pick("article, [class*=card], [class*=product]", 3),
    prices: pick("[class*=price]", 4),
  };
}"""

run_id, sandbox = sys.argv[1], sys.argv[2]
paths = sys.argv[3:] or ["/"]
tun = Tunnel(sandbox)
try:
    with sync_playwright() as p:
        b = p.chromium.launch()
        page = b.new_page(viewport={"width": 1440, "height": 900})
        base = f"http://127.0.0.1:{tun.store}"
        for path in paths:
            page.goto(base + path, wait_until="domcontentloaded")
            page.wait_for_timeout(2500)
            print(f"=== {path}")
            for k, v in page.evaluate(JS).items():
                print(f"  {k}: {v}")
        b.close()
finally:
    tun.close()
