"""Conductor workers for the Chaos Commerce showdown. They run on core.

Start: /srv/chaos/venv/bin/python workers/main.py  (systemd unit installed by `make sync`)
Env:   CONDUCTOR_SERVER_URL=http://localhost:8080/api, CONDUCTOR_HTTP2_ENABLED=false
"""
from __future__ import annotations

import json
import os
import shutil
import subprocess
import sys
import tarfile
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from conductor.client.automator.task_handler import TaskHandler  # noqa: E402
from conductor.client.configuration.configuration import Configuration  # noqa: E402
from conductor.client.context import TaskInProgress  # noqa: E402
from conductor.client.worker.worker_task import worker_task  # noqa: E402

import metrics  # noqa: E402
import remote as R  # noqa: E402

SANDBOX_SCRIPTS = R.REPO / "infra" / "sandbox"


# --- chaos_runs: fan out one sub-workflow per run --------------------------------

@worker_task(task_definition_name="chaos_plan_fork")
def plan_fork(runs: list, cap_minutes: int = 90, idle_minutes: int = 10) -> dict:
    tasks, inputs = [], {}
    for r in runs:
        ref = f"run_{r['run_id'].replace('-', '_')}"
        tasks.append({"name": "chaos_run", "taskReferenceName": ref, "type": "SUB_WORKFLOW",
                      "subWorkflowParam": {"name": "chaos_run", "version": 1}})
        inputs[ref] = {**r, "cap_minutes": cap_minutes, "idle_minutes": idle_minutes}
    return {"tasks": tasks, "inputs": inputs}


# --- chaos_run: prepare -> start -> wait -> collect -------------------------------

@worker_task(task_definition_name="chaos_prepare", thread_count=8)
def prepare(sandbox: str, model: str, run_id: str):
    ready = R.sh(sandbox, "test -f /var/lib/chaos-ready && curl -sf http://localhost:8080/api/metadata/workflow >/dev/null && echo yes || echo no").strip()
    if ready != "yes":
        return TaskInProgress(callback_after=30, output={"status": "waiting for cloud-init"})
    provider = R.provider_of(model)
    # Store the model key in OpenCode's own credential store (not the shell env).
    R.sh(sandbox, f"opencode auth login {provider} --method key", stdin=R.read_key(provider) + "\n", timeout=120)
    check = R.sh(sandbox, "opencode auth list 2>&1 | head -20", check=False)
    R.sh(sandbox, "cat > ~/prompt.txt", stdin=(R.REPO / "prereg" / "prompt.txt").read_text())
    for script in ("run_agent.sh", "collect.sh"):
        R.put(sandbox, SANDBOX_SCRIPTS / script, f"~/{script}")
    R.sh(sandbox, "rm -rf ~/run ~/work && mkdir -p ~/run ~/work && dpkg-query -W > ~/run/dpkg.before")
    versions = R.sh(sandbox, "echo opencode=$(opencode --version 2>&1 | head -1); echo node=$(node --version); "
                             "echo conductor_image=$(docker inspect --format '{{.Config.Image}}' conductor); "
                             "echo skill=$(ls ~/.agents/skills 2>/dev/null | tr '\\n' ' ')")
    return {"run_id": run_id, "versions": dict(l.split("=", 1) for l in versions.split("\n") if "=" in l),
            "auth_ok": provider in check.lower()}


@worker_task(task_definition_name="chaos_start")
def start(sandbox: str, model: str, cap_minutes: int = 90, idle_minutes: int = 10) -> dict:
    R.sh(sandbox, f"nohup setsid ~/run_agent.sh '{model}' {int(cap_minutes)} {int(idle_minutes)} "
                  "> ~/run_agent.log 2>&1 < /dev/null & echo started")
    return {"started_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())}


@worker_task(task_definition_name="chaos_wait", thread_count=8)
def wait(sandbox: str):
    out = R.sh(sandbox, "if [ -f ~/run/done ]; then echo DONE $(cat ~/run/exit_code) $(cat ~/run/ended_by); "
                        "else echo RUNNING $(stat -c %s ~/run/events.jsonl 2>/dev/null || echo 0); fi").split()
    if out[0] != "DONE":
        return TaskInProgress(callback_after=60, output={"event_bytes": int(out[1]) if len(out) > 1 else 0})
    return {"exit_code": int(out[1]), "ended_by": out[2]}


@worker_task(task_definition_name="chaos_collect", thread_count=4)
def collect(sandbox: str, run_id: str, model: str) -> dict:
    R.sh(sandbox, "bash ~/collect.sh", timeout=1200)
    raw = R.RAW / run_id
    if raw.exists():
        shutil.rmtree(raw)
    raw.mkdir(parents=True)
    R.get(sandbox, "~/run.tgz", raw / "run.tgz")
    with tarfile.open(raw / "run.tgz") as t:
        t.extractall(raw, filter="data")
    with tarfile.open(raw / "run" / "workspace.tgz") as t:
        t.extractall(raw / "run", filter="data")
    (raw / "run" / "workspace.tgz").unlink()
    # Remove the model key from the sandbox now that the session is exported.
    R.sh(sandbox, f"opencode auth logout {R.provider_of(model)} >/dev/null 2>&1; true", check=False)

    m = metrics.compute(raw / "run", model)
    (raw / "run" / "metrics.json").write_text(json.dumps(m, indent=2))

    # Scrub into the repo copy on core; scrub.py exits non-zero if anything sensitive survives.
    dest = R.REPO / "runs" / run_id
    if dest.exists():
        shutil.rmtree(dest)
    keep = raw / "keep"
    keep.mkdir()
    for name in ("session.json", "metrics.json", "started_at", "ended_at", "exit_code", "ended_by",
                 "docker-events.jsonl", "stats.json", "conductor", "env"):
        src = raw / "run" / name
        if src.exists():
            (shutil.copytree if src.is_dir() else shutil.copy2)(src, keep / name)
    if (raw / "run" / "work").exists():
        shutil.copytree(raw / "run" / "work", keep / "app", symlinks=True,
                        ignore=shutil.ignore_patterns("node_modules", ".git", "dist", "build", ".next"))
    scrub = subprocess.run([str(R.CHAOS_HOME / "venv" / "bin" / "python"), str(R.REPO / "scripts" / "scrub.py"),
                            str(keep), str(dest)], capture_output=True, text=True)
    return {"run_id": run_id, "metrics": m, "scrub_clean": scrub.returncode == 0,
            "scrub_report": (scrub.stdout + scrub.stderr)[-1500:],
            "provider_error": m.get("provider_error", False)}


def main():
    os.environ.setdefault("CONDUCTOR_SERVER_URL", "http://localhost:8080/api")
    os.environ.setdefault("CONDUCTOR_HTTP2_ENABLED", "false")
    handler = TaskHandler(configuration=Configuration(), scan_for_annotated_workers=True)
    handler.start_processes()
    handler.join_processes()


if __name__ == "__main__":
    main()
