# Chaos Commerce showdown: Gemini 4 Neon vs Fable 5.2

Two models get the same four-sentence brief for a deliberately terrible online store, build it unattended in [OpenCode](https://opencode.ai) on a machine with Conductor OSS running, and get scored against a checklist written before the first run. Each model runs three times.

Everything needed to rebuild the experiment is in this repo:
- Terraform for the machines
- cloud-init for their setup
- the Conductor workflows and workers that run the experiment
- the scoring code
- Claude Code commands that drive it all

## Results at a glance
See [`report/tables.md`](report/tables.md). ⟦filled in after scoring⟧

## The six stores

Each model built three of these from the same four-sentence brief. Gemini 4 Carbon (Stores G to I) was added after the first six were rated. They were labeled A to F, in random order, for the blind human rating. The rating is done, so each label now shows which model built that store.

| | Storefront | A return reaching its decision |
|---|---|---|
| **Store A**<br>Fable 5.2 (`fable-r2b`) | ![Store A catalog](docs/gallery/store-a-catalog.jpg) | ![Store A return decision](docs/gallery/store-a-return.jpg) |
| **Store B**<br>Gemini 4 Neon (`neon-r2`) | ![Store B catalog](docs/gallery/store-b-catalog.jpg) | ![Store B return decision](docs/gallery/store-b-return.jpg) |
| **Store C**<br>Gemini 4 Neon (`neon-r3`) | ![Store C catalog](docs/gallery/store-c-catalog.jpg) | ![Store C return decision](docs/gallery/store-c-return.jpg) |
| **Store D**<br>Fable 5.2 (`fable-r3b`) | ![Store D catalog](docs/gallery/store-d-catalog.jpg) | ![Store D return decision](docs/gallery/store-d-return.jpg) |
| **Store E**<br>Fable 5.2 (`fable-r1b`) | ![Store E catalog](docs/gallery/store-e-catalog.jpg) | ![Store E return decision](docs/gallery/store-e-return.jpg) |
| **Store F**<br>Gemini 4 Neon (`neon-r1`) | ![Store F catalog](docs/gallery/store-f-catalog.jpg) | ![Store F return decision](docs/gallery/store-f-return.jpg) |
| **Store G**<br>Gemini 4 Carbon (`carbon-r3`) | ![Store G catalog](docs/gallery/store-g-catalog.jpg) | ![Store G return decision](docs/gallery/store-g-return.jpg) |
| **Store H**<br>Gemini 4 Carbon (`carbon-r2`) | ![Store H catalog](docs/gallery/store-h-catalog.jpg) | ![Store H return decision](docs/gallery/store-h-return.jpg) |
| **Store I**<br>Gemini 4 Carbon (`carbon-r1`) | ![Store I catalog](docs/gallery/store-i-catalog.jpg) | ![Store I return decision](docs/gallery/store-i-return.jpg) |

## How it fits together

| Piece | Where it runs | Built from |
|---|---|---|
| **core**: the pipeline's Conductor OSS, Python workers, Playwright | 1 EC2 instance | [`infra/main.tf`](infra/main.tf), [`infra/cloud-init/core.yaml`](infra/cloud-init/core.yaml) |
| **sandboxes**: OpenCode + a private Conductor OSS, one per run | 1 EC2 instance per run | [`infra/main.tf`](infra/main.tf), [`infra/cloud-init/sandbox.yaml`](infra/cloud-init/sandbox.yaml) |
| Hosted store backends | AWS Lambda + function URLs | [`infra/hosting.tf`](infra/hosting.tf) |
| Hosted storefronts | GitHub Pages | [`.github/workflows/pages.yml`](.github/workflows/pages.yml) |

Terraform builds the machines from your laptop. Conductor workflows on core run the experiment and need no AWS credentials, so your laptop can sleep while runs are going.

```
chaos_runs      FORK every run at once
                └─ chaos_run: prepare sandbox → start OpenCode (90 min cap, watchdog) → wait → collect + scrub
chaos_score     FORK every run
                └─ chaos_score_one: reset sandbox → one-command start → Playwright checklist → blind judge
                → HUMAN blind_rating → report
```

| Folder | What it holds |
|---|---|
| `prereg/` | The brief, protocol, checklist, rubric and prices, frozen at tag `prereg-v1` before the first run |
| `infra/` | Terraform, cloud-init, and the scripts that run on each sandbox |
| `conductor/` | Workflow and task definitions |
| `workers/` | The Python workers (conductor-python) that run on core |
| `eval/` | The Playwright driver, per-run feature maps, the blind judge and the rating page |
| `runs/<model>-r<N>/` | Each store as the agent left it, plus its scrubbed session, metrics, Conductor state and screenshots |
| `report/` | Tables, charts and CSVs |
| `scripts/` | Secret scan, scrubber, registration, SSH config |
| `.claude/` | Claude Code commands (`/showdown-up`, `/showdown-run`, `/showdown-status`, `/showdown-down`) |

## Reproduce it

You need an AWS account (the default VPC is enough), Terraform, Python 3, and API keys for Google Gemini, Anthropic and OpenAI (judge). Rough cost: about $100-250 in model API spend for six runs, plus a few dollars of EC2.

```bash
cp infra/terraform.tfvars.example infra/terraform.tfvars   # your IP, profile, sandbox list
cp .env.example .env                                       # paths to your key files
ssh-keygen -t ed25519 -f ~/.ssh/chaos_commerce -N ""
git config core.hooksPath .githooks                        # secret scan on every commit
make up sync register       # machines, workers, workflow definitions
make pilot                  # optional: toy prompt on pilot sandboxes
make run                    # all runs at once (chaos_runs)
make status                 # or: make tunnel → http://localhost:8080
make score                  # checklist + judge, then the blind rating (make rate)
make pull                   # copy scrubbed results into runs/
make down                   # destroy everything tagged project=chaos-commerce
```

With Claude Code, the same steps are `/showdown-up`, `/showdown-run`, `/showdown-status` and `/showdown-down`.

## Secrets
- Keys, Terraform state, `.env`, tfvars and SSH keys never enter the repo; they're gitignored.
- Anything copied off a sandbox is scrubbed (`scripts/scrub.py`) before it reaches `runs/`.
- `scripts/secret_scan.py` checks exact key values, key formats, account IDs, ARNs, IP addresses, emails and home paths. It runs as a pre-commit hook and over the full history before every push (`make push`).
- Model keys reach a sandbox as a 0600 file that is read into the OpenCode process environment and deleted before the agent starts. Every artifact is scrubbed for the exact key value, because an agent could still read its own environment.

## Notes from building it
- OpenCode 2.4.1's npm package needs its postinstall run explicitly when installed by cloud-init, and its key login needs an interactive terminal, so keys go in through the environment.
- `--format json` emits a step only when it finishes, so long model calls are silent. The watchdog therefore stops a run only after the agent has ended its turn and stayed idle.
- The conductor-python 2.0 SDK reads worker type hints at runtime. Don't use `from __future__ import annotations` in worker modules, and use `TaskInProgress(callback_after_seconds=...)` for long-running tasks.
