#!/usr/bin/env python3
"""Blind rating page for the human rater (prereg/rubric.md, "Human rating").

Serves Stores A-F (screenshots + clips, no model names) on http://localhost:8765
(reach it through `make rate`, an SSH tunnel). Submitting the form completes the
`blind_rating` HUMAN task in the running chaos_score workflow with the scores.

usage: rating_server.py <blind_map.json>   ({"A": "neon-r2", ...}, kept outside the repo)
"""
import html
import json
import sys
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, unquote

REPO = Path(__file__).resolve().parent.parent
CONDUCTOR = "http://localhost:8080/api"
BLIND = json.loads(Path(sys.argv[1]).read_text())
SHOTS = ["catalog.png", "reviews.png", "dodge-after.png", "checkout-confirmation.png", "returns-decision.png"]


def page() -> bytes:
    rows = []
    for label in sorted(BLIND):
        run = BLIND[label]
        imgs = "".join(f'<a href="/f/{label}/{s}" target="_blank"><img src="/f/{label}/{s}" alt="{s}"></a>'
                       for s in SHOTS if (REPO / "runs" / run / "eval" / "shots" / s).exists())
        vids = "".join(f'<video src="/v/{label}/{v.name}" controls preload="none"></video>'
                       for v in sorted((REPO / "runs" / run / "eval" / "video").glob("*.webm"))[:2])
        sel = lambda n: "".join(f'<label><input type="radio" name="{label}_{n}" value="{i}" required>{i}</label>'
                                for i in range(1, 6))
        rows.append(f"<section><h2>Store {label}</h2><div class=g>{imgs}</div><div>{vids}</div>"
                    f"<p>Product and UX: {sel('ux')}</p><p>Creativity and delight: {sel('creativity')}</p></section>")
    return f"""<!doctype html><meta charset=utf-8><title>Blind rating</title>
<style>body{{font:15px system-ui;max-width:1100px;margin:24px auto;padding:0 16px}}
.g img{{width:200px;margin:4px;border:1px solid #ccc}}video{{width:360px;margin:4px}}
section{{border-bottom:1px solid #ddd;padding:12px 0}}label{{margin-right:10px}}</style>
<h1>Chaos Commerce: blind rating</h1><p>Six stores built from the same prompt. Score each 1-5 using the anchors in
the rubric. Model names are hidden.</p><form method=post>{''.join(rows)}<p>Notes (optional):<br>
<textarea name=notes rows=3 cols=80></textarea></p><button>Submit scores</button></form>""".encode()


def complete_human_task(scores: dict) -> str:
    res = json.load(urllib.request.urlopen(f"{CONDUCTOR}/workflow/search?size=5&sort=startTime:DESC&query="
                                           "workflowType%3Dchaos_score%20AND%20status%3DRUNNING"))["results"]
    for r in res:
        w = json.load(urllib.request.urlopen(f"{CONDUCTOR}/workflow/{r['workflowId']}?includeTasks=true"))
        for t in w["tasks"]:
            if t["referenceTaskName"] == "blind_rating" and t["status"] == "IN_PROGRESS":
                body = json.dumps({"workflowInstanceId": w["workflowId"], "taskId": t["taskId"],
                                   "status": "COMPLETED", "outputData": {"scores": scores}}).encode()
                urllib.request.urlopen(urllib.request.Request(f"{CONDUCTOR}/tasks", data=body, method="POST",
                                                              headers={"Content-Type": "application/json"}))
                return "Thanks. Scores recorded in Conductor."
    Path(REPO / "eval" / "human_scores.pending.json").write_text(json.dumps(scores, indent=2))
    return "No waiting rating task found; scores saved to eval/human_scores.pending.json."


class H(BaseHTTPRequestHandler):
    def do_GET(self):
        parts = unquote(self.path).strip("/").split("/")
        if parts[0] in ("f", "v") and len(parts) == 3 and parts[1] in BLIND:
            sub = "shots" if parts[0] == "f" else "video"
            f = REPO / "runs" / BLIND[parts[1]] / "eval" / sub / Path(parts[2]).name
            if f.exists():
                self.send_response(200)
                self.send_header("Content-Type", "image/png" if parts[0] == "f" else "video/webm")
                self.end_headers()
                self.wfile.write(f.read_bytes())
                return
        body = page()
        self.send_response(200)
        self.send_header("Content-Type", "text/html")
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self):
        form = parse_qs(self.rfile.read(int(self.headers["Content-Length"])).decode())
        scores = {label: {"ux": int(form[f"{label}_ux"][0]), "creativity": int(form[f"{label}_creativity"][0])}
                  for label in BLIND}
        scores["notes"] = form.get("notes", [""])[0]
        msg = complete_human_task(scores)
        self.send_response(200)
        self.send_header("Content-Type", "text/html")
        self.end_headers()
        self.wfile.write(f"<p>{html.escape(msg)}</p>".encode())


ThreadingHTTPServer(("127.0.0.1", 8765), H).serve_forever()
