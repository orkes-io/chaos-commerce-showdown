"""Token, cost and timing metrics for one run, from the raw OpenCode session export.

Cost is recomputed per request from prereg/pricing.json and also reported as
OpenCode's own figure, so the two can be compared.
"""
from __future__ import annotations

import json
import re
from datetime import datetime
from pathlib import Path

PRICING = json.loads((Path(__file__).resolve().parent.parent / "prereg" / "pricing.json").read_text())
PROVIDER_ERR = re.compile(r"\b(429|500|502|503|504|529)\b|rate.?limit|overloaded|quota|unauthorized|invalid.*api.?key",
                          re.I)


def _msgs(export: dict) -> list[dict]:
    data = export.get("data", export)
    out = []
    for m in data.get("messages", []):
        info = m.get("info", m)
        out.append({**info, "_parts": m.get("parts", [])})
    return out


def _ts(v):
    if v is None:
        return None
    if isinstance(v, (int, float)):
        return v / 1000 if v > 1e12 else float(v)
    try:
        return datetime.fromisoformat(str(v).replace("Z", "+00:00")).timestamp()
    except ValueError:
        return None


def request_cost(tok: dict, model: str) -> float:
    p = PRICING.get(model.split("#")[0], {})
    cache = tok.get("cache") or {}
    write_rate = p.get("cache_write", p.get("cache_write_5m", 0.0)) or 0.0
    return (tok.get("input", 0) * p.get("input", 0) + (tok.get("output", 0) + tok.get("reasoning", 0)) * p.get("output", 0)
            + cache.get("read", 0) * p.get("cache_read", 0) + cache.get("write", 0) * write_rate) / 1e6


def compute(run_dir: Path, model: str) -> dict:
    m = {"model": model}
    for name in ("started_at", "ended_at", "exit_code", "ended_by"):
        f = run_dir / name
        m[name] = f.read_text().strip() if f.exists() else None
    export_path = run_dir / "session.raw.json"
    if not export_path.exists() or export_path.stat().st_size == 0:
        m["error"] = "no session export"
        return m
    export = json.loads(export_path.read_text())
    msgs = _msgs(export)
    assistant = [x for x in msgs if x.get("role") == "assistant"]
    totals = {"input": 0, "output": 0, "reasoning": 0, "cache_read": 0, "cache_write": 0}
    cost_recomputed = cost_opencode = 0.0
    served = set()
    tool_calls = tool_errors = 0
    for a in assistant:
        tok = a.get("tokens") or {}
        cache = tok.get("cache") or {}
        totals["input"] += tok.get("input", 0)
        totals["output"] += tok.get("output", 0)
        totals["reasoning"] += tok.get("reasoning", 0)
        totals["cache_read"] += cache.get("read", 0)
        totals["cache_write"] += cache.get("write", 0)
        cost_recomputed += request_cost(tok, model)
        cost_opencode += a.get("cost") or 0.0
        mdl = a.get("model") or {}
        served.add(f"{mdl.get('providerID', a.get('providerID', '?'))}/{mdl.get('id', a.get('modelID', '?'))}"
                   f"#{mdl.get('variant', '')}")
        for p in a.get("_parts", []):
            if p.get("type") == "tool":
                tool_calls += 1
                if (p.get("state") or {}).get("status") == "error":
                    tool_errors += 1
    times = [_ts((x.get("time") or {}).get("created")) for x in msgs]
    ends = [_ts((x.get("time") or {}).get("completed")) for x in assistant]
    times, ends = [t for t in times if t], [t for t in ends if t]
    m.update({
        "steps": len(assistant),
        "tool_calls": tool_calls,
        "tool_errors": tool_errors,
        "tokens": totals,
        "cost_usd_recomputed": round(cost_recomputed, 4),
        "cost_usd_opencode": round(cost_opencode, 4),
        "models_served": sorted(served),
        "active_minutes": round((max(ends) - min(times)) / 60, 1) if times and ends else None,
    })
    retries = 0
    for log in (run_dir / "opencode-log").glob("*") if (run_dir / "opencode-log").exists() else []:
        retries += len(PROVIDER_ERR.findall(log.read_text(errors="ignore")))
    m["provider_error_mentions_in_logs"] = retries
    stderr = (run_dir / "opencode.stderr").read_text(errors="ignore") if (run_dir / "opencode.stderr").exists() else ""
    code = int(m["exit_code"]) if (m.get("exit_code") or "").lstrip("-").isdigit() else None
    m["provider_error"] = bool(code not in (0, 124, 137, 143, None) and PROVIDER_ERR.search(stderr))
    return m
