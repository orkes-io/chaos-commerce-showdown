#!/bin/bash
# Runs one unattended OpenCode session on a sandbox. Pushed by the chaos_start worker.
# usage: run_agent.sh <provider/model#variant> <cap_minutes> <idle_minutes>
set -u
MODEL="$1"; CAP="${2:-90}"; IDLE="${3:-10}"
RUN="$HOME/run"
mkdir -p "$RUN"
cd "$HOME/work" || exit 1

date -u +%FT%TZ > "$RUN/started_at"
docker events --format '{{json .}}' > "$RUN/docker-events.jsonl" 2>&1 &
EV=$!

timeout --signal=TERM --kill-after=60 "${CAP}m" \
  opencode run --standalone --auto --format json --model "$MODEL" "$(cat "$HOME/prompt.txt")" \
  < /dev/null > "$RUN/events.jsonl" 2> "$RUN/opencode.stderr" &
OC=$!
echo "$OC" > "$RUN/opencode.pid"

# Idle watchdog: no new events for IDLE minutes means the agent is done but a
# background job (e.g. a dev server) is holding `opencode run` open.
ENDED_BY=finished
while kill -0 "$OC" 2>/dev/null; do
  sleep 30
  last=$(stat -c %Y "$RUN/events.jsonl" 2>/dev/null || echo 0)
  if [ $(( $(date +%s) - last )) -ge $(( IDLE * 60 )) ]; then
    ENDED_BY=idle
    pkill -TERM -P "$OC" 2>/dev/null; kill -TERM "$OC" 2>/dev/null
    sleep 30; kill -KILL "$OC" 2>/dev/null
    break
  fi
done
wait "$OC"; CODE=$?
if [ "$ENDED_BY" = finished ] && { [ "$CODE" -eq 124 ] || [ "$CODE" -eq 137 ]; }; then ENDED_BY=cap; fi

date -u +%FT%TZ > "$RUN/ended_at"
echo "$CODE" > "$RUN/exit_code"
echo "$ENDED_BY" > "$RUN/ended_by"
kill "$EV" 2>/dev/null
touch "$RUN/done"
