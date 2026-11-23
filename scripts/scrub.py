#!/usr/bin/env python3
"""Copy a raw artifact folder into runs/ with sensitive values redacted.

usage: scrub.py <raw_dir> <dest_dir>

- Text files: exact secret values, key formats, IPs, ARNs, account IDs,
  @orkes.io emails, Mac home paths, EC2 hostnames, Lambda URLs and AWS
  resource IDs are replaced with [REDACTED:<category>].
- Binary files: copied unchanged unless they contain an exact secret value, in
  which case they are dropped and listed.
- Dependency and build folders (node_modules, dist, .git, ...) are skipped.
After copying, the destination is scanned with secret_scan.py and the exit code
is non-zero if anything remains.
"""
from __future__ import annotations

import shutil
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import sensitive as S  # noqa: E402

# The real AWS account ID is caught as an exact value (--aws) and by the local
# terms file; there is no generic 12-digit rule because it would mangle joke prices.
REDACT_PATTERNS = {**S.KEY_PATTERNS, **S.SENSITIVE_PATTERNS}


def main() -> int:
    if len(sys.argv) != 3:
        print(__doc__)
        return 2
    src, dst = Path(sys.argv[1]).resolve(), Path(sys.argv[2]).resolve()
    exact = S.load_exact_values(include_aws=True)
    pats = S.compiled({**REDACT_PATTERNS, **S.load_local_terms()})
    dropped, redactions = [], 0
    for f in sorted(src.rglob("*")):
        rel = f.relative_to(src)
        if f.is_dir() or set(rel.parts) & S.TEXT_SKIP_DIRS or f.is_symlink():
            continue
        out = dst / rel
        out.parent.mkdir(parents=True, exist_ok=True)
        data = f.read_bytes()
        if b"\x00" in data[:8192]:
            if any(v.encode() in data for v in exact):
                dropped.append(str(rel))
                continue
            shutil.copyfile(f, out)
            continue
        text = data.decode("utf-8", errors="replace")
        for value in sorted(exact, key=len, reverse=True):
            if value in text:
                redactions += text.count(value)
                text = text.replace(value, f"[REDACTED:{exact[value]}]")
        for cat, rx in pats:
            def repl(m, cat=cat):
                nonlocal redactions
                if S.is_allowed(cat, m.group(0)):
                    return m.group(0)
                redactions += 1
                return f"[REDACTED:{cat}]"
            text = rx.sub(repl, text)
        out.write_text(text)
    print(f"scrub: {redactions} redactions, {len(dropped)} binary files dropped", file=sys.stderr)
    for d in dropped:
        print(f"  dropped (contained a secret): {d}", file=sys.stderr)
    scan = subprocess.run([sys.executable, str(Path(__file__).parent / "secret_scan.py"), "--paths", str(dst)])
    return scan.returncode


if __name__ == "__main__":
    sys.exit(main())
