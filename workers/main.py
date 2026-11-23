"""Conductor workers for the Chaos Commerce showdown. They run on core.

Start: /srv/chaos/venv/bin/python workers/main.py  (systemd unit installed by `make sync`)
Env:   CONDUCTOR_SERVER_URL=http://localhost:8080/api, CONDUCTOR_HTTP2_ENABLED=false
"""

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
def plan_fork(runs: list[dict], cap_minutes: int = 90, idle_minutes: int = 10) -> dict:
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
        return TaskInProgress(callback_after_seconds=30, output={"status": "waiting for cloud-init"})
    provider = R.provider_of(model)
    # The key goes to a 0600 file that run_agent.sh reads into the OpenCode process env and
    # deletes before the agent starts. (`opencode auth login --method key` needs a TTY in 2.4.1.)
    R.sh(sandbox, "umask 077; mkdir -p ~/.chaos && cat > ~/.chaos/key", stdin=R.read_key(provider))
    R.sh(sandbox, "cat > ~/prompt.txt", stdin=(R.REPO / "prereg" / "prompt.txt").read_text())
    for script in ("run_agent.sh", "watch_agent.sh", "collect.sh"):
        R.put(sandbox, SANDBOX_SCRIPTS / script, f"~/{script}")
    R.sh(sandbox, "rm -rf ~/run ~/work && mkdir -p ~/run ~/work && dpkg-query -W > ~/run/dpkg.before")
    versions = R.sh(sandbox, "echo opencode=$(opencode --version 2>&1 | head -1); echo node=$(node --version); "
                             "echo conductor_image=$(docker inspect --format '{{.Config.Image}}' conductor); "
                             "echo skill=$(ls ~/.agents/skills 2>/dev/null | paste -sd, -)")
    return {"run_id": run_id, "versions": dict(l.split("=", 1) for l in versions.split("\n") if "=" in l),
            "key_pushed": True}


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
        return TaskInProgress(callback_after_seconds=60, output={"event_bytes": int(out[1]) if len(out) > 1 else 0})
    code = out[1] if len(out) > 1 else "n/a"
    return {"exit_code": int(code) if code.lstrip("-").isdigit() else code,
            "ended_by": out[2] if len(out) > 2 else "unknown"}


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
    R.sh(sandbox, "rm -rf ~/.chaos", check=False)  # in case the run never started

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


# --- chaos_score: evaluate each run, judge it, then the blind human rating ------

EVAL = R.REPO / "eval"
VENV_PY = str(R.CHAOS_HOME / "venv" / "bin" / "python")


def _map(run_id: str) -> dict:
    f = EVAL / "maps" / f"{run_id}.json"
    if not f.exists():
        raise RuntimeError(f"no map for {run_id}: write eval/maps/{run_id}.json (see make explore)")
    return json.loads(f.read_text())


@worker_task(task_definition_name="chaos_plan_score_fork")
def plan_score_fork(runs: list[dict]) -> dict:
    tasks, inputs = [], {}
    for r in runs:
        ref = f"score_{r['run_id'].replace('-', '_')}"
        tasks.append({"name": "chaos_score_one", "taskReferenceName": ref, "type": "SUB_WORKFLOW",
                      "subWorkflowParam": {"name": "chaos_score_one", "version": 1}})
        inputs[ref] = r
    return {"tasks": tasks, "inputs": inputs}


@worker_task(task_definition_name="chaos_eval_start", thread_count=6)
def eval_start(run_id: str, sandbox: str) -> dict:
    m = _map(run_id)
    R.put(sandbox, R.REPO / "infra" / "sandbox" / "eval_start.sh", "~/eval_start.sh")
    out = R.sh(sandbox, f"~/eval_start.sh {json.dumps(m['start_cmd'])} 300", timeout=900)
    kv = dict(line.split("=", 1) for line in out.strip().replace(" seconds=", "\nseconds=").splitlines() if "=" in line)
    res = {"store_up": kv.get("store_up") == "yes", "start_seconds": kv.get("seconds"),
           "workflows_registered": kv.get("workflows_registered"), "start_cmd": m["start_cmd"],
           "assisted": bool(m.get("assisted"))}
    d = R.REPO / "runs" / run_id / "eval"
    d.mkdir(parents=True, exist_ok=True)
    (d / "start.json").write_text(json.dumps(res, indent=2))
    # What the store's own start command registered on a fresh Conductor (used for hosting).
    for name, path in (("registered_workflows.json", "metadata/workflow"), ("registered_taskdefs.json", "metadata/taskdefs")):
        (d / name).write_text(R.sh(sandbox, f"curl -s http://localhost:8080/api/{path}", check=False) or "[]")
    return res


@worker_task(task_definition_name="chaos_check", thread_count=3)
def check(run_id: str, sandbox: str) -> dict:
    r = subprocess.run([VENV_PY, str(EVAL / "driver.py"), "check", run_id, sandbox], capture_output=True,
                       text=True, timeout=1500)
    if r.returncode != 0:
        raise RuntimeError(r.stderr[-1500:])
    res = json.loads((R.REPO / "runs" / run_id / "eval" / "results.json").read_text())
    return {k: v for k, v in res.items() if not k.endswith("_log")}


@worker_task(task_definition_name="chaos_judge", thread_count=6)
def judge(run_id: str, label: str, judge_model: str = "") -> dict:
    env = {**os.environ, "OPENAI_API_KEY": (R.KEYS / "openai.key").read_text().strip()}
    if judge_model:
        env["JUDGE_MODEL"] = judge_model
    r = subprocess.run([VENV_PY, str(EVAL / "judge.py"), run_id, label], capture_output=True, text=True,
                       timeout=1800, env=env)
    if r.returncode != 0:
        raise RuntimeError(r.stderr[-1500:])
    return json.loads(r.stdout.strip().splitlines()[-1])


@worker_task(task_definition_name="chaos_report")
def report(human_scores: dict = None) -> dict:
    if human_scores:
        (R.CHAOS_HOME / "human_scores.json").write_text(json.dumps(human_scores, indent=2))
    r = subprocess.run([VENV_PY, str(R.REPO / "report" / "build.py")], capture_output=True, text=True, timeout=600)
    if r.returncode != 0:
        raise RuntimeError(r.stderr[-1500:])
    return {"summary": r.stdout[-3000:]}


def main():
    os.environ.setdefault("CONDUCTOR_SERVER_URL", "http://localhost:8080/api")
    os.environ.setdefault("CONDUCTOR_HTTP2_ENABLED", "false")
    handler = TaskHandler(configuration=Configuration(), scan_for_annotated_workers=True)
    handler.start_processes()
    handler.join_processes()


if __name__ == "__main__":
    main()
