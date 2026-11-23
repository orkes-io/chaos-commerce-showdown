# Run protocol (frozen at tag `prereg-v1`)

Everything in this folder was committed before the first real run. Changes after the tag are listed at the bottom with a reason.

## Contestants
| Label | OpenCode model | Thinking level |
|---|---|---|
| neon | `google/gemini-4-neon#high` | `high` (Google's default) |
| fable | `anthropic/claude-fable-5-2#high` | `high` (Anthropic's default) |

Both get the same output limit (64,000 tokens per step), the same OpenCode version and config (`infra/cloud-init/opencode.json`) and the same machine image (`infra/cloud-init/sandbox.yaml`).

## Environment
- One fresh EC2 sandbox per run (Ubuntu 24.04, t3.large: 2 vCPU, 8 GB RAM, 30 GB disk) with Node 22, Python 3, git and Docker.
- Conductor OSS 3.34.0 runs on the sandbox at `http://localhost:8080` before the agent starts.
- The official Conductor agent skill (conductor-skills 1.8.0) is installed globally for OpenCode. `CONDUCTOR_SERVER_URL` points at the local server.
- The workspace is an empty folder. No AGENTS.md, CLAUDE.md or other instructions exist on the machine.
- The model API key reaches the sandbox as a 0600 file that `run_agent.sh` reads into the OpenCode process environment and deletes before the agent starts. (OpenCode 2.4.1's key login needs an interactive terminal.) An agent could still read its own process environment, so every artifact is scrubbed for the exact key value before it leaves core.

## Runs
- 3 runs per model, all 6 started at the same time, one prompt each (`prompt.txt`), no follow-up messages.
- Command: `opencode run --standalone --auto --format json --model <model> "<prompt>" < /dev/null`.
- **Cap:** 90 minutes of wall-clock time. Whatever exists at the cap is scored.
- **Idle watchdog:** if the event stream produces nothing for 10 minutes, the run is stopped (SIGTERM). This ends runs that finished their work but left a background process (such as a dev server) holding `opencode run` open.
- **Duration** is measured from the session's first message to its last completed step, reported with and without provider retry waits. Every 429 and 5xx is logged.
- **Rerun rule:** a run killed by a provider-side failure (5xx/429 retries exhausted, provider outage, auth error on our side) gets one rerun on a new sandbox. The voided run's logs are kept and published.

## Evaluation
- Each run is evaluated on its own sandbox after a reset. The reset stops every process the agent started, replaces the Conductor container with a fresh one, and copies the workspace as produced (without `node_modules` or build output) into a new folder.
- **One-command start:** we run the single command the README gives for starting the store. If that fails, the **assisted start** applies. We replay the installs the agent ran globally during its run (from the transcript), then follow the README's remaining steps. The run fails the one-command check but its features are still scored. Anything installed globally that the README doesn't mention is reported.
- The functional checklist (`checklist.md`) runs in Playwright against each store at `http://localhost:3000`, using a short per-run map of where each feature lives (`eval/maps/<run>.json`).
- Subjective scores come from a blind judge (`rubric.md`) and a separate blind human rating.

## Scoring outputs
- Every run is reported individually, with per-model medians and ranges. With n=3 there are no averages or significance tests.
- **Showcase pick:** for each model, the run with the median functional score. Ties go to the higher judge average.
- **Cost** uses `pricing.json`: per request, at list price, with cache reads and writes at their own rates and any long-context tier applied. Cross-checked against OpenCode's own figure.

## Hosting rule
- The two showcase runs are hosted (frontend on GitHub Pages, backend on AWS Lambda, Conductor OSS on a shared EC2 host, one Conductor per store).
- Only configuration changes are allowed: URLs, ports, base paths, environment variables. Any other change goes in `deploy/patches/` and is listed in the post.

## Changes after the tag
- **Idle watchdog refined about 90 seconds into the runs (runs started 17:42:58 UTC, swap at 17:44:24 UTC), before any run had been stopped.** The pilot showed that `--format json` emits a step only when it finishes, so a long model call is silent for minutes. A silence-only rule would have stopped working agents. The watchdog now stops a run as idle only after the agent has ended its turn (last event is a `step_finish` that isn't a tool call) and 10 minutes have passed, or after 30 minutes of total silence. It was swapped in on all six sandboxes without restarting the agents (`infra/sandbox/watch_agent.sh --finalize`). The 90-minute cap is unchanged. These six runs record their exit code as `n/a`, because the swapped-in watchdog isn't the agent's parent process.
- **Price classifier wording (report/build.py, written 17:46 UTC, before any store existed).** The checklist's "absurd" prices (F3) are read as negative, below $0.01, more than two decimal places, $1,000,000 or more, or a non-standard currency. Prices that are only absurd relative to the product (a $499.99 ice cube) don't count. Manual judgments for F4, F11 and F12 live in `eval/manual/<run>.json` with evidence, so the maps only record where features live.
- **Fable runs voided by a provider failure.** All three Fable runs stopped at 18:03 UTC, about 20 minutes in, with "Your credit balance is too low to access the Anthropic API." Under the rerun rule each gets one rerun on a fresh sandbox (`fable-r1b`, `fable-r2b`, `fable-r3b`), and the voided runs stay in `runs/` with their metrics marked `void`.
- **Price extraction.** Some stores render a crossed-out "was" price inside the same element as the current price. The classifier strips any "was $X" text and reads the current price. This changes which number is read, not what counts as absurd.
- **Third contestant: Gemini 4 Carbon (added 2026-11-23, about 20:00 UTC, before any Carbon run).** The original ask compared Neon with Fable 5.2. Our DevRel lead pointed out that Neon is Google's top tier, so a like-for-like comparison with Fable 5.2 is Gemini 4 Carbon. Carbon gets the same prompt, environment, cap, watchdog, checklist and judge, with three runs. Its model string is `google/gemini-4-carbon#medium`, because medium is Google's default thinking level for Carbon, and the rule is each vendor's default. Its output limit is the same 64,000 tokens. Prices are Carbon's introductory rates in force on the run date ($2 input / $10 output per 1M tokens), and `pricing.json` notes the December rise. The blind human rating of the first six stores was already done when Carbon was added, so Carbon's stores get a separate human rating that is reported separately.
- **Carbon sandbox setup retry.** On `carbon-r3`, cloud-init's Docker Hub pull of the Conductor image failed with a transient download error. The identical `docker run` was retried by hand before the run started. The cloud-init files now retry the pull.
