#!/usr/bin/env python3
"""Write .state/ssh_config and .state/hosts.json from Terraform outputs.

Both files are gitignored. Use: ssh -F .state/ssh_config chaos-core
                               ssh -F .state/ssh_config chaos-neon-r1   (jumps through core)
"""
import json
import os
from pathlib import Path

repo = Path(__file__).resolve().parent.parent
state = repo / ".state"
out = json.loads((state / "outputs.json").read_text())
key = os.path.expanduser(os.environ.get("CHAOS_SSH_KEY", "~/.ssh/chaos_commerce"))
core = out["core_public_ip"]["value"]
sandboxes = out["sandbox_private_ips"]["value"]

lines = [
    "Host chaos-core",
    f"  HostName {core}",
    "  User ubuntu",
    f"  IdentityFile {key}",
    "  IdentitiesOnly yes",
    "  StrictHostKeyChecking accept-new",
    f"  UserKnownHostsFile {state / 'known_hosts'}",
    "  ServerAliveInterval 30",
    "",
]
for name, ip in sandboxes.items():
    lines += [
        f"Host chaos-{name}",
        f"  HostName {ip}",
        "  User ubuntu",
        f"  IdentityFile {key}",
        "  IdentitiesOnly yes",
        "  ProxyJump chaos-core",
        "  StrictHostKeyChecking accept-new",
        f"  UserKnownHostsFile {state / 'known_hosts'}",
        "  ServerAliveInterval 30",
        "",
    ]
(state / "ssh_config").write_text("\n".join(lines))
(state / "hosts.json").write_text(json.dumps({"core": core, "sandboxes": sandboxes}, indent=2))
print(f"wrote .state/ssh_config ({len(sandboxes)} sandboxes)")
