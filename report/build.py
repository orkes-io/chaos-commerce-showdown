#!/usr/bin/env python3
"""Build report/ from runs/*: functional scores (prereg/checklist.md), judge medians,
human ratings, and time / tokens / cost. Every run is listed; per-model medians and
ranges only (n=3, no averages or significance tests).
"""
import csv
import json
import re
import statistics
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
RUNS = REPO / "runs"
OUT = REPO / "report"
CHAOS = Path("/srv/chaos")
MODEL_NAME = {"neon": "Gemini 4 Neon", "fable": "Fable 5.2"}
PRICE_NUM = re.compile(r"-?\d[\d,]*(?:\.\d+)?")


WAS_PRICE = re.compile(r"was\s*[$€£¥]?\s*-?[\d,]+(?:\.\d+)?", re.I)


def absurd(price: str) -> bool:
    t = WAS_PRICE.sub("", price).strip()  # read the current price, not a crossed-out "was" price
    nums = PRICE_NUM.findall(t)
    if not nums:
        return bool(re.search(r"[A-Za-z]{3,}", t))  # made-up currency or words instead of numbers
    raw = nums[0].replace(",", "")
    v = float(raw)
    decimals = len(raw.split(".")[1]) if "." in raw else 0
    odd_currency = not re.search(r"[$€£¥]|USD|EUR", t) and bool(re.search(r"[A-Za-z]{3,}|[^\w\s.,$-]", t))
    return v < 0 or v >= 1_000_000 or decimals >= 3 or odd_currency or (0 < v < 0.01)


def functional(run: Path) -> dict:
    m = json.loads((REPO / "eval" / "maps" / f"{run.name}.json").read_text())
    r = json.loads((run / "eval" / "results.json").read_text()) if (run / "eval" / "results.json").exists() else {}
    st = json.loads((run / "eval" / "start.json").read_text()) if (run / "eval" / "start.json").exists() else {}
    mf = REPO / "eval" / "manual" / f"{run.name}.json"
    manual = json.loads(mf.read_text()) if mf.exists() else {}
    s = {}
    s["F1"] = (0.5 if st.get("assisted") else 1.0) if st.get("store_up") else 0.0
    s["F2"] = 1.0 if int(st.get("workflows_registered") or 0) > 0 else 0.0
    prices = r.get("F3_prices", [])
    n_abs = sum(absurd(p) for p in prices)
    s["F3"] = 0.0 if r.get("F3_products", 0) < 5 else (1.0 if n_abs >= 3 else 0.5 if n_abs >= 1 else 0.0)
    dodge = (r.get("F5_dodge") or {}).get("position_changes", 0)
    s["F5"] = 1.0 if dodge >= 2 else 0.5 if dodge == 1 else 0.0
    s["F6"] = 1.0 if r.get("F6_checkout_ui") else 0.0
    ex7 = r.get("F7_executions", [])
    done7 = [e for e in ex7 if e["status"] == "COMPLETED"]
    store_code = [e for e in done7 if any(t["type"] in ("SIMPLE", "HTTP") or t["worker"] for t in e["tasks"])]
    s["F7"] = 1.0 if store_code else 0.5 if done7 else 0.0
    s["F8"] = 1.0 if r.get("F8_returns_ui") else 0.0
    ex9 = [e for e in r.get("F9_executions", []) if e["status"] in ("COMPLETED", "FAILED", "TERMINATED")]
    s["F9"] = 1.0 if any(len(e["tasks"]) >= 3 for e in ex9) else 0.5 if ex9 else 0.0
    s["F10"] = 0.0 if r.get("F10_checkout_succeeded_with_backend_down", True) else 1.0
    for k, v in manual.items():  # F4, F11, F12: reviewer judgments, each with evidence (eval/manual/)
        if k.startswith("F"):
            s[k] = float(v["score"])
    s["total"] = round(sum(v for k, v in s.items() if k.startswith("F")), 1)
    s["absurd_prices"] = n_abs
    return s


def med_range(vals):
    vals = [v for v in vals if v is not None]
    if not vals:
        return "n/a"
    return f"{statistics.median(vals):g} ({min(vals):g}-{max(vals):g})"


def main():
    OUT.mkdir(exist_ok=True)
    (OUT / "data").mkdir(exist_ok=True)
    blind = json.loads((CHAOS / "blind_map.json").read_text()) if (CHAOS / "blind_map.json").exists() else {}
    human = json.loads((CHAOS / "human_scores.json").read_text()) if (CHAOS / "human_scores.json").exists() else {}
    label_of = {v: k for k, v in blind.items()}
    rows = []
    for run in sorted(p for p in RUNS.iterdir() if p.is_dir() and not p.name.startswith("pilot")):
        met = json.loads((run / "metrics.json").read_text()) if (run / "metrics.json").exists() else {}
        jd = json.loads((run / "eval" / "judge.json").read_text()) if (run / "eval" / "judge.json").exists() else {}
        try:
            fn = functional(run)
        except FileNotFoundError:
            fn = {"total": None}
        lab = label_of.get(run.name, "")
        tok = met.get("tokens_opencode_session") or {}
        rows.append({
            "run": run.name, "model": MODEL_NAME[run.name.split("-")[0]], "store": lab,
            "functional_of_12": fn.get("total"), **{k: v for k, v in fn.items() if k.startswith("F")},
            **{f"judge_{k}": v for k, v in (jd.get("median") or {}).items()},
            "human_ux": (human.get(lab) or {}).get("ux"), "human_creativity": (human.get(lab) or {}).get("creativity"),
            "ended_by": met.get("ended_by"), "active_minutes": met.get("active_minutes"), "steps": met.get("steps"),
            "tool_calls": met.get("tool_calls"), "tool_errors": met.get("tool_errors"),
            "input_tokens": tok.get("input"), "output_tokens": tok.get("output"), "reasoning_tokens": tok.get("reasoning"),
            "cache_read_tokens": (tok.get("cache") or {}).get("read"), "cache_write_tokens": (tok.get("cache") or {}).get("write"),
            "cost_usd": met.get("cost_usd_opencode"), "cost_usd_recomputed": met.get("cost_usd_recomputed"),
        })
    if not rows:
        print("no runs yet")
        return
    keys = sorted({k for r in rows for k in r}, key=lambda k: list(rows[0]).index(k) if k in rows[0] else 99)
    with open(OUT / "data" / "runs.csv", "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=keys)
        w.writeheader()
        w.writerows(rows)
    lines = ["# Results", "", "## Every run", "",
             "| Run | Model | Functional /12 | Judge eng / UX / creativity / Conductor | Human UX / creativity | Ended | Active min | Cost |",
             "|---|---|---|---|---|---|---|---|"]
    for r in rows:
        j = "/".join(str(r.get(f"judge_{k}", "–")) for k in ("engineering_quality", "product_ux", "creativity_delight", "conductor_usage"))
        lines.append(f"| {r['run']} | {r['model']} | {r['functional_of_12']} | {j} | {r.get('human_ux') or '–'} / "
                     f"{r.get('human_creativity') or '–'} | {r['ended_by']} | {r['active_minutes']} | ${r['cost_usd']} |")
    lines += ["", "## Per model: median (range) over 3 runs", "",
              "| Metric | Gemini 4 Neon | Fable 5.2 |", "|---|---|---|"]
    for key, name in [("functional_of_12", "Functional score /12"), ("judge_engineering_quality", "Judge: engineering"),
                      ("judge_product_ux", "Judge: product and UX"), ("judge_creativity_delight", "Judge: creativity"),
                      ("judge_conductor_usage", "Judge: Conductor usage"), ("human_ux", "Human: UX"),
                      ("human_creativity", "Human: creativity"), ("active_minutes", "Active minutes"),
                      ("steps", "Model steps"), ("output_tokens", "Output tokens"), ("cost_usd", "Cost (USD)")]:
        by = {m: [r.get(key) for r in rows if r["model"] == m] for m in ("Gemini 4 Neon", "Fable 5.2")}
        lines.append(f"| {name} | {med_range(by['Gemini 4 Neon'])} | {med_range(by['Fable 5.2'])} |")
    (OUT / "tables.md").write_text("\n".join(lines) + "\n")
    print("\n".join(lines))


if __name__ == "__main__":
    main()
