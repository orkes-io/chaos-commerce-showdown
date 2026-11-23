#!/usr/bin/env python3
"""Fail if anything sensitive is about to enter (or already is in) this repo.

Checks three things:
  1. exact values of every local secret (key files, env files, optionally the live
     AWS session and the gh token) - values stay in memory, output is masked
  2. key formats (Google, Anthropic, OpenAI, GitHub, AWS, JWT, private keys, ...)
  3. sensitive identifiers (AWS account IDs, ARNs, IPs, @orkes.io emails, Mac home
     paths, EC2 hostnames, Lambda URLs, AWS resource IDs, plus local-only terms)

Modes:
  --staged          staged blobs (pre-commit hook)
  --tree            every tracked or untracked-but-not-ignored file
  --history         every blob in every commit, plus commit messages
  --paths P [P...]  arbitrary files/dirs (used on scrubbed run folders)
Add --aws / --gh to include the live AWS session creds and the gh token.

Reviewed false positives go in scripts/scan_allowlist.txt as
"<path-glob>\t<exact-match>\t<reason>".
"""
from __future__ import annotations

import argparse
import fnmatch
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import sensitive as S  # noqa: E402

REPO = Path(__file__).resolve().parent.parent
ALLOWLIST = REPO / "scripts" / "scan_allowlist.txt"


def load_allowlist():
    rules = []
    if ALLOWLIST.is_file():
        for line in ALLOWLIST.read_text().splitlines():
            if not line.strip() or line.startswith("#"):
                continue
            parts = line.split("\t")
            if len(parts) >= 2:
                rules.append((parts[0], parts[1]))
    return rules


def allowed(path: str, cat: str, match: str, rules) -> bool:
    if S.is_allowed(cat, match):
        return True
    return any(fnmatch.fnmatch(path, g) and match == m for g, m in rules)


def scan_bytes(path: str, data: bytes, exact, pats, rules, findings):
    for value, label in exact.items():
        if value.encode() in data:
            findings.append((path, 0, f"exact-secret({label})", f"<{len(value)} chars>"))
    if b"\x00" in data[:8192]:
        return  # binary: exact values only
    text = data.decode("utf-8", errors="ignore")
    for lineno, line in enumerate(text.splitlines(), 1):
        for cat, rx in pats:
            for m in rx.finditer(line):
                if not allowed(path, cat, m.group(0), rules):
                    findings.append((path, lineno, cat, S.mask(m.group(0))))


def git(*args) -> bytes:
    return subprocess.run(["git", "-C", str(REPO), *args], capture_output=True, check=True).stdout


def main() -> int:
    ap = argparse.ArgumentParser()
    g = ap.add_mutually_exclusive_group(required=True)
    g.add_argument("--staged", action="store_true")
    g.add_argument("--tree", action="store_true")
    g.add_argument("--history", action="store_true")
    g.add_argument("--paths", nargs="+")
    ap.add_argument("--aws", action="store_true", help="include live AWS session creds + account ID")
    ap.add_argument("--gh", action="store_true", help="include the gh auth token")
    a = ap.parse_args()

    exact = S.load_exact_values(include_aws=a.aws, include_gh=a.gh)
    pats = S.compiled({**S.KEY_PATTERNS, **S.SENSITIVE_PATTERNS, **S.load_local_terms()})
    rules = load_allowlist()
    findings: list = []
    scanned = 0

    if a.staged:
        names = git("diff", "--cached", "--name-only", "--diff-filter=ACMR", "-z").split(b"\0")
        for n in filter(None, names):
            p = n.decode()
            if p == "scripts/scan_allowlist.txt":
                continue
            scan_bytes(p, git("show", f":{p}"), exact, pats, rules, findings)
            scanned += 1
    elif a.tree:
        names = git("ls-files", "-co", "--exclude-standard", "-z").split(b"\0")
        for n in filter(None, names):
            p = n.decode()
            fp = REPO / p
            if fp.is_file() and p != "scripts/scan_allowlist.txt":
                scan_bytes(p, fp.read_bytes(), exact, pats, rules, findings)
                scanned += 1
    elif a.history:
        seen = set()
        for line in git("rev-list", "--objects", "--all").decode().splitlines():
            sha, _, p = line.partition(" ")
            if not p or sha in seen or p == "scripts/scan_allowlist.txt":
                continue
            seen.add(sha)
            if git("cat-file", "-t", sha).strip() != b"blob":
                continue
            scan_bytes(f"{p}@{sha[:8]}", git("cat-file", "-p", sha), exact, pats, rules, findings)
            scanned += 1
        msgs = git("log", "--all", "--format=%H%n%B%n--END--").decode(errors="ignore")
        scan_bytes("commit-messages", msgs.encode(), exact, pats, rules, findings)
    else:
        for root in a.paths:
            rp = Path(root)
            files = [rp] if rp.is_file() else [f for f in rp.rglob("*") if f.is_file()
                                               and not (set(f.parts) & S.TEXT_SKIP_DIRS)]
            for f in files:
                scan_bytes(str(f), f.read_bytes(), exact, pats, rules, findings)
                scanned += 1

    for path, lineno, cat, masked in findings:
        print(f"{path}:{lineno}: [{cat}] {masked}")
    status = "FAIL" if findings else "clean"
    print(f"secret_scan: {status} ({len(findings)} findings, {scanned} files, {len(exact)} exact values checked)",
          file=sys.stderr)
    return 1 if findings else 0


if __name__ == "__main__":
    sys.exit(main())
