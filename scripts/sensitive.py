"""Shared definitions of what counts as sensitive in this repo.

Used by secret_scan.py (find and fail) and scrub.py (redact before copying
artifacts into runs/). Nothing here contains a secret: exact values are read at
runtime from local files that live outside the repo.
"""
from __future__ import annotations

import os
import re
import subprocess
from pathlib import Path

HOME = Path.home()

# Local files whose values must never appear in the repo. Override or extend with
# SECRET_FILES (colon-separated). Missing files are skipped.
DEFAULT_SECRET_FILES = [
    "~/geminitempkey.txt",
    "~/nlclaude.txt",
    "~/claudetempkey.txt",
    "~/.conductor-video.env",
    "~/orkes_dev_creds.env",
    "~/mistral_key.txt",
    "~/buffer_api_key.key",
    "~/agentspan-private-gh-cred",
    "~/.ssh/chaos_commerce",
]

# Key formats (always secrets).
KEY_PATTERNS = {
    "google-api-key": r"AIza[0-9A-Za-z\-_]{35}",
    "google-api-key-v2": r"\bAQ\.[A-Za-z0-9_\-]{40,}",
    "anthropic-key": r"sk-ant-[A-Za-z0-9\-_]{20,}",
    "openai-key": r"\bsk-(?:proj-|svcacct-)?[A-Za-z0-9\-_]{32,}",
    "github-token": r"\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,})",
    "aws-access-key-id": r"\b(?:AKIA|ASIA)[0-9A-Z]{16}\b",
    "aws-secret-assignment": r"(?i)aws_(?:secret_access_key|session_token)\s*[=:]\s*['\"]?[A-Za-z0-9/+=]{16,}",
    "jwt": r"\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}",
    "private-key": r"-----BEGIN (?:[A-Z]+ )?PRIVATE KEY-----",
    "slack-token": r"\bxox[abposr]-[A-Za-z0-9-]{10,}",
    "docker-pat": r"\bdckr_pat_[A-Za-z0-9_-]{20,}",
    "bearer-token": r"(?i)\bbearer\s+[A-Za-z0-9\-_.=]{24,}",
}

# Things that identify our account, people or infrastructure.
SENSITIVE_PATTERNS = {
    "aws-arn": r"arn:aws[a-z-]*:[^\s\"'`]+",
    "ipv4": r"(?<![\d.])(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)(?![\d.])",
    "orkes-email": r"[A-Za-z0-9._%+-]+@orkes\.io",
    "mac-home-path": r"/Users/[A-Za-z0-9._-]+",
    "slack-link": r"(?i)[a-z0-9-]+\.slack\.com/archives",
    "ec2-hostname": r"(?i)\bec2-\d+-\d+-\d+-\d+\.[a-z0-9.-]*amazonaws\.com|\bip-\d+-\d+-\d+-\d+(?:\.[a-z0-9.-]+)?\.compute\.internal",
    "lambda-url": r"(?i)\b[a-z0-9]{20,}\.lambda-url\.[a-z0-9-]+\.on\.aws",
    "aws-resource-id": r"\b(?:i|sg|subnet|vpc|eni|igw|rtb|vol|snap|ami)-[0-9a-f]{8,17}\b",
}

# Matches that are fine to keep (loopback, wildcard binds, documentation ranges).
ALLOWED_MATCHES = {
    "ipv4": {"127.0.0.1", "0.0.0.0", "255.255.255.255"},
}

DOC_IP_PREFIXES = ("192.0.2.", "198.51.100.", "203.0.113.")  # RFC 5737 documentation ranges


def is_allowed(cat: str, match: str) -> bool:
    if match in ALLOWED_MATCHES.get(cat, set()):
        return True
    return cat == "ipv4" and match.startswith(DOC_IP_PREFIXES)


TEXT_SKIP_DIRS = {"node_modules", ".git", ".terraform", ".venv", "__pycache__", "dist", "build", ".next", ".cache", "coverage"}


def _parse_values(text: str) -> list[str]:
    """Pull secret-looking values out of a key file or an env file."""
    values = []
    for line in text.splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        if "=" in line and not line.startswith("-----"):
            _, _, v = line.partition("=")
            v = v.strip().strip("'\"")
        else:
            v = line
        if len(v) >= 12 and not v.startswith("-----"):
            values.append(v)
    return values


def load_exact_values(include_aws: bool = False, include_gh: bool = False) -> dict[str, str]:
    """Return {value: label} for every local secret value. Values never leave memory."""
    files = os.environ.get("SECRET_FILES")
    paths = files.split(":") if files else DEFAULT_SECRET_FILES
    values: dict[str, str] = {}
    for p in paths:
        path = Path(os.path.expanduser(p))
        if not path.is_file():
            continue
        try:
            text = path.read_text(errors="ignore")
        except OSError:
            continue
        if "PRIVATE KEY" in text:
            # Private key bodies: every long base64 line is a secret.
            for line in text.splitlines():
                if len(line) >= 40 and not line.startswith("-----"):
                    values[line.strip()] = f"file:{path.name}"
            continue
        for v in _parse_values(text):
            values[v] = f"file:{path.name}"
    repo_env = Path(__file__).resolve().parent.parent / ".env"
    if repo_env.is_file():
        for line in repo_env.read_text(errors="ignore").splitlines():
            k, _, v = line.partition("=")
            v = v.strip().strip("'\"")
            # Only value-like entries; file paths and flags are not secrets.
            if v and len(v) >= 12 and not v.startswith(("~", "/", "./")):
                values[v] = f".env:{k.strip()}"
    if include_aws:
        try:
            out = subprocess.run(
                ["aws", "configure", "export-credentials", "--format", "env-no-export"],
                capture_output=True, text=True, timeout=20,
            ).stdout
            for v in _parse_values(out):
                values[v] = "aws-session"
            acct = subprocess.run(
                ["aws", "sts", "get-caller-identity", "--query", "Account", "--output", "text"],
                capture_output=True, text=True, timeout=20,
            ).stdout.strip()
            if acct.isdigit():
                values[acct] = "aws-account"
        except Exception:
            pass
    if include_gh:
        try:
            tok = subprocess.run(["gh", "auth", "token"], capture_output=True, text=True, timeout=20).stdout.strip()
            if len(tok) >= 20:
                values[tok] = "gh-token"
        except Exception:
            pass
    return values


LOCAL_TERMS_FILE = Path(os.environ.get(
    "SENSITIVE_TERMS_FILE", str(HOME / ".config" / "chaos-commerce" / "sensitive-terms.txt")))


def load_local_terms() -> dict[str, str]:
    """Names, handles and internal identifiers kept OUTSIDE the repo (one regex per line).

    Keeping them out of the repo means the scanner itself never leaks them.
    """
    terms = {}
    if LOCAL_TERMS_FILE.is_file():
        for i, line in enumerate(LOCAL_TERMS_FILE.read_text().splitlines()):
            line = line.strip()
            if line and not line.startswith("#"):
                terms[f"local-term-{i + 1}"] = f"(?i){line}"
    return terms


def compiled(patterns: dict[str, str]) -> list[tuple[str, re.Pattern]]:
    return [(name, re.compile(rx)) for name, rx in patterns.items()]


def mask(s: str) -> str:
    s = s.replace("\n", " ")
    return (s[:4] + "…" + f"({len(s)} chars)") if len(s) > 6 else "…"
