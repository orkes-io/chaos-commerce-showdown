#!/usr/bin/env python3
"""Package each showcase store's backend for Lambda, exactly as the agent wrote it.

Reads deploy/stores.json:
  { "<store>": { "run": "neon-r2", "backend_dir": "backend", "backend_build": "npm ci --omit=dev",
                 "runtime": "nodejs22.x", "handler": "lambda.handler", ... } }
Copies runs/<run>/app/<backend_dir> to .state/build/<store>/, runs backend_build there,
and zips it to .state/build/<store>.zip (gitignored). The source is never edited; any
change the hosting rule allows is applied from deploy/patches/<store>.patch and listed.
"""
import json
import shutil
import subprocess
import sys
from pathlib import Path

repo = Path(__file__).resolve().parent.parent
stores = json.loads((repo / "deploy" / "stores.json").read_text())
build = repo / ".state" / "build"
build.mkdir(parents=True, exist_ok=True)

for store, cfg in stores.items():
    src = repo / "runs" / cfg["run"] / "app" / cfg["backend_dir"]
    dst = build / store
    if dst.exists():
        shutil.rmtree(dst)
    shutil.copytree(src, dst, ignore=shutil.ignore_patterns("node_modules", ".git"))
    patch = repo / "deploy" / "patches" / f"{store}.patch"
    if patch.exists():
        subprocess.run(["git", "apply", "--directory", str(dst.relative_to(repo)), str(patch)], cwd=repo, check=True)
        print(f"{store}: applied {patch.name}")
    if cfg.get("backend_build"):
        subprocess.run(cfg["backend_build"], shell=True, cwd=dst, check=True)
    archive = shutil.make_archive(str(build / store), "zip", dst)
    print(f"{store}: {Path(archive).name} ({Path(archive).stat().st_size // 1024} KB)")
sys.exit(0)
