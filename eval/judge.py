#!/usr/bin/env python3
"""Blind judge (prereg/rubric.md): an OpenAI model scores one store, 3 passes, median.

usage: judge.py <run_id> <store_label> [--model MODEL] [--passes 3]
Reads runs/<run_id>/app (source), runs/<run_id>/eval/results.json and screenshots.
Vendor and model names are stripped before anything is sent. Writes
runs/<run_id>/eval/judge.json. The key comes from OPENAI_API_KEY (core: keys/openai.key).
"""
import argparse
import base64
import json
import os
import re
import statistics
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
CATEGORIES = ["engineering_quality", "product_ux", "creativity_delight", "conductor_usage"]
VENDOR = re.compile(r"(?i)gemini[\w.-]*|google|deepmind|anthropic|claude[\w.-]*|fable[\w.-]*|\bneon\b|opencode|"
                    r"gpt-?[\w.-]*|openai")
CODE_EXT = {".js", ".mjs", ".cjs", ".ts", ".tsx", ".jsx", ".py", ".json", ".html", ".css", ".md", ".yml", ".yaml",
            ".sh", ".toml", ".sql"}
SKIP = {"node_modules", ".git", ".opencode", "dist", "build", "package-lock.json", "pnpm-lock.yaml", "yarn.lock"}
MAX_CHARS = 180_000


def source_bundle(app: Path) -> str:
    parts, total = [], 0
    files = sorted(f for f in app.rglob("*") if f.is_file() and f.suffix in CODE_EXT
                   and not (set(f.relative_to(app).parts) & SKIP) and f.name not in SKIP)
    files.sort(key=lambda f: (f.name.lower() != "readme.md", len(f.parts), str(f)))
    for f in files:
        text = VENDOR.sub("[model]", f.read_text(errors="ignore"))
        chunk = f"\n===== {f.relative_to(app)} =====\n{text}"
        if total + len(chunk) > MAX_CHARS:
            parts.append(f"\n===== (truncated: {len(files)} files total) =====")
            break
        parts.append(chunk)
        total += len(chunk)
    return "".join(parts)


def images(shots: Path) -> list:
    names = ["catalog.png", "reviews.png", "dodge-after.png", "checkout-confirmation.png", "returns-decision.png"]
    out = []
    for n in names:
        f = shots / n
        if f.exists() and f.stat().st_size < 4_000_000:
            out.append({"type": "input_image", "image_url": "data:image/png;base64," + base64.b64encode(f.read_bytes()).decode()})
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("run_id")
    ap.add_argument("label")
    ap.add_argument("--model", default=os.environ.get("JUDGE_MODEL", "gpt-6.2-sol"))
    ap.add_argument("--passes", type=int, default=3)
    a = ap.parse_args()
    from openai import OpenAI
    client = OpenAI()

    run = REPO / "runs" / a.run_id
    rubric = (REPO / "prereg" / "rubric.md").read_text()
    results = (run / "eval" / "results.json").read_text() if (run / "eval" / "results.json").exists() else "{}"
    prompt = (
        "You are a strict, impartial reviewer. You score one web store that a coding agent built from this brief:\n\n"
        + (REPO / "prereg" / "prompt.txt").read_text()
        + "\n\nScore it with this rubric (use only the four judge categories):\n\n" + rubric
        + f"\n\nThe store is called {a.label}. You do not know who or what built it. Automated checklist results:\n"
        + VENDOR.sub("[model]", results)[:20000]
        + "\n\nSource code and README follow.\n" + source_bundle(run / "app")
        + "\n\nReturn only JSON: {\"engineering_quality\": {\"score\": 1-5, \"reason\": \"...\"}, \"product_ux\": {...}, "
          "\"creativity_delight\": {...}, \"conductor_usage\": {...}}"
    )
    content = [{"type": "input_text", "text": prompt}] + images(run / "eval" / "shots")
    passes = []
    for i in range(a.passes):
        r = client.responses.create(model=a.model, input=[{"role": "user", "content": content}],
                                    text={"format": {"type": "json_object"}})
        passes.append(json.loads(r.output_text))
        print(f"pass {i + 1}: " + ", ".join(f"{c}={passes[-1][c]['score']}" for c in CATEGORIES), file=sys.stderr)
    median = {c: statistics.median(p[c]["score"] for p in passes) for c in CATEGORIES}
    out = {"label": a.label, "model": a.model, "passes": passes, "median": median}
    (run / "eval" / "judge.json").write_text(json.dumps(out, indent=2))
    print(json.dumps(median))


if __name__ == "__main__":
    main()
