#!/usr/bin/env python3
"""Start the Pages build with each store's function URL (read from Terraform outputs, never committed)."""
import json
import subprocess

urls = json.loads(subprocess.run(["terraform", "-chdir=infra", "output", "-json", "function_urls"],
                                 capture_output=True, text=True, check=True).stdout)
args = ["gh", "workflow", "run", "pages.yml", "-R", "orkes-io/chaos-commerce-showdown"]
for store, url in sorted(urls.items()):
    args += ["-f", f"{store}_api={url}"]
subprocess.run(args, check=True)
print("pages build started for:", ", ".join(sorted(urls)))
