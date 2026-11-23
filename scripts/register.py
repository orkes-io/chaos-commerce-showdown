#!/usr/bin/env python3
"""Register every task and workflow definition in conductor/ with a Conductor server.

usage: register.py [CONDUCTOR_SERVER_URL]   (default http://localhost:8080/api)
"""
import json
import sys
import urllib.request
from pathlib import Path

repo = Path(__file__).resolve().parent.parent
url = (sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8080/api").rstrip("/")


def call(method, path, body):
    req = urllib.request.Request(f"{url}{path}", data=json.dumps(body).encode(), method=method,
                                 headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.status


taskdefs = []
for f in sorted((repo / "conductor" / "taskdefs").glob("*.json")):
    taskdefs += json.loads(f.read_text())
print("taskdefs", call("POST", "/metadata/taskdefs", taskdefs), len(taskdefs))
workflows = [json.loads(f.read_text()) for f in sorted((repo / "conductor" / "workflows").glob("*.json"))]
print("workflows", call("PUT", "/metadata/workflow", workflows), [w["name"] for w in workflows])
