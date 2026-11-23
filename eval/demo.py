#!/usr/bin/env python3
"""Record a human-paced demo walkthrough of one store (for the post and social clips).

Same map as the checklist (eval/maps/<run>.json), but slowed down and with a
visible cursor, so the absurd parts read on video: prices, inverted reviews,
chasing the one-star button, checkout, the returns gauntlet. No captions or labels.

usage: demo.py <run_id> <sandbox>
Writes runs/<run_id>/demo/walkthrough.webm (convert with `make demo-clips`).
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from driver import REPO, Tunnel, run_steps  # noqa: E402
from playwright.sync_api import sync_playwright  # noqa: E402

CURSOR_JS = """
(() => {
  const d = document.createElement('div');
  d.id = '__demo_cursor';
  Object.assign(d.style, {position: 'fixed', width: '22px', height: '22px', borderRadius: '50%',
    background: 'rgba(108,55,189,0.35)', border: '2px solid rgba(108,55,189,0.9)', pointerEvents: 'none',
    zIndex: 2147483647, transform: 'translate(-50%,-50%)', left: '-50px', top: '-50px'});
  document.addEventListener('mousemove', e => { d.style.left = e.clientX + 'px'; d.style.top = e.clientY + 'px'; }, true);
  const add = () => document.body && !document.getElementById('__demo_cursor') && document.body.appendChild(d);
  add(); new MutationObserver(add).observe(document.documentElement, {childList: true, subtree: true});
})();
"""


def glide(page, selector, pause=900):
    el = page.locator(selector).first
    el.scroll_into_view_if_needed(timeout=8000)
    b = el.bounding_box()
    if b:
        page.mouse.move(b["x"] + b["width"] / 2, b["y"] + b["height"] / 2, steps=25)
    page.wait_for_timeout(pause)


def main(run_id, sandbox):
    m = json.loads((REPO / "eval" / "maps" / f"{run_id}.json").read_text())
    out = REPO / "runs" / run_id / "demo"
    out.mkdir(parents=True, exist_ok=True)
    tun = Tunnel(sandbox)
    try:
        with sync_playwright() as p:
            b = p.chromium.launch(slow_mo=120)
            ctx = b.new_context(viewport={"width": 1440, "height": 900}, record_video_dir=str(out),
                                record_video_size={"width": 1440, "height": 900})
            ctx.add_init_script(CURSOR_JS)
            page = ctx.new_page()
            base = f"http://127.0.0.1:{tun.store}"
            page.mouse.move(720, 450)
            # 1. Catalog: let the absurd prices sit on screen, hover a few.
            page.goto(base + m["catalog"]["url"], wait_until="domcontentloaded")
            page.wait_for_timeout(2500)
            for i in range(min(3, page.locator(m["catalog"]["price"]).count())):
                glide(page, f"{m['catalog']['price']} >> nth={i}", 1100)
            page.mouse.wheel(0, 500)
            page.wait_for_timeout(1500)
            # 2. Reviews: scroll through the inverted ratings.
            if m.get("reviews"):
                page.goto(base + m["reviews"]["url"], wait_until="domcontentloaded")
                page.wait_for_timeout(1500)
                run_steps(page, base, m["reviews"].get("open", []), out, "demo-open")
                for i in range(min(3, page.locator(m["reviews"]["item"]).count())):
                    glide(page, f"{m['reviews']['item']} >> nth={i}", 1600)
            # 3. Chase the one-star button.
            if m.get("one_star"):
                page.goto(base + m["one_star"]["url"], wait_until="domcontentloaded")
                page.wait_for_timeout(1200)
                run_steps(page, base, m["one_star"].get("open", []), out, "demo-open")
                el = page.locator(m["one_star"]["selector"]).first
                el.scroll_into_view_if_needed(timeout=8000)
                for _ in range(6):
                    bb = el.bounding_box()
                    if not bb:
                        break
                    page.mouse.move(bb["x"] + bb["width"] / 2, bb["y"] + bb["height"] / 2, steps=18)
                    page.wait_for_timeout(500)
                try:
                    el.click(timeout=1500)
                except Exception:  # noqa: BLE001 - it is supposed to get away
                    pass
                page.wait_for_timeout(1500)
            # 4. Checkout, then 5. the returns gauntlet, at a watchable pace.
            for flow in ("checkout", "returns"):
                steps = [dict(s, settle=max(s.get("settle", 800), 1600)) if ("click" in s or "goto" in s) else s
                         for s in m[flow] if "screenshot" not in s]
                run_steps(page, base, steps, out, f"demo-{flow}")
                page.wait_for_timeout(3000)
            video = page.video
            ctx.close()
            b.close()
            Path(video.path()).rename(out / "walkthrough.webm")
    finally:
        tun.close()
    print(f"recorded {out / 'walkthrough.webm'}")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
