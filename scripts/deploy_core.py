#!/usr/bin/env python3
"""Set up core for the hosted stores (run by `make deploy` after terraform apply).

For each store in deploy/stores.json:
  - a Conductor OSS 3.34.0 container on 127.0.0.1:<port> (neon 8081, fable 8082, carbon 8083)
  - the workflow and task definitions the store registered at evaluation
    (runs/<run>/eval/registered_*.json), loaded before the proxy opens
  - optional always-on workers (`workers_cmd`), in a node:22 container next to it
Then Caddy (HTTPS, sslip.io name) in front, configured by infra/core/Caddyfile with
CORE_HOST and PROXY_PATH from Terraform outputs. Nothing sensitive is written to the repo.
"""
from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

repo = Path(__file__).resolve().parent.parent
stores = json.loads((repo / "deploy" / "stores.json").read_text())
proxy = json.loads(subprocess.run(["terraform", "-chdir=infra", "output", "-json", "proxy"], cwd=repo,
                                  capture_output=True, text=True, check=True).stdout)
PORTS = {"neon": 8081, "fable": 8082, "carbon": 8083}


def core(cmd: str, stdin: str | None = None) -> str:
    r = subprocess.run(["ssh", "-F", str(repo / ".state" / "ssh_config"), "chaos-core", cmd], input=stdin,
                       capture_output=True, text=True)
    if r.returncode != 0:
        sys.exit(f"core: {cmd[:80]}... failed: {r.stderr[-500:]}")
    return r.stdout


subprocess.run(["rsync", "-az", "-e", f"ssh -F {repo / '.state' / 'ssh_config'}", f"{repo}/infra/core/", "chaos-core:/srv/chaos/repo/infra/core/"], check=True)

for store, cfg in stores.items():
    port = PORTS[store]
    name = f"conductor-{store}"
    core(f"docker ps -a --format '{{{{.Names}}}}' | grep -qx {name} || docker run -d --name {name} --restart unless-stopped "
         f"-p 127.0.0.1:{port}:8080 conductoross/conductor:3.34.0 >/dev/null; "
         f"for i in $(seq 1 90); do curl -sf http://localhost:{port}/api/metadata/workflow >/dev/null && break; sleep 2; done")
    ev = repo / "runs" / cfg["run"] / "eval"
    taskdefs = json.loads((ev / "registered_taskdefs.json").read_text())
    workflows = json.loads((ev / "registered_workflows.json").read_text())
    if taskdefs:
        core(f"curl -sf -X POST -H 'Content-Type: application/json' -d @- http://localhost:{port}/api/metadata/taskdefs",
             json.dumps(taskdefs))
    if workflows:
        core(f"curl -sf -X PUT -H 'Content-Type: application/json' -d @- http://localhost:{port}/api/metadata/workflow",
             json.dumps(workflows))
    print(f"{store}: conductor on :{port}, {len(workflows)} workflows, {len(taskdefs)} task defs")
    if cfg.get("workers_cmd"):
        app = f"/srv/chaos/repo/runs/{cfg['run']}/app"
        env = " ".join(f"-e {k}={v}" for k, v in cfg.get("workers_env", {}).items())
        core(f"docker rm -f workers-{store} >/dev/null 2>&1; docker run -d --name workers-{store} --restart unless-stopped "
             f"--network host -v {app}:/app -w /app -e {cfg['conductor_env']}=http://localhost:{port}/api {env} node:22 "
             f"bash -lc {json.dumps(cfg['workers_cmd'])} >/dev/null")
        print(f"{store}: always-on workers started ({cfg['workers_cmd']})")

core(f"docker rm -f caddy >/dev/null 2>&1; docker run -d --name caddy --restart unless-stopped --network host "
     f"-v /srv/chaos/repo/infra/core/Caddyfile:/etc/caddy/Caddyfile:ro -v caddy-data:/data "
     f"-e CORE_HOST={proxy['host']} -e PROXY_PATH={proxy['path']} caddy:2 >/dev/null")
print("caddy started")
