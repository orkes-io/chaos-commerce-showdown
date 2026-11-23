"""SSH helpers used by the workers on core to drive the sandboxes."""
from __future__ import annotations

import json
import os
import subprocess
from pathlib import Path

CHAOS_HOME = Path(os.environ.get("CHAOS_HOME", "/srv/chaos"))
REPO = CHAOS_HOME / "repo"
KEYS = CHAOS_HOME / "keys"
RAW = CHAOS_HOME / "raw"
SSH_KEY = Path(os.environ.get("CHAOS_SSH_KEY", str(Path.home() / ".ssh" / "id_ed25519")))
KNOWN = CHAOS_HOME / "known_hosts"

PROVIDER_KEYFILE = {"google": "google.key", "anthropic": "anthropic.key"}


def host(sandbox: str) -> str:
    hosts = json.loads((CHAOS_HOME / "hosts.json").read_text())
    return hosts["sandboxes"][sandbox]


def _ssh_base(h: str) -> list[str]:
    return ["ssh", "-i", str(SSH_KEY), "-o", "IdentitiesOnly=yes", "-o", "BatchMode=yes",
            "-o", "StrictHostKeyChecking=accept-new", "-o", f"UserKnownHostsFile={KNOWN}",
            "-o", "ConnectTimeout=20", "-o", "ServerAliveInterval=30", f"ubuntu@{h}"]


def sh(sandbox: str, cmd: str, timeout: int = 600, stdin: str | None = None, check: bool = True) -> str:
    """Run a login-shell command on a sandbox and return stdout."""
    r = subprocess.run(_ssh_base(host(sandbox)) + [f"bash -lc {json.dumps(cmd)}"], input=stdin,
                       capture_output=True, text=True, timeout=timeout)
    if check and r.returncode != 0:
        raise RuntimeError(f"[{sandbox}] exit {r.returncode}: {r.stderr.strip()[-800:]}")
    return r.stdout


def put(sandbox: str, local: Path, remote: str, mode: str = "0755") -> None:
    sh(sandbox, f"cat > {remote} && chmod {mode} {remote}", stdin=local.read_text())


def get(sandbox: str, remote: str, local: Path, timeout: int = 900) -> None:
    local.parent.mkdir(parents=True, exist_ok=True)
    with open(local, "wb") as f:
        r = subprocess.run(_ssh_base(host(sandbox)) + [f"cat {remote}"], stdout=f, stderr=subprocess.PIPE,
                           timeout=timeout)
    if r.returncode != 0:
        raise RuntimeError(f"[{sandbox}] fetch {remote} failed: {r.stderr.decode()[-400:]}")


def provider_of(model: str) -> str:
    return model.split("/", 1)[0]


def read_key(provider: str) -> str:
    return (KEYS / PROVIDER_KEYFILE[provider]).read_text().strip()
