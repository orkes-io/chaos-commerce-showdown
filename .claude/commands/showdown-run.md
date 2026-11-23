---
description: Start every agent run (or the pilot) as a chaos_runs workflow
argument-hint: "[pilot]"
---
Start the runs. If the argument is `pilot`, run `make pilot` (10-minute cap). Otherwise confirm with the user that `prereg-v1` is tagged (`git tag -l prereg-v1`), then run `make run`.

Report the workflow ID that comes back and how to watch it (`make status`, or `make tunnel` for the Conductor UI at http://localhost:8080).
