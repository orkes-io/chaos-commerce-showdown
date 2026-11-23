#!/bin/bash
# Runs one unattended OpenCode session on a sandbox. Pushed by the chaos_start worker.
# usage: run_agent.sh <provider/model#variant> <cap_minutes> <idle_minutes>
set -u
MODEL="$1"; CAP="${2:-90}"; IDLE="${3:-10}"
RUN="$HOME/run"
mkdir -p "$RUN"
cd "$HOME/work" || exit 1

# The model key arrives in ~/.chaos/key (pushed by chaos_prepare). It is exported
# only for this OpenCode process and the file is deleted before the agent starts.
case "${MODEL%%/*}" in
  google)    export GOOGLE_GENERATIVE_AI_API_KEY="$(cat "$HOME/.chaos/key")" ;;
  anthropic) export ANTHROPIC_API_KEY="$(cat "$HOME/.chaos/key")" ;;
esac
rm -rf "$HOME/.chaos"

date -u +%FT%TZ > "$RUN/started_at"
docker events --format '{{json .}}' > "$RUN/docker-events.jsonl" 2>&1 &
EV=$!

timeout --signal=TERM --kill-after=60 "${CAP}m" \
  opencode run --standalone --auto --format json --model "$MODEL" "$(cat "$HOME/prompt.txt")" \
  < /dev/null > "$RUN/events.jsonl" 2> "$RUN/opencode.stderr" &
OC=$!
echo "$OC" > "$RUN/opencode.pid"

echo "$CAP" > "$RUN/cap_minutes"
# Watchdog (see watch_agent.sh): stops the run only when the agent has ended its
# turn and stayed idle, or after 30 silent minutes. `timeout` enforces the cap.
"$HOME/watch_agent.sh" "$OC" "$IDLE"
ENDED_BY=$(cat "$RUN/ended_by.watch" 2>/dev/null || echo finished)
wait "$OC"; CODE=$?
if [ "$ENDED_BY" = finished ] && { [ "$CODE" -eq 124 ] || [ "$CODE" -eq 137 ]; }; then ENDED_BY=cap; fi

date -u +%FT%TZ > "$RUN/ended_at"
echo "$CODE" > "$RUN/exit_code"
echo "$ENDED_BY" > "$RUN/ended_by"
kill "$EV" 2>/dev/null
touch "$RUN/done"
