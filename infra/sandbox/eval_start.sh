#!/bin/bash
# Reset a sandbox after its run and start the store the way its README says.
# usage: eval_start.sh "<start command>" [timeout_seconds]
# - stops every process the agent left running and removes its containers
# - gives Conductor a fresh container (same image, empty state)
# - restores the workspace exactly as collected (no node_modules or build output)
# - runs the start command in the background and waits for http://localhost:3000
set -u
CMD="$1"; WAIT="${2:-300}"
EVAL="$HOME/eval"
mkdir -p "$EVAL"

# 1. Stop what the agent left behind (keep this SSH session alive).
pkill -u ubuntu -f "node|npm|npx|python3 -m http|vite|serverless|sam " 2>/dev/null
pkill -f watch_agent.sh 2>/dev/null; pkill -f "opencode" 2>/dev/null
docker ps -aq | xargs -r docker rm -f >/dev/null 2>&1

# 2. Fresh Conductor, same image as the run.
docker run -d --name conductor --restart unless-stopped --network host conductoross/conductor:3.34.0 >/dev/null
for i in $(seq 1 120); do curl -sf http://localhost:8080/api/metadata/workflow >/dev/null && break; sleep 2; done

# 3. Pristine workspace from the collected tarball.
if [ -d "$HOME/work" ] && [ ! -d "$HOME/work.after-run" ]; then mv "$HOME/work" "$HOME/work.after-run"; fi
rm -rf "$HOME/work"
tar -xzf "$HOME/run/workspace.tgz" -C "$HOME"

# 4. Start the store exactly as documented.
cd "$HOME/work" || exit 1
date -u +%FT%TZ > "$EVAL/start_at"
nohup setsid bash -lc "$CMD" > "$EVAL/start.log" 2>&1 < /dev/null &
echo $! > "$EVAL/start.pid"

up=no
for i in $(seq 1 $(( WAIT / 5 ))); do
  if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/ | grep -qE "^(2|3)"; then up=yes; break; fi
  sleep 5
done
echo "store_up=$up seconds=$(( $(date +%s) - $(date -d "$(cat "$EVAL/start_at")" +%s) ))"
echo "workflows_registered=$(curl -s http://localhost:8080/api/metadata/workflow | python3 -c 'import json,sys; print(len(json.load(sys.stdin)))' 2>/dev/null)"
