"""Token, cost and timing metrics for one run, from the raw OpenCode 2.x session export.

Export shape (opencode session export): {"info": {...session totals...}, "messages": [...]}
where assistant messages carry tokens {input, output, reasoning, cache{read, write}}, cost,
model {id, providerID, variant}, time {created, firstToken, streamed, completed}, finish
and content blocks (text / reasoning / tool).

Cost is recomputed per request from prereg/pricing.json (reasoning billed as output) and
reported next to OpenCode's own figure.
"""
from __future__ import annotations

import json
import re
from pathlib import Path

PRICING = json.loads((Path(__file__).resolve().parent.parent / "prereg" / "pricing.json").read_text())
PROVIDER_ERR = re.compile(r"\b(429|500|502|503|504|529)\b|rate.?limit|overloaded|quota|unauthorized|invalid.*api.?key|"
                          r"credit balance|billing", re.I)


def request_cost(tok: dict, model: str) -> float:
    p = PRICING.get(model.split("#")[0], {})
    cache = tok.get("cache") or {}
    write_rate = p.get("cache_write", p.get("cache_write_5m", 0.0)) or 0.0
    return (tok.get("input", 0) * p.get("input", 0)
            + (tok.get("output", 0) + tok.get("reasoning", 0)) * p.get("output", 0)
            + cache.get("read", 0) * p.get("cache_read", 0)
            + cache.get("write", 0) * write_rate) / 1e6


def _ms(v):
    return v / 1000 if isinstance(v, (int, float)) and v > 1e12 else v


def compute(run_dir: Path, model: str) -> dict:
    m = {"model": model}
    for name in ("started_at", "ended_at", "exit_code", "ended_by"):
        f = run_dir / name
        m[name] = f.read_text().strip() if f.exists() else None
    export_path = run_dir / "session.raw.json"
    if not export_path.exists() or export_path.stat().st_size == 0:
        m["error"] = "no session export"
        return m
    d = json.loads(export_path.read_text())
    d = d.get("data", d)
    info, msgs = d.get("info", {}), d.get("messages", [])
    assistant = [x for x in msgs if str(x.get("type", "")).lower() == "assistant"]

    totals = {"input": 0, "output": 0, "reasoning": 0, "cache_read": 0, "cache_write": 0}
    cost = 0.0
    served, finishes = set(), {}
    tools, tool_errors, shell_cmds = 0, 0, []
    for a in assistant:
        tok = a.get("tokens") or {}
        totals["input"] += tok.get("input", 0)
        totals["output"] += tok.get("output", 0)
        totals["reasoning"] += tok.get("reasoning", 0)
        totals["cache_read"] += (tok.get("cache") or {}).get("read", 0)
        totals["cache_write"] += (tok.get("cache") or {}).get("write", 0)
        cost += request_cost(tok, model)
        md = a.get("model") or {}
        served.add(f"{md.get('providerID')}/{md.get('id')}#{md.get('variant')}")
        finishes[a.get("finish")] = finishes.get(a.get("finish"), 0) + 1
        for b in a.get("content") or []:
            if b.get("type") != "tool":
                continue
            tools += 1
            st = b.get("state") or {}
            if str(st.get("status", "")).lower() == "error":
                tool_errors += 1
            if b.get("name") in ("bash", "shell"):
                cmd = (st.get("input") or {}).get("command")
                if cmd:
                    shell_cmds.append(cmd)

    t = info.get("time") or {}
    created = [_ms((a.get("time") or {}).get("created")) for a in assistant]
    completed = [_ms((a.get("time") or {}).get("completed")) for a in assistant]
    created, completed = [x for x in created if x], [x for x in completed if x]
    first = _ms(t.get("created")) or (min(created) if created else None)
    last = max(completed) if completed else _ms(t.get("updated"))
    m.update({
        "steps": len(assistant),
        "finish_reasons": finishes,
        "tool_calls": tools,
        "tool_errors": tool_errors,
        "shell_commands": len(shell_cmds),
        "repeated_shell_commands": len(shell_cmds) - len(set(shell_cmds)),
        "tokens": totals,
        "tokens_opencode_session": info.get("tokens"),
        "cost_usd_recomputed": round(cost, 4),
        "cost_usd_opencode": round(info.get("cost") or 0.0, 4),
        "models_served": sorted(served),
        "active_minutes": round((last - first) / 60, 1) if first and last else None,
        "ended_idle": any(str(x.get("type", "")).lower() == "idle" for x in msgs),
    })
    logs = list((run_dir / "opencode-log").glob("*")) if (run_dir / "opencode-log").exists() else []
    m["provider_error_mentions_in_logs"] = sum(len(PROVIDER_ERR.findall(f.read_text(errors="ignore")))
                                               for f in logs if f.is_file())
    stderr = (run_dir / "opencode.stderr").read_text(errors="ignore") if (run_dir / "opencode.stderr").exists() else ""
    code = int(m["exit_code"]) if (m.get("exit_code") or "").lstrip("-").isdigit() else None
    errors = [x.get("error") or {} for x in assistant if x.get("finish") == "error"]
    m["errors"] = [str(e.get("message", ""))[:240] for e in errors]
    m["provider_error"] = bool(
        any(str(e.get("type", "")).startswith("provider.") or PROVIDER_ERR.search(str(e.get("message", ""))) for e in errors)
        or (code not in (0, 124, 137, 143, None) and PROVIDER_ERR.search(stderr)))
    return m
