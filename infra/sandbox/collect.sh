#!/bin/bash
# Gathers everything about a finished run into ~/run.tgz. Pushed by the chaos_collect worker.
# Raw output only: it is scrubbed on core before anything reaches runs/.
set -u
RUN="$HOME/run"
mkdir -p "$RUN/conductor" "$RUN/env"
cd "$HOME" || exit 1

# OpenCode session (one per sandbox; sessions are listed per project directory)
cd "$HOME/work" || exit 1
opencode session list --standalone --format json > "$RUN/sessions.json" 2>> "$RUN/collect.err"
SID=$(python3 - "$RUN/sessions.json" <<'EOF'
import json, sys
try:
    d = json.load(open(sys.argv[1]))
except Exception:
    sys.exit(0)
if isinstance(d, dict):
    d = d.get("data") or d.get("sessions") or []
ids = [s.get("id") for s in d if isinstance(s, dict) and s.get("id")]
print(ids[0] if ids else "")
EOF
)
if [ -n "$SID" ]; then
  opencode session export --standalone "$SID" > "$RUN/session.raw.json" 2>> "$RUN/collect.err"
  opencode session export --standalone --sanitize "$SID" > "$RUN/session.json" 2>> "$RUN/collect.err"
fi
cd "$HOME" || exit 1
cp -r "$HOME/.local/share/opencode/log" "$RUN/opencode-log" 2>/dev/null

# Conductor state the agent left behind
C=http://localhost:8080/api
curl -s "$C/metadata/workflow" > "$RUN/conductor/workflow_defs.json"
curl -s "$C/metadata/taskdefs" > "$RUN/conductor/task_defs.json"
curl -s "$C/workflow/search?size=200&sort=startTime:DESC" > "$RUN/conductor/executions_search.json"
for id in $(python3 -c 'import json,sys; d=json.load(open(sys.argv[1])); print("\n".join(r.get("workflowId","") for r in d.get("results",[])[:100]))' "$RUN/conductor/executions_search.json" 2>/dev/null); do
  curl -s "$C/workflow/$id?includeTasks=true" > "$RUN/conductor/exec_$id.json"
done

# What the agent changed on the machine
docker ps -a --format '{{json .}}' > "$RUN/env/docker-ps.jsonl" 2>&1
npm ls -g --depth=0 > "$RUN/env/npm-global.txt" 2>&1
dpkg-query -W > "$RUN/env/dpkg.after" 2>&1
pip3 list 2>/dev/null > "$RUN/env/pip.txt"
ss -ltnp > "$RUN/env/listening.txt" 2>&1

# The store as produced, without dependencies or build output
tar --exclude=node_modules --exclude=.git --exclude=dist --exclude=build --exclude=.next \
    --exclude=.cache --exclude=coverage --exclude='*.log' -czf "$RUN/workspace.tgz" -C "$HOME" work
tar -czf "$HOME/run.tgz" -C "$HOME" run
echo "collected session=${SID:-none}"
