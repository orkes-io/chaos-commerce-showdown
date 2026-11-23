#!/usr/bin/env python3
"""Drive one store through the pre-registered checklist (prereg/checklist.md).

Runs on core. Opens an SSH tunnel to the run's sandbox (store on :3000, Conductor
on :8080) and either:

  explore  screenshots + an inventory of links, buttons and inputs, used to write
           the per-run map in eval/maps/<run>.json (where features live)
  check    executes the map's flows and records evidence for each checklist item

usage: driver.py explore|check <run_id> <sandbox>
Writes runs/<run_id>/eval/ (results.json, shots/, video/).
"""
import json
import re
import socket
import subprocess
import sys
import time
import urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "workers"))
import remote as R  # noqa: E402
from playwright.sync_api import sync_playwright  # noqa: E402

REPO = R.REPO


def free_port() -> int:
    s = socket.socket()
    s.bind(("127.0.0.1", 0))
    p = s.getsockname()[1]
    s.close()
    return p


class Tunnel:
    def __init__(self, sandbox):
        self.store, self.conductor = free_port(), free_port()
        self.p = subprocess.Popen(R._ssh_base(R.host(sandbox))[:-1] + [
            "-N", "-L", f"{self.store}:localhost:3000", "-L", f"{self.conductor}:localhost:8080",
            R._ssh_base(R.host(sandbox))[-1]])
        for _ in range(40):
            try:
                socket.create_connection(("127.0.0.1", self.store), timeout=1).close()
                break
            except OSError:
                time.sleep(0.5)

    def close(self):
        self.p.terminate()


def conductor(tun, path):
    with urllib.request.urlopen(f"http://127.0.0.1:{tun.conductor}/api{path}", timeout=20) as r:
        return json.load(r)


def executions_since(tun, t0_ms, wait_s=90):
    """Executions started after t0, waiting until each reaches a terminal state."""
    deadline = time.time() + wait_s
    out = []
    while time.time() < deadline:
        res = conductor(tun, "/workflow/search?size=50&sort=startTime:DESC").get("results", [])
        recent = [r for r in res if (r.get("startTime") and _ms(r["startTime"]) >= t0_ms - 2000)]
        out = []
        for r in recent:
            w = conductor(tun, f"/workflow/{r['workflowId']}?includeTasks=true")
            out.append({
                "workflow": w.get("workflowName"), "status": w.get("status"), "id": w.get("workflowId"),
                "tasks": [{"ref": t.get("referenceTaskName"), "type": t.get("taskType"), "status": t.get("status"),
                           "worker": bool(t.get("workerId"))} for t in w.get("tasks", [])],
            })
        if out and all(e["status"] not in ("RUNNING", "PAUSED") for e in out):
            break
        time.sleep(3)
    return out


def _ms(v):
    if isinstance(v, (int, float)):
        return v
    try:
        return int(time.mktime(time.strptime(v[:19], "%Y-%m-%dT%H:%M:%S")) * 1000)
    except Exception:
        return 0


def run_steps(page, base, steps, shots, label):
    """Execute a list of map steps. Returns (ok, log)."""
    log = []
    for i, st in enumerate(steps):
        try:
            if "goto" in st:
                page.goto(base + st["goto"], wait_until="domcontentloaded")
                page.wait_for_timeout(st.get("settle", 1200))
            elif "click" in st:
                page.locator(st["click"]).first.click(timeout=st.get("timeout", 3000 if st.get("optional") else 8000),
                                                      force=st.get("force", False))
                page.wait_for_timeout(st.get("settle", 800))
            elif "fill" in st:
                page.locator(st["fill"][0]).first.fill(str(st["fill"][1]), timeout=8000)
            elif "select" in st:
                page.locator(st["select"][0]).first.select_option(st["select"][1], timeout=8000)
            elif "select_index" in st:
                page.locator(st["select_index"][0]).first.select_option(index=int(st["select_index"][1]), timeout=8000)
            elif "check" in st:
                page.locator(st["check"]).first.check(timeout=8000)
            elif "press" in st:
                page.keyboard.press(st["press"])
            elif "wait" in st:
                page.wait_for_timeout(int(st["wait"]))
            elif "expect_text" in st:
                page.get_by_text(re.compile(st["expect_text"], re.I)).first.wait_for(timeout=st.get("timeout", 30000))
            elif "expect_selector" in st:
                page.locator(st["expect_selector"]).first.wait_for(timeout=st.get("timeout", 30000))
            elif "screenshot" in st:
                page.screenshot(path=str(shots / f"{label}-{st['screenshot']}.png"), full_page=st.get("full", False))
            log.append({"step": i, "ok": True, **st})
        except Exception as e:  # noqa: BLE001
            log.append({"step": i, "ok": False, "error": str(e)[:300], **st})
            if st.get("optional"):  # e.g. a cookie banner that may or may not be showing
                continue
            page.screenshot(path=str(shots / f"{label}-fail-step{i}.png"))
            return False, log
    return True, log


def dodge_test(page, base, spec, shots):
    page.goto(base + spec["url"], wait_until="domcontentloaded")
    page.wait_for_timeout(1500)
    run_steps(page, base, spec.get("open", []), shots, "dodge-open")
    el = page.locator(spec["selector"]).first
    el.scroll_into_view_if_needed(timeout=8000)
    box0 = el.bounding_box()
    positions, moves = [box0], 0
    cx, cy = box0["x"] + box0["width"] / 2, box0["y"] + box0["height"] / 2
    sx, sy = cx + 220, cy + 120
    page.mouse.move(sx, sy)
    for k in range(1, 11):
        b = el.bounding_box() or positions[-1]
        tx, ty = b["x"] + b["width"] / 2, b["y"] + b["height"] / 2
        page.mouse.move(sx + (tx - sx) * k / 10, sy + (ty - sy) * k / 10, steps=4)
        page.wait_for_timeout(250)
        nb = el.bounding_box() or b
        if abs(nb["x"] - b["x"]) > 5 or abs(nb["y"] - b["y"]) > 5:
            moves += 1
        positions.append(nb)
    page.screenshot(path=str(shots / "dodge-after.png"))
    return {"position_changes": moves, "first": box0, "last": positions[-1]}


def explore(run_id, sandbox):
    out = REPO / "runs" / run_id / "eval"
    (out / "shots").mkdir(parents=True, exist_ok=True)
    tun = Tunnel(sandbox)
    inv = {}
    try:
        with sync_playwright() as p:
            b = p.chromium.launch()
            page = b.new_page(viewport={"width": 1440, "height": 900})
            errors = []
            page.on("console", lambda m: errors.append(m.text[:200]) if m.type == "error" else None)
            base = f"http://127.0.0.1:{tun.store}"
            page.goto(base + "/", wait_until="domcontentloaded")
            page.wait_for_timeout(2500)
            page.screenshot(path=str(out / "shots" / "explore-home.png"), full_page=True)
            inv["title"] = page.title()
            inv["links"] = page.eval_on_selector_all("a", "els => els.slice(0,80).map(e => [e.innerText.trim().slice(0,60), e.getAttribute('href')])")
            inv["buttons"] = page.eval_on_selector_all("button", "els => els.slice(0,80).map(e => [e.innerText.trim().slice(0,60), e.className.slice(0,60), e.getAttribute('aria-label')])")
            inv["inputs"] = page.eval_on_selector_all("input,select,textarea", "els => els.slice(0,40).map(e => [e.tagName, e.name, e.id, e.type, e.placeholder])")
            inv["text_sample"] = page.inner_text("body")[:3000]
            inv["console_errors"] = errors
            b.close()
    finally:
        tun.close()
    (out / "inventory.json").write_text(json.dumps(inv, indent=2))
    print(json.dumps({k: (v if k != "text_sample" else v[:600]) for k, v in inv.items()}, indent=1)[:6000])


def check(run_id, sandbox):
    m = json.loads((REPO / "eval" / "maps" / f"{run_id}.json").read_text())
    out = REPO / "runs" / run_id / "eval"
    shots, video = out / "shots", out / "video"
    shots.mkdir(parents=True, exist_ok=True)
    video.mkdir(parents=True, exist_ok=True)
    res = {"run_id": run_id, "map": m.get("notes", "")}
    tun = Tunnel(sandbox)
    try:
        res["workflow_defs"] = [w.get("name") for w in conductor(tun, "/metadata/workflow")]
        with sync_playwright() as p:
            b = p.chromium.launch()
            ctx = b.new_context(viewport={"width": 1440, "height": 900}, record_video_dir=str(video),
                                record_video_size={"width": 1440, "height": 900})
            page = ctx.new_page()
            errors = []
            page.on("console", lambda msg: errors.append(msg.text[:200]) if msg.type == "error" else None)
            base = f"http://127.0.0.1:{tun.store}"

            # F3 catalog
            page.goto(base + m["catalog"]["url"], wait_until="domcontentloaded")
            page.wait_for_timeout(2000)
            page.screenshot(path=str(shots / "catalog.png"), full_page=True)
            res["F3_products"] = page.locator(m["catalog"]["product"]).count()
            res["F3_prices"] = page.locator(m["catalog"]["price"]).all_inner_texts()[:40]

            # F4 reviews (evidence; sentiment judged by the reviewer, see map)
            if m.get("reviews"):
                page.goto(base + m["reviews"]["url"], wait_until="domcontentloaded")
                page.wait_for_timeout(1500)
                run_steps(page, base, m["reviews"].get("open", []), shots, "reviews-open")
                page.screenshot(path=str(shots / "reviews.png"), full_page=True)
                res["F4_reviews"] = page.locator(m["reviews"]["item"]).all_inner_texts()[:20]

            # F5 dodge
            if m.get("one_star"):
                try:
                    res["F5_dodge"] = dodge_test(page, base, m["one_star"], shots)
                except Exception as e:  # noqa: BLE001
                    res["F5_dodge"] = {"error": str(e)[:300]}

            # F6/F7 checkout
            t0 = int(time.time() * 1000)
            ok, log = run_steps(page, base, m["checkout"], shots, "checkout")
            res["F6_checkout_ui"], res["F6_log"] = ok, log
            res["F7_executions"] = executions_since(tun, t0)

            # F8/F9 returns
            t1 = int(time.time() * 1000)
            ok, log = run_steps(page, base, m["returns"], shots, "returns")
            res["F8_returns_ui"], res["F8_log"] = ok, log
            res["F9_executions"] = [e for e in executions_since(tun, t1) if e["id"] not in
                                    {x["id"] for x in res["F7_executions"]}]
            res["console_errors"] = errors[:30]

            # F10 stop the backend, then try checkout again
            if m.get("backend_stop"):
                R.sh(sandbox, m["backend_stop"], check=False)
                time.sleep(3)
                ok, log = run_steps(page, base, m["checkout"], shots, "checkout-backend-stopped")
                res["F10_checkout_succeeded_with_backend_down"], res["F10_log"] = ok, log
            ctx.close()
            b.close()
    finally:
        tun.close()
    (out / "results.json").write_text(json.dumps(res, indent=2))
    print(json.dumps({k: v for k, v in res.items() if not k.endswith("_log")}, indent=1)[:5000])


if __name__ == "__main__":
    mode, run_id, sandbox = sys.argv[1], sys.argv[2], sys.argv[3]
    (explore if mode == "explore" else check)(run_id, sandbox)
