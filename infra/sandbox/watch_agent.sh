#!/bin/bash
# Watchdog for one OpenCode run. usage: watch_agent.sh <pid> <idle_minutes> [--finalize]
#
# OpenCode's --format json stream emits a step only when it finishes, so a long
# model call (big file write, long thinking) is silent. Silence alone therefore
# does not mean "done". The run is stopped as idle only when:
#   - the last event is a step_finish that ended the agent's turn (reason not
#     "tool-calls") and nothing has happened for <idle_minutes>, or
#   - nothing at all has happened for 30 minutes (hard hang).
# The 90-minute cap is enforced separately by `timeout` in run_agent.sh.
set -u
PID="$1"; IDLE="${2:-10}"; FINALIZE="${3:-}"
HARD_IDLE=30
RUN="$HOME/run"
ENDED_BY=finished

turn_ended() {
  # The turn has ended if the last real event is a step_finish that isn't a tool call.
  # OpenCode emits `background_wait` after that when a background job (e.g. a dev
  # server) holds the run open, so skip those when looking for the last event.
  tail -n 5 "$RUN/events.jsonl" 2>/dev/null | python3 -c '
import json, sys
events = []
for line in sys.stdin:
    try:
        events.append(json.loads(line))
    except Exception:
        pass
events = [e for e in events if e.get("type") != "background_wait"]
if not events:
    print("no"); sys.exit()
e = events[-1]
reason = (e.get("part") or {}).get("reason")
print("yes" if e.get("type") == "step_finish" and reason not in ("tool-calls", "tool_calls") else "no")'
}

while kill -0 "$PID" 2>/dev/null; do
  sleep 30
  now=$(date +%s)
  last=$(stat -c %Y "$RUN/events.jsonl" 2>/dev/null || echo "$now")
  idle=$(( now - last ))
  if { [ "$idle" -ge $(( IDLE * 60 )) ] && [ "$(turn_ended)" = yes ]; } || [ "$idle" -ge $(( HARD_IDLE * 60 )) ]; then
    ENDED_BY=idle
    pkill -TERM -P "$PID" 2>/dev/null; kill -TERM "$PID" 2>/dev/null
    sleep 30
    pkill -KILL -P "$PID" 2>/dev/null; kill -KILL "$PID" 2>/dev/null
    break
  fi
done
echo "$ENDED_BY" > "$RUN/ended_by.watch"

# Used when the watchdog was swapped in after start and is not the run's parent.
if [ "$FINALIZE" = "--finalize" ]; then
  start=$(date -d "$(cat "$RUN/started_at")" +%s)
  cap_s=$(( $(cat "$RUN/cap_minutes" 2>/dev/null || echo 90) * 60 ))
  if [ "$ENDED_BY" = finished ] && [ $(( $(date +%s) - start )) -ge $(( cap_s - 60 )) ]; then ENDED_BY=cap; fi
  date -u +%FT%TZ > "$RUN/ended_at"
  echo "n/a" > "$RUN/exit_code"
  echo "$ENDED_BY" > "$RUN/ended_by"
  pkill -f "docker events" 2>/dev/null
  touch "$RUN/done"
fi
