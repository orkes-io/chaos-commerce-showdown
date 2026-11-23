#!/usr/bin/env python3
"""End-to-end smoke test of the hosted stores, the way a shopper uses them.

Builds each showcase storefront exactly as .github/workflows/pages.yml does,
pointed at its Lambda function URL, serves it locally, and runs the store's
checkout and return flows from eval/maps/<run>.json in Playwright. A pass means:
storefront -> Lambda -> HTTPS proxy on core -> that store's Conductor (and its
workers, if any) -> a confirmed order and a return decision.

usage: smoke_hosted.py            (needs Playwright; function URLs come from Terraform outputs)
"""
import functools
import http.server
import json
import os
import shutil
import subprocess
import sys
import threading
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO / "eval"))
from playwright.sync_api import sync_playwright  # noqa: E402

stores = json.loads((REPO / "deploy" / "stores.json").read_text())
urls = json.loads(subprocess.run(["terraform", f"-chdir={REPO / 'infra'}", "output", "-json", "function_urls"],
                                 capture_output=True, text=True, check=True).stdout)
work = REPO / ".state" / "smoke"


def run_steps(page, base, steps):
    for i, st in enumerate(steps):
        try:
            if "goto" in st:
                page.goto(base + st["goto"], wait_until="domcontentloaded")
                page.wait_for_timeout(1500)
            elif "click" in st:
                page.locator(st["click"]).first.click(timeout=3000 if st.get("optional") else st.get("timeout", 15000))
                page.wait_for_timeout(900)
            elif "fill" in st:
                page.locator(st["fill"][0]).first.fill(str(st["fill"][1]), timeout=10000)
            elif "check" in st:
                page.locator(st["check"]).first.check(timeout=10000)
            elif "select_index" in st:
                page.locator(st["select_index"][0]).first.select_option(index=int(st["select_index"][1]), timeout=10000)
            elif "expect_text" in st:
                import re
                page.get_by_text(re.compile(st["expect_text"], re.I)).first.wait_for(timeout=st.get("timeout", 60000))
            elif "expect_selector" in st:
                page.locator(st["expect_selector"]).first.wait_for(timeout=st.get("timeout", 60000))
        except Exception as e:  # noqa: BLE001
            if not st.get("optional"):
                return f"step {i} {list(st)[0]} failed: {str(e).splitlines()[0][:160]}"
    return "ok"


def serve(directory: Path) -> int:
    handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(directory))
    httpd = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return httpd.server_address[1]


ok = True
for store, cfg in stores.items():
    src = REPO / cfg["frontend_dir"]
    dst = work / store
    if dst.exists():
        shutil.rmtree(dst)
    shutil.copytree(src, dst, ignore=shutil.ignore_patterns("node_modules", "dist"))
    env = {**os.environ, cfg["frontend_api_env"]: urls[store].rstrip("/"), "BASE_PATH": "./"}
    subprocess.run(cfg["frontend_build"], shell=True, cwd=dst, env=env, check=True,
                   stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    port = serve(dst / cfg["frontend_dist"])
    m = json.loads((REPO / "eval" / "maps" / f"{cfg['run']}.json").read_text())
    base = f"http://127.0.0.1:{port}"
    with sync_playwright() as p:
        b = p.chromium.launch()
        page = b.new_page(viewport={"width": 1440, "height": 900})
        checkout = run_steps(page, base, [s for s in m["checkout"] if "screenshot" not in s])
        returns = run_steps(page, base, [s for s in m["returns"] if "screenshot" not in s]) if checkout == "ok" else "skipped"
        page.screenshot(path=str(work / f"{store}-hosted-final.png"))
        b.close()
    print(f"{store} ({cfg['run']}): checkout {checkout} | return {returns}")
    ok &= checkout == "ok" and returns == "ok"
sys.exit(0 if ok else 1)
