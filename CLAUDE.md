# Notes for Claude Code in this repo

This repo runs the Chaos Commerce showdown: Gemini 4 Neon, Fable 5.2 and Gemini 4 Carbon each build the same joke store from one prompt, unattended in OpenCode, and the results are scored. Read `README.md` first.

## Secrets: the one rule that matters
- Nothing sensitive is ever committed. That covers keys, tokens, AWS account IDs, ARNs, IP addresses, instance or resource IDs, function URLs, email addresses, home-directory paths, and people's names.
- Keys live outside the repo. Read paths from `.env` (copy `.env.example`), never print a key, and never write one into a tracked file, a Terraform variable, user data or a workflow input.
- Account-specific values go in `infra/terraform.tfvars` (gitignored).
- Everything copied off a sandbox goes through `scripts/scrub.py` first. Run `python3 scripts/secret_scan.py --tree` before committing. The pre-commit hook (`.githooks/pre-commit`, enabled with `git config core.hooksPath .githooks`) blocks staged secrets. `make push` runs the full-history scan first.
- If the scanner flags something that is fine (a joke price that looks like an account ID), add it to `scripts/scan_allowlist.txt` with a reason. Never weaken the patterns.

## Pre-registration
- `prereg/` was frozen at git tag `prereg-v1` before the first real run. Don't edit it. If something must change, add an entry to "Changes after the tag" in `prereg/protocol.md` with the reason.

## Driving the pipeline
- Terraform builds machines from your laptop (`make up`, `make down`). Conductor workflows on core run the experiment (`make run`, `make status`, `make tunnel` for the UI).
- Use the slash commands in `.claude/commands/` (`/showdown-up`, `/showdown-run`, `/showdown-status`, `/showdown-down`). They wrap the Makefile.
- The Conductor workflow definitions are in `conductor/`, and the workers that execute them are in `workers/`. After changing either, run `make sync register`.

## Where numbers live
- Per-run results: `runs/<run>/metrics.json`, `runs/<run>/session.json`, `runs/<run>/conductor/`.
- Aggregates: `report/`. Quote numbers from there, not from memory.
