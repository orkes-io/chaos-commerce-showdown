---
description: Show the state of the showdown workflows and runs
---
Run `make status`. For any `chaos_run` that is RUNNING, say which task it is on. For any that FAILED, fetch it with `ssh -F .state/ssh_config chaos-core 'curl -s localhost:8080/api/workflow/<id>?includeTasks=true'` and summarize the failing task's `reasonForIncompletion`. Never print IP addresses, keys or account IDs.
